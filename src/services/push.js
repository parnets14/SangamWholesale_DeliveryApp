/**
 * Push notification service — RN Firebase v26 modular API + Notifee.
 *
 * IMPORTANT: Do NOT call getMessaging() at module scope.
 * On RN 0.87 New Architecture, TurboModules are not ready when this file
 * is first required in a headless background task. All firebase/notifee
 * calls must happen inside functions, invoked only after the runtime is live.
 */

import { Platform, PermissionsAndroid, Linking } from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { DRIVER_API } from '../config';
import { navigate } from './navigationRef';

const CHANNEL_ID = 'orders';

// ─── Channel ─────────────────────────────────────────────────────────────────

export async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Order Alerts',
    importance: AndroidImportance.HIGH,
  });
}

// ─── Permission ──────────────────────────────────────────────────────────────

/**
 * Ask for notification permission.
 * Returns 'granted' | 'denied' | 'blocked'.
 */
export async function requestNotificationPermission() {
  try {
    // Android 13+ needs POST_NOTIFICATIONS at runtime.
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
      return 'denied';
    }
    // iOS — v26 modular requestPermission
    const authStatus = await requestPermission(getMessaging());
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;
    return enabled ? 'granted' : 'denied';
  } catch (e) {
    return 'denied';
  }
}

export function openNotificationSettings() {
  Linking.openSettings().catch(() => {});
}

// ─── FCM Token ───────────────────────────────────────────────────────────────

/**
 * Get the FCM token and register it with the backend.
 * Call after login when the driver auth token is available.
 */
export async function registerFcmToken(authToken) {
  try {
    const fcmToken = await getToken(getMessaging());
    if (!fcmToken || !authToken) return;
    await AsyncStorage.setItem('fcmToken', fcmToken);
    await axios.post(
      `${DRIVER_API}/fcm-token`,
      { fcmToken },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
  } catch (e) {
    // non-fatal — push won't be delivered to this device
  }
}

/** Keep the backend in sync when FCM rotates the token. */
export function listenTokenRefresh() {
  return onTokenRefresh(getMessaging(), async (fcmToken) => {
    try {
      const authRaw = await AsyncStorage.getItem('token');
      const authToken = authRaw ? JSON.parse(authRaw) : '';
      if (authToken) {
        await axios.post(
          `${DRIVER_API}/fcm-token`,
          { fcmToken },
          { headers: { Authorization: `Bearer ${authToken}` } },
        );
      }
    } catch (e) {}
  });
}

// ─── Display helper ──────────────────────────────────────────────────────────

async function displayMessage(remoteMessage) {
  const n = remoteMessage?.notification || {};
  const d = remoteMessage?.data || {};
  await notifee.displayNotification({
    title: n.title || d.title || 'New order',
    body: n.body || d.body || 'You have a new update',
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
    data: d,
  });
}

// ─── Tap navigation helper ────────────────────────────────────────────────────

function handleNotificationTap(data) {
  if (!data) return;
  const { orderId, type } = data;
  navigate('OrderList', {
    orderType: 'Orders',
    ...(orderId ? { openOrderId: orderId, notifType: type } : {}),
  });
}

// ─── Foreground listeners ─────────────────────────────────────────────────────

/** Show notification via Notifee when an FCM message arrives in the foreground. */
export function listenForegroundMessages() {
  return onMessage(getMessaging(), async (remoteMessage) => {
    await displayMessage(remoteMessage);
  });
}

/** Handle taps on Notifee notifications while the app is FOREGROUNDED. */
export function listenForegroundNotifTaps() {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNotificationTap(detail?.notification?.data);
    }
  });
}

/** Handle FCM notification taps while the app is BACKGROUNDED (not killed). */
export function listenBackgroundNotifTaps() {
  return onNotificationOpenedApp(getMessaging(), (remoteMessage) => {
    if (remoteMessage?.data) {
      handleNotificationTap(remoteMessage.data);
    }
  });
}

/**
 * Check if the app was launched by tapping a notification (killed/quit state).
 * Call once at startup, after the NavigationContainer is ready.
 */
export async function checkInitialNotification() {
  try {
    const remoteMessage = await getInitialNotification(getMessaging());
    return remoteMessage ?? null;
  } catch (e) {
    return null;
  }
}
