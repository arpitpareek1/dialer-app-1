import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, PermissionsAndroid, Platform, Button, Linking, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CallLogs from 'react-native-call-log';
import RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';

const { ContactsModule } = NativeModules;

const HistoryScreen = () => {
  const [callLogs, setCallLogs] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Fetch contacts on mount
  useEffect(() => {
    ContactsModule.checkPermissionAndFetchContacts(
      (contactsList) => {
        setContacts(contactsList);
        setLoadingContacts(false);
      },
      (error) => {
        setContacts([]);
        setLoadingContacts(false);
      }
    );
  }, []);

  const fetchSystemLogs = async () => {
    if (Platform.OS !== 'android') return;
    setLoadingLogs(true);
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title: 'Call Log Permission',
          message: 'This app needs access to your call logs to show call history.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        try {
          const logs = await CallLogs.loadAll();
          setCallLogs(logs);
          setPermissionDenied(false);
          setErrorMsg('');
        } catch (err) {
          setCallLogs([]);
          setPermissionDenied(true);
          setErrorMsg(
            'Error loading call logs. Are you the default dialer? ' +
            (err && typeof err === 'object' && 'message' in err ? err.message : String(err))
          );
        }
      } else {
        setCallLogs([]);
        setPermissionDenied(true);
        setErrorMsg('Permission denied by user.');
      }
    } catch (e) {
      setCallLogs([]);
      setPermissionDenied(true);
      setErrorMsg('Permission error: ' + (e && typeof e === 'object' && 'message' in e ? e.message : String(e)));
    }
    setLoadingLogs(false);
  };

  const callLogsToCsv = (logs) => {
    if (!logs || logs.length === 0) return '';
    const header = ['Number', 'Type', 'Date', 'Duration (s)', 'Name', 'Timestamp'];
    const rows = logs.map(log => [
      `"${log.phoneNumber || ''}"`,
      log.type || '',
      new Date(Number(log.timestamp)).toLocaleString(),
      log.duration || '',
      `"${log.name || ''}"`,
      log.timestamp || ''
    ].join(','));
    return [header.join(','), ...rows].join('\n');
  };

  const handleDownloadCsv = async () => {
    if (!callLogs || callLogs.length === 0) {
      Alert.alert('No call logs to export.');
      return;
    }
    setDownloading(true);
    try {
      // Android Download directory
      const path = `${RNFS.DownloadDirectoryPath}/call_logs_${Date.now()}.csv`;
      const csv = callLogsToCsv(callLogs);
      await RNFS.writeFile(path, csv, 'utf8');
      Alert.alert('Success', `Call logs exported to: ${path}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to export call logs. ' + (err && typeof err === 'object' && 'message' in err ? err.message : String(err)));
    }
    setDownloading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchSystemLogs();
    }, [])
  );

  // Helper to get contact name from number
  const getContactName = (number) => {
    if (!contacts || contacts.length === 0) return null;
    for (let contact of contacts) {
      if (contact.phoneNumbers && contact.phoneNumbers.some((phone) => phone.replace(/\D/g, '') === number.replace(/\D/g, ''))) {
        return contact.contactName;
      }
    }
    return null;
  };

  // Call when number pressed
  const handleCallNumber = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`);
  };

  const renderLogItem = ({ item }) => {
    const date = new Date(Number(item.timestamp));
    const dateStr = date.toLocaleString();
    let duration = item.duration || 0;
    let durationStr = duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : 'Missed/Not Connected';
    const contactName = getContactName(item.phoneNumber);
    return (
      <View style={styles.logItem}>
        <TouchableOpacity onPress={() => handleCallNumber(item.phoneNumber)}>
          <Text style={styles.number}>
            {contactName ? `${contactName} (${item.phoneNumber})` : item.phoneNumber} ({item.type})
          </Text>
        </TouchableOpacity>
        <Text style={styles.date}>Date: {dateStr}</Text>
        <Text style={duration > 0 ? styles.duration : styles.missed}>{durationStr}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call History</Text>
      <Button title={downloading ? 'Exporting...' : 'Download CSV'} onPress={handleDownloadCsv} disabled={downloading || callLogs.length === 0} />
      {(loadingContacts || loadingLogs) ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        permissionDenied ? (
          <>
            <Text style={styles.emptyText}>Permission denied or error.</Text>
            {errorMsg ? <Text style={styles.emptyText}>{errorMsg}</Text> : null}
            <Button
              title="Open App Settings"
              onPress={() => Linking.openSettings()}
            />
          </>
        ) : callLogs.length === 0 ? (
          <Text style={styles.emptyText}>No call logs found.</Text>
        ) : (
          <FlatList
            data={callLogs}
            renderItem={renderLogItem}
            keyExtractor={(_, idx) => idx.toString()}
            style={styles.scrollArea}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={21}
            removeClippedSubviews={true}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scrollArea: {
    flex: 1,
  },
  emptyText: {
    color: '#888',
    marginTop: 30,
    textAlign: 'center',
  },
  logItem: {
    marginBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
    paddingBottom: 5,
  },
  number: {
    fontWeight: '600',
    color: '#333',
  },
  date: {
    fontSize: 13,
    color: '#666',
  },
  duration: {
    fontSize: 13,
    color: '#0a7',
  },
  missed: {
    fontSize: 13,
    color: '#a00',
  },
});

export default HistoryScreen;
