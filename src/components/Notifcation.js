import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import moment from 'moment';
import axios from 'axios';
import AppHeader from './ui/AppHeader';
import { DELIVERY_API } from '../config';
import { colors, spacing, radius, shadow } from '../theme';

const DISMISSED_KEY = 'dismissed_notifications';

function LeaveNotifications({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('token');
      if (t) setToken(JSON.parse(t));
      const d = await AsyncStorage.getItem(DISMISSED_KEY);
      if (d) setDismissed(JSON.parse(d));
    })();
  }, []);

  const dismiss = async id => {
    const next = [...new Set([...dismissed, id])];
    setDismissed(next);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  // Refresh on focus and poll every 10s so new incoming orders show up.
  useFocusEffect(
    React.useCallback(() => {
      if (!token) return;
      fetchNotifications();
      const id = setInterval(fetchNotifications, 10000);
      return () => clearInterval(id);
    }, [token]),
  );

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${DELIVERY_API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(
        Array.isArray(response.data.notifications)
          ? response.data.notifications
          : [],
      );
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchNotifications().then(() => setRefreshing(false));
  }, [token]);

  const typeMeta = type => {
    switch ((type || '').toLowerCase()) {
      case 'delivered':
        return { color: colors.success, icon: 'check-circle' };
      case 'undelivered':
        return { color: colors.danger, icon: 'cancel' };
      case 'out_for_delivery':
        return { color: '#7C3AED', icon: 'local-shipping' };
      case 'accepted':
        return { color: '#3E7BFA', icon: 'assignment-turned-in' };
      case 'available':
        return { color: colors.warning, icon: 'inbox' };
      default:
        return { color: colors.textMuted, icon: 'notifications' };
    }
  };

  const handlePress = item => {
    if (item.type === 'available') {
      // Go to the Orders list so the partner can accept a new order.
      navigation.navigate('OrderList', { orderType: 'Orders' });
    } else if (item._id && item._id !== 'available') {
      // Open that specific order's details.
      navigation.navigate('details', { orderId: item._id });
    }
  };

  const renderNotification = ({ item }) => {
    const { color, icon } = typeMeta(item.type);
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardBody}
          activeOpacity={0.7}
          onPress={() => handlePress(item)}>
          <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
            <Icon name={icon} size={24} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.details}>{item.message}</Text>
            {!!item.createdAt && (
              <Text style={styles.time}>{moment(item.createdAt).fromNow()}</Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => dismiss(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  const visible = notifications.filter(n => !dismissed.includes(n._id));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Notifications" onBack={() => navigation.goBack()} />

      {visible.length > 0 ? (
        <FlatList
          data={visible}
          renderItem={renderNotification}
          keyExtractor={(item, index) => item._id || index.toString()}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.empty}>
          <Icon name="notifications-none" size={56} color={colors.border} />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow.soft,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  details: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: colors.textMuted, marginTop: spacing.md },
});

export default LeaveNotifications;
