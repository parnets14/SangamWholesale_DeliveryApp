/**
 * @format
 *
 * RN 0.87 New Architecture + Android 14 FCM notes:
 *
 * On Android 14 with Play Services 26+, FCM uses "notification delegation"
 * which can drop data-only messages. The fix is to always send notification+data
 * from the backend (firebase.json disables delegation as a belt-and-suspenders).
 *
 * When notification+data arrives and app is killed:
 *  - Android/Play Services shows the notification automatically (from the
 *    notification field) — no need to call notifee.displayNotification.
 *  - The headless task fires anyway — we use it ONLY to handle the tap nav
 *    (storing orderId) not to re-display the notification.
 *
 * When app is foregrounded, FCM suppresses the notification field display —
 *  - push.js listenForegroundMessages handles display via Notifee.
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// ─── Headless background task ─────────────────────────────────────────────────
// Named task that RN Firebase triggers for background/killed FCM messages.
// TurboModules ARE available here — this runs after runtime is initialized.
AppRegistry.registerHeadlessTask(
  'ReactNativeFirebaseMessagingHeadlessTask',
  () => async remoteMessage => {
    const notifeeModule = require('@notifee/react-native');
    const notifee = notifeeModule.default;
    const { AndroidImportance, EventType } = notifeeModule;
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    const CHANNEL_ID = 'orders';
    const n = remoteMessage?.notification || {};
    const d = remoteMessage?.data || {};

    // Register Notifee background tap handler so tapping the system notification
    // (shown by FCM itself) stores the orderId for App.jsx to navigate on resume.
    try {
      notifee.onBackgroundEvent(async ({ type, detail }) => {
        if (type === EventType.PRESS) {
          const data = detail?.notification?.data || {};
          if (data.orderId) {
            await AsyncStorage.setItem(
              'pendingNotifNav',
              JSON.stringify({ orderId: data.orderId, notifType: data.type || '' }),
            );
          }
        }
      });
    } catch (_) {}

    // Only show via Notifee if FCM did NOT include a notification field
    // (i.e. data-only message). If notification field exists, FCM already
    // showed it — showing again would cause a duplicate.
    if (!n.title && !n.body) {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Order Alerts',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title: d.title || 'New order',
        body: d.body || 'You have a new update',
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_launcher',
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
        },
        data: d,
      });
    }
  },
);

// ─── Root component ───────────────────────────────────────────────────────────
AppRegistry.registerComponent(appName, () => App);
