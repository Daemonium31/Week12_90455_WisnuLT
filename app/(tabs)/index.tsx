import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
// Make sure you import your initialized Supabase client from Week 11
import { supabase } from '../utils/supabase';
// Optional: Import location if you are fetching it dynamically
// import * as Location from 'expo-location';

// 1. Set Notification Handler Behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 2. Helper to send Push Notification
async function sendPushNotification(expoPushToken: string, status: string, lat: number, long: number) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: `Supabase Insert: ${status}`,
    body: `Data saved successfully. Location: Lat ${lat}, Long ${long}`,
    data: { status: status, latitude: lat, longitude: long },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

// 3. Error Handling for Registration
function handleRegistrationError(errorMessage: string) {
  alert(errorMessage);
  throw new Error(errorMessage);
}

// 4. Token Registration Function
async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    handleRegistrationError('Permission not granted to get push token for push notification!');
    return;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    handleRegistrationError('Project ID not found');
  }

  try {
    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    console.log(pushTokenString);
    return pushTokenString;
  } catch (e: unknown) {
    handleRegistrationError(String(e));
  }
}

// 5. Main App Component
export default function App() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);

  // Setup Listeners and get Token on mount
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => setExpoPushToken(token ?? ''))
      .catch((error: any) => setExpoPushToken(`${error}`));

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // 6. Assignment Task: Insert to Supabase & Notify
  const handleInsertData = async () => {
    // Note: Replace with actual location fetching logic if required
    const currentLat = -6.2562;
    const currentLong = 106.6183; 

    try {
      const { error } = await supabase
        .from('photo') // Replace with your Week 11 table name
        .insert([{ latitude: currentLat, longitude: currentLong, created_at: new Date() }]);

      if (error) {
        console.error(error);
        await sendPushNotification(expoPushToken, "Failed", currentLat, currentLong);
      } else {
        await sendPushNotification(expoPushToken, "Success", currentLat, currentLong);
      }
    } catch (err) {
      console.error(err);
      await sendPushNotification(expoPushToken, "Error Occurred", currentLat, currentLong);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Week 12 Assignment</Text>
      <Text>Your Expo push token: {expoPushToken}</Text>

      <View style={styles.notificationBox}>
        <Text style={styles.bold}>Latest Notification Info:</Text>
        <Text>Title: {notification && notification.request.content.title}</Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>

      <Button
        title="Insert Data & Send Notification"
        onPress={handleInsertData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  notificationBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: '100%',
  },
  bold: {
    fontWeight: 'bold',
    marginBottom: 10,
  }
});