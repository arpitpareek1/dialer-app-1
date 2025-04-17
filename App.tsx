import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
// import ContactsList from './components/ContactsList';
import Icon from 'react-native-vector-icons/Ionicons'; // Import icons
import React from 'react';
import HomeScreen from './components/HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './components/LoginScreen';
import HistoryScreen from './components/HistoryScreen';

const Tab = createBottomTabNavigator();

const DialerIcon = ({color, size}: {color: string; size: number}) => (
  <Icon name="call" color={color} size={size} />
);

const HistoryIcon = ({color, size}: {color: string; size: number}) => (
  <Icon name="time" color={color} size={size} />
);

// const ContactsIcon = ({color, size}: {color: string; size: number}) => (
//   <Icon name="person" color={color} size={size} />
// );

export default function App() {
  const [loggedInUser, setLoggedInUser] = React.useState<string | null>(null);
  React.useEffect(() => {
    AsyncStorage.getItem('loggedInUser').then(setLoggedInUser);
  }, []);
  const handleLogin = (username: string) => {
    setLoggedInUser(username);
  };
  if (!loggedInUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  return (
    <NavigationContainer>
      <Tab.Navigator
        id={undefined}
        initialRouteName="Dialer"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height: 65,
          },
          tabBarIconStyle: {
            width: 50,
            height: 30,
            borderRadius: 8,
            marginBottom: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}>
        <Tab.Screen
          name="Dialer"
          component={HomeScreen}
          options={{
            tabBarIcon: DialerIcon,
            tabBarLabel: 'Dial',
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarIcon: HistoryIcon,
            tabBarLabel: 'History',
          }}
        />
        {/* <Tab.Screen
          name="Contacts"
          component={ContactsList}
          options={{
            tabBarIcon: ContactsIcon,
            tabBarLabel: 'Contacts',
          }}
        /> */}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
