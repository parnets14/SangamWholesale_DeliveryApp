import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './src/components/Home';
import Details from './src/components/Details';
import Login from './src/components/Login';
import Register from './src/components/Register';
import Splashscreen from './src/components/Splashscreen';
import MyDrawer from './src/components/Drawer';
import OrderList from './src/components/Orderlist';
import WelcomeScreen from './src/components/Welcome';
import LeaveNotifications from './src/components/Notifcation';
import Profile from './src/components/Profile';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { PermissionsAndroid, Platform, ToastAndroid, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef, navigate } from './src/services/navigationRef';
import {
  ensureChannel,
  requestNotificationPermission,
  listenForegroundMessages,
  listenForegroundNotifTaps,
  listenBackgroundNotifTaps,
  listenTokenRefresh,
  checkInitialNotification,
} from './src/services/push';

const Stack = createNativeStackNavigator();

/**
 * Polls every 100 ms until the NavigationContainer is ready, then runs cb.
 * Gives up after 5 s to avoid leaking if navigation never mounts.
 */
function waitForNav(cb, elapsed = 0) {
  if (navigationRef.isReady()) {
    cb();
    return;
  }
  if (elapsed >= 5000) return;
  setTimeout(() => waitForNav(cb, elapsed + 100), 100);
}

const App = () => {
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Camera permission granted');
          return true;
        } else {
          ToastAndroid.show('Camera permission denied', ToastAndroid.SHORT);
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      try {
        const status = await check(PERMISSIONS.IOS.CAMERA);
        if (status === RESULTS.GRANTED) {
          return true;
        } else if (status === RESULTS.DENIED) {
          const result = await request(PERMISSIONS.IOS.CAMERA);
          return result === RESULTS.GRANTED;
        } else {
          Alert.alert('Camera permission denied');
          return false;
        }
      } catch (error) {
        console.warn(error);
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    // Wrap async calls so useEffect never receives a Promise return value.
    const init = async () => {
      await requestCameraPermission();

      // ── Notification bootstrap ────────────────────────────────────────────

      // 1. Ensure the Android "Order Alerts" channel exists (HIGH importance).
      ensureChannel();

      // 2. Request permission and persist the result for the banner UI.
      const status = await requestNotificationPermission();
      await AsyncStorage.setItem('notifPermission', status);

      // 7. Quit/killed state: app was launched by tapping an FCM notification.
      const remoteMessage = await checkInitialNotification();
      if (remoteMessage?.data) {
        const { orderId, type } = remoteMessage.data;
        waitForNav(() => {
          navigate('OrderList', {
            orderType: 'Orders',
            ...(orderId ? { openOrderId: orderId, notifType: type } : {}),
          });
        });
      }

      // 8. Notifee background-tap stored in AsyncStorage by index.js.
      const raw = await AsyncStorage.getItem('pendingNotifNav');
      if (raw) {
        AsyncStorage.removeItem('pendingNotifNav');
        try {
          const { orderId, notifType } = JSON.parse(raw);
          if (orderId) {
            waitForNav(() => {
              navigate('OrderList', {
                orderType: 'Orders',
                openOrderId: orderId,
                notifType,
              });
            });
          }
        } catch (_) {}
      }
    };

    init();

    // 3. Foreground: display notification via Notifee when app is open.
    const unsubForeground = listenForegroundMessages();

    // 4. Foreground tap: user taps the heads-up banner while app is open.
    const unsubForegroundTap = listenForegroundNotifTaps();

    // 5. Background tap: app was open in background, user taps system tray.
    const unsubBackgroundTap = listenBackgroundNotifTaps();

    // 6. Token rotation: keep backend in sync if FCM issues a new token.
    const unsubTokenRefresh = listenTokenRefresh();

    return () => {
      unsubForeground && unsubForeground();
      unsubForegroundTap && unsubForegroundTap();
      unsubBackgroundTap && unsubBackgroundTap();
      unsubTokenRefresh && unsubTokenRefresh();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}>
          <Stack.Screen name="Splashscreen" component={Splashscreen} />
          <Stack.Screen name="home" component={Home} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="MyDrawer" component={MyDrawer} />
          <Stack.Screen name="LeaveNotifications" component={LeaveNotifications} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="welcome" component={WelcomeScreen} />
          <Stack.Screen name="OrderList" component={OrderList} />
          <Stack.Screen name="details" component={Details} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
