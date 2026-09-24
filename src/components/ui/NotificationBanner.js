/**
 * Persistent in-app banner shown when the user has denied or blocked
 * notification permission. Sits at the top of the Home screen and provides
 * a one-tap "Enable" button that opens the OS app settings.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  requestNotificationPermission,
  openNotificationSettings,
} from '../../services/push';
import { colors, spacing, radius } from '../../theme';

const NotificationBanner = () => {
  const [status, setStatus] = useState(null); // null = loading / unchecked

  const check = useCallback(() => {
    AsyncStorage.getItem('notifPermission').then(stored => {
      setStatus(stored);
    });
  }, []);

  // Re-check every time the screen comes into focus (user may have just
  // come back from Settings after enabling notifications).
  useFocusEffect(check);

  const handleEnable = async () => {
    if (status === 'blocked') {
      // Can't re-prompt after "never ask again" — send to Settings.
      openNotificationSettings();
    } else {
      // 'denied' — ask again.
      const newStatus = await requestNotificationPermission();
      await AsyncStorage.setItem('notifPermission', newStatus);
      setStatus(newStatus);
    }
  };

  // Show the banner only when notifications are blocked or denied.
  if (!status || status === 'granted') return null;

  return (
    <View style={styles.banner}>
      <MaterialIcons
        name="notifications-off"
        size={20}
        color={styles.icon.color}
        style={{ marginRight: spacing.sm }}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Notifications are off</Text>
        <Text style={styles.body}>
          {status === 'blocked'
            ? 'Enable them in Settings to receive new order alerts.'
            : 'Tap Enable to get new order alerts.'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.btn}
        onPress={handleEnable}
        activeOpacity={0.8}>
        <Text style={styles.btnText}>
          {status === 'blocked' ? 'Settings' : 'Enable'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  icon: { color: '#B45309' },
  title: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  body: { fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 16 },
  btn: {
    backgroundColor: '#B45309',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginLeft: spacing.sm,
  },
  btnText: { color: colors.textInverse, fontSize: 12, fontWeight: '700' },
});

export default NotificationBanner;
