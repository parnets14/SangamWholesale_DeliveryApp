import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import WelcomeScreen from './Welcome';
import { DELIVERY_API } from '../config';
import { colors, spacing, radius, shadow } from '../theme';
import NotificationBanner from './ui/NotificationBanner';

const Home = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState({});
  const [token, setToken] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    available: 0,
    active: 0,
    delivered: 0,
    undelivered: 0,
  });

  const loadStats = useCallback(async t => {
    const authToken = t;
    if (!authToken) return;
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [availRes, mineRes] = await Promise.all([
        axios.get(`${DELIVERY_API}/orders/available`, { headers }),
        axios.get(`${DELIVERY_API}/orders/mine`, { headers }),
      ]);
      const available = availRes.data.orders || [];
      const mine = mineRes.data.orders || [];
      setStats({
        available: available.length,
        active: mine.filter(o =>
          ['accepted', 'out_for_delivery'].includes(o.deliveryStatus),
        ).length,
        delivered: mine.filter(o => o.deliveryStatus === 'delivered').length,
        undelivered: mine.filter(o => o.deliveryStatus === 'undelivered').length,
      });
    } catch (e) {
      // silent — dashboard still renders with last known values
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
      ]);
      if (u) setUser(JSON.parse(u));
      const parsedToken = t ? JSON.parse(t) : '';
      setToken(parsedToken);
      loadStats(parsedToken);
    } catch (error) {
      console.error('Home bootstrap error:', error);
    }
  }, [loadStats]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [bootstrap]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats(token);
    setRefreshing(false);
  };

  if (showWelcome) {
    return <WelcomeScreen onSkip={() => setShowWelcome(false)} />;
  }

  const initials = (user.name || 'D P')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { key: 'available', label: 'Available', value: stats.available, icon: 'inbox', color: '#F59E0B' },
    { key: 'active', label: 'Active', value: stats.active, icon: 'truck', color: '#7C3AED' },
    { key: 'delivered', label: 'Delivered', value: stats.delivered, icon: 'check-circle', color: '#2E9E5B' },
    { key: 'undelivered', label: 'Undelivered', value: stats.undelivered, icon: 'times-circle', color: '#E5484D' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }>
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.profileRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MyDrawer')}
              activeOpacity={0.8}
              style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name || 'Delivery Partner'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('LeaveNotifications')}
              activeOpacity={0.8}
              style={styles.bellBtn}>
              <MaterialIcons name="notifications-none" size={24} color={colors.textInverse} />
              {stats.available > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>

          <Text style={styles.headerHint}>Here's your delivery summary</Text>
        </LinearGradient>

        {/* Stat cards — overlapping white panel */}
        <View style={styles.statsGrid}>
          {statCards.map(s => (
            <TouchableOpacity
              key={s.key}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('OrderList', {
                  orderType: 'Orders',
                  initialTab: s.key,
                })
              }
              style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${s.color}1A` }]}>
                <FontAwesome5 name={s.icon} size={16} color={s.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero call-to-action */}
        <NotificationBanner />
        <View style={styles.section}>
          {stats.available > 0 ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('OrderList', { orderType: 'Orders', initialTab: 'available' })
              }>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}>
                <View style={styles.heroIcon}>
                  <FontAwesome5 name="box-open" size={22} color={colors.textInverse} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>
                    {stats.available} new order{stats.available > 1 ? 's' : ''} waiting
                  </Text>
                  <Text style={styles.heroDesc}>Tap to view and accept</Text>
                </View>
                <MaterialIcons name="arrow-forward" size={22} color={colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.caughtUp}>
              <FontAwesome5 name="check-circle" size={20} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.caughtUpTitle}>You're all caught up</Text>
                <Text style={styles.caughtUpDesc}>
                  {stats.active > 0
                    ? `${stats.active} order${stats.active > 1 ? 's' : ''} in progress`
                    : 'No new orders right now'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.actionCard}
            onPress={() => navigation.navigate('OrderList', { orderType: 'Orders' })}>
            <View style={[styles.actionIconWrap, { backgroundColor: colors.primary }]}>
              <FontAwesome5 name="shopping-bag" size={20} color={colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Orders</Text>
              <Text style={styles.actionDesc}>Accept and deliver orders</Text>
            </View>
            {stats.available > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{stats.available} new</Text>
              </View>
            )}
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.actionCard}
            onPress={() => navigation.navigate('LeaveNotifications')}>
            <View style={[styles.actionIconWrap, { backgroundColor: '#3E7BFA' }]}>
              <FontAwesome5 name="bell" size={18} color={colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Notifications</Text>
              <Text style={styles.actionDesc}>Order updates and alerts</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.actionCard}
            onPress={() => navigation.navigate('Profile')}>
            <View style={[styles.actionIconWrap, { backgroundColor: '#0EA5A4' }]}>
              <FontAwesome5 name="user" size={18} color={colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>My Profile</Text>
              <Text style={styles.actionDesc}>View and edit your details</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // header
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: spacing.lg,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { color: colors.textInverse, fontSize: 18, fontWeight: '700' },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  userName: { color: colors.textInverse, fontSize: 20, fontWeight: '700' },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FBBF24',
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
  },

  // stat grid — overlaps the header for a dashboard look
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.xxl,
  },
  statCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  // sections
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  // action cards
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  actionDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  // hero CTA
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroTitle: { color: colors.textInverse, fontSize: 16, fontWeight: '800' },
  heroDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  caughtUp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.soft,
  },
  caughtUpTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  caughtUpDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  countPill: {
    backgroundColor: '#F59E0B',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  countPillText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
});

export default Home;
