import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ToastAndroid,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'react-native-linear-gradient';
import { colors, spacing, radius, shadow } from '../theme';

const MenuItem = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconWrap, danger && { backgroundColor: '#E5484D18' }]}>
      <Feather name={icon} size={20} color={danger ? colors.danger : colors.secondary} />
    </View>
    <Text style={[styles.menuItemText, danger && { color: colors.danger }]}>{label}</Text>
    <Feather name="chevron-right" size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

const MyDrawer = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState({});

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const value = await AsyncStorage.getItem('user');
      if (value !== null) setUser(JSON.parse(value));
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      ToastAndroid.show('Logout successful', ToastAndroid.SHORT);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const initials = (user.name || 'D P')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profile}
        >
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={colors.textInverse} />
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user.name || 'User Name'}</Text>
          {!!user.driverId && <Text style={styles.userMeta}>ID: {user.driverId}</Text>}
          <Text style={styles.userMeta}>{user.email || 'user@example.com'}</Text>
          <Text style={styles.userMeta}>{user.mobile || '+91 —'}</Text>
        </LinearGradient>

        <View style={styles.menu}>
          <MenuItem icon="home" label="Home" onPress={() => navigation.navigate('home')} />
          <MenuItem icon="shopping-bag" label="Orders" onPress={() => navigation.navigate('OrderList', { orderType: 'Orders' })} />
          <MenuItem icon="user" label="My Profile" onPress={() => navigation.navigate('Profile')} />
          <MenuItem icon="bell" label="Notifications" onPress={() => navigation.navigate('LeaveNotifications')} />
          <MenuItem icon="log-out" label="Logout" onPress={logout} danger />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profile: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  back: { alignSelf: 'flex-start', padding: spacing.xs },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  avatarText: { color: colors.textInverse, fontSize: 28, fontWeight: '700' },
  userName: { color: colors.textInverse, fontSize: 22, fontWeight: '700', marginTop: spacing.md },
  userMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 3 },
  menu: {
    backgroundColor: colors.card,
    margin: spacing.lg,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    ...shadow.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#7B253315',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
});

export default MyDrawer;
