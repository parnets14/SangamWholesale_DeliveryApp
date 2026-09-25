import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient'; // kept for other screens
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AppHeader from './ui/AppHeader';
import { DELIVERY_API, HOST } from '../config';
import { colors, spacing, radius, shadow } from '../theme';

// Poll interval for picking up newly placed orders (ms).
const POLL_MS = 5000;

// Tabs map to what we fetch from the backend.
const TABS = [
  { key: 'available', label: 'Available' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'undelivered', label: 'Undelivered' },
];

const STATUS_META = {
  placed: { label: 'New', color: '#F59E0B' },
  accepted: { label: 'Accepted', color: '#3E7BFA' },
  out_for_delivery: { label: 'Out for delivery', color: '#7C3AED' },
  delivered: { label: 'Delivered', color: '#2E9E5B' },
  undelivered: { label: 'Undelivered', color: '#E5484D' },
};

// Product image path stored on order items may be absolute or relative.
const resolveImage = raw => {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  return `${HOST}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

// ─── Animated sliding tab bar (single row, equal-width tabs) ─────────────────
const SlidingTabBar = ({ tabs, activeKey, counts, onSelect }) => {
  const activeIndex = tabs.findIndex(t => t.key === activeKey);
  const tabCount = tabs.length;

  // indicatorPos animates from 0..1 representing the tab index fraction
  const indicatorPos = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(indicatorPos, {
      toValue: activeIndex,
      useNativeDriver: false,
      damping: 20,
      stiffness: 200,
      mass: 0.8,
    }).start();
  }, [activeIndex, indicatorPos]);

  return (
    <View style={tabStyles.wrapper}>
      <View style={tabStyles.strip}>
        {/* Sliding pill background */}
        <Animated.View
          style={[
            tabStyles.slidingPill,
            {
              width: `${100 / tabCount}%`,
              left: indicatorPos.interpolate({
                inputRange: tabs.map((_, i) => i),
                outputRange: tabs.map((_, i) => `${(100 / tabCount) * i}%`),
              }),
            },
          ]}
        />

        {tabs.map(tab => {
          const isActive = tab.key === activeKey;
          const count = counts[tab.key] ?? 0;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => onSelect(tab.key)}
              style={tabStyles.tab}>
              <Text style={[tabStyles.label, isActive && tabStyles.labelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
              {count > 0 && (
                <Text style={[tabStyles.count, isActive && tabStyles.countActive]}>
                  ({count})
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const OrderList = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'available');
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ available: 0, active: 0, delivered: 0, undelivered: 0 });
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('token');
        if (t) setToken(JSON.parse(t));
      } catch (e) {
        console.warn('token read error', e);
      }
    })();
  }, []);

  const authHeader = useCallback(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  // Fetch the list for the currently active tab + refresh the tab counts.
  const fetchOrders = useCallback(
    async ({ silent } = {}) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const [availableRes, mineRes] = await Promise.all([
          axios.get(`${DELIVERY_API}/orders/available`, authHeader()),
          axios.get(`${DELIVERY_API}/orders/mine`, authHeader()),
        ]);

        const available = availableRes.data.orders || [];
        const mine = mineRes.data.orders || [];
        const active = mine.filter(o =>
          ['accepted', 'out_for_delivery'].includes(o.deliveryStatus),
        );
        const delivered = mine.filter(o => o.deliveryStatus === 'delivered');
        const undelivered = mine.filter(o => o.deliveryStatus === 'undelivered');

        setCounts({
          available: available.length,
          active: active.length,
          delivered: delivered.length,
          undelivered: undelivered.length,
        });

        if (activeTab === 'available') setOrders(available);
        else if (activeTab === 'active') setOrders(active);
        else if (activeTab === 'delivered') setOrders(delivered);
        else setOrders(undelivered);
      } catch (error) {
        const status = error?.response?.status;
        console.warn('fetchOrders', status, error?.message);
        if (!silent) {
          if (status === 401 || status === 403) {
            // Token expired or driver no longer valid — send back to login.
            ToastAndroid.show('Session expired. Please log in again.', ToastAndroid.LONG);
            await AsyncStorage.multiRemove(['user', 'token']);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          } else {
            ToastAndroid.show(
              'Unable to reach server. Check your connection.',
              ToastAndroid.SHORT,
            );
          }
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, activeTab, authHeader, navigation],
  );

  // Refetch when the screen is focused or tab changes, and poll while focused.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const run = async () => {
        // Always read the token fresh — it may not be in state yet on first mount.
        let authToken = token;
        if (!authToken) {
          try {
            const raw = await AsyncStorage.getItem('token');
            if (raw) {
              authToken = JSON.parse(raw);
              if (!cancelled) setToken(authToken);
            }
          } catch (e) {
            console.warn('token read error', e);
          }
        }
        if (!authToken || cancelled) return;

        if (!cancelled) fetchOrders();
        pollRef.current = setInterval(() => {
          if (!cancelled) fetchOrders({ silent: true });
        }, POLL_MS);
      };

      run();

      return () => {
        cancelled = true;
        clearInterval(pollRef.current);
      };
    }, [token, fetchOrders]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders({ silent: true });
    setRefreshing(false);
  };

  const acceptOrder = async orderId => {
    setAcceptingId(orderId);
    try {
      await axios.post(`${DELIVERY_API}/orders/${orderId}/accept`, {}, authHeader());
      // Optimistically drop it from the visible list so it vanishes instantly.
      setOrders(prev => prev.filter(o => o._id !== orderId));
      ToastAndroid.show('Order accepted', ToastAndroid.SHORT);
      setActiveTab('active');
      await fetchOrders({ silent: true });
    } catch (error) {
      const msg = error.response?.data?.message || 'Could not accept order';
      ToastAndroid.show(msg, ToastAndroid.SHORT);
      // Someone else already took it (409) — remove it and refresh.
      setOrders(prev => prev.filter(o => o._id !== orderId));
      fetchOrders({ silent: true });
    } finally {
      setAcceptingId(null);
    }
  };

  const openDetails = order => {
    navigation.navigate('details', { orderId: order._id });
  };

  const renderItem = ({ item }) => {
    const meta = STATUS_META[item.deliveryStatus] || STATUS_META.placed;
    const firstItem = item.items?.[0];
    const img = resolveImage(firstItem?.image);
    const customerName =
      item.addressName || item.user?.userDetails?.fullName || 'Customer';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={activeTab === 'available'}
        onPress={() => activeTab !== 'available' && openDetails(item)}
        style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{item.orderId || item._id.slice(-6)}</Text>
          <View style={[styles.badge, { backgroundColor: meta.color }]}>
            <Text style={styles.badgeText}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {img ? (
            <Image source={{ uri: img }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <MaterialIcons name="inventory-2" size={26} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.productName} numberOfLines={1}>
              {firstItem?.name || 'Order items'}
              {item.items?.length > 1 ? ` +${item.items.length - 1} more` : ''}
            </Text>
            <Text style={styles.customer} numberOfLines={1}>
              <MaterialIcons name="person" size={13} color={colors.textMuted} />{' '}
              {customerName}
            </Text>
            <Text style={styles.address} numberOfLines={2}>
              <MaterialIcons name="place" size={13} color={colors.textMuted} />{' '}
              {item.deliveryAddress}
            </Text>
            <Text style={styles.amount}>₹{Number(item.total || 0).toLocaleString()}</Text>
          </View>
        </View>

        {activeTab === 'available' ? (
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => acceptOrder(item._id)}
            disabled={acceptingId === item._id}
            activeOpacity={0.9}>
            {acceptingId === item._id ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color={colors.textInverse} />
                <Text style={styles.acceptBtnText}>Accept Order</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.detailHint}>
            <Text style={styles.detailHintText}>Tap to open</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Orders" onBack={() => navigation.goBack()} />

      <SlidingTabBar
        tabs={TABS}
        activeKey={activeTab}
        counts={counts}
        onSelect={setActiveTab}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={[styles.listContainer, {paddingBottom: insets.bottom + spacing.xxl}]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="local-shipping" size={48} color={colors.border} />
              <Text style={styles.emptyText}>
                No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} orders
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'available'
                  ? 'New orders will appear here automatically'
                  : 'Check back later for updates'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContainer: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderId: { fontSize: 15, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  cardBody: { flexDirection: 'row' },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.background },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  productName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 3 },
  customer: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  address: { fontSize: 12, color: colors.textMuted, marginBottom: 4, lineHeight: 17 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.primary },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.md,
    ...shadow.soft,
  },
  acceptBtnText: { color: colors.textInverse, fontSize: 15, fontWeight: '700', marginLeft: 6 },
  detailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  detailHintText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', color: colors.textMuted, marginTop: spacing.md },
  emptySubtext: { fontSize: 13, color: '#999', marginTop: 4, textAlign: 'center', paddingHorizontal: spacing.xl },
});

const tabStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  strip: {
    flexDirection: 'row',
    backgroundColor: '#F0F1F3',
    borderRadius: radius.xl,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  // Animated sliding pill that sits behind the active tab label
  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    zIndex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.textInverse,
  },
  count: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  countActive: {
    color: colors.textInverse,
  },
});

export default OrderList;
