import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ToastAndroid,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AppHeader from './ui/AppHeader';
import { DRIVER_API, HOST } from '../config';
import { colors, spacing, radius, shadow } from '../theme';

const docUrl = file => (file ? `${HOST}/driverDocs/${file}` : null);

const Profile = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState('');
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async t => {
    try {
      const res = await axios.get(`${DRIVER_API}/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.data.success) {
        setDriver(res.data.driver);
        // keep the local cache in sync so other screens see fresh data
        await AsyncStorage.setItem('user', JSON.stringify(res.data.driver));
      }
    } catch (e) {
      ToastAndroid.show('Could not load profile', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const t = await AsyncStorage.getItem('token');
        const parsed = t ? JSON.parse(t) : '';
        setToken(parsed);
        fetchProfile(parsed);
      })();
    }, [fetchProfile]),
  );

  const openEdit = () => {
    setName(driver?.name || '');
    setEmail(driver?.email || '');
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      ToastAndroid.show('Name is required', ToastAndroid.SHORT);
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(
        `${DRIVER_API}/me`,
        { name: name.trim(), email: email.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setDriver(res.data.driver);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.driver));
        setEditOpen(false);
        ToastAndroid.show('Profile updated', ToastAndroid.SHORT);
      }
    } catch (e) {
      ToastAndroid.show(
        e.response?.data?.message || 'Update failed',
        ToastAndroid.SHORT,
      );
    } finally {
      setSaving(false);
    }
  };

  const initials = (driver?.name || 'D P')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const docs = [
    { label: 'Aadhaar Front', file: driver?.aadharFront },
    { label: 'Aadhaar Back', file: driver?.aadharBack },
    { label: 'PAN Card', file: driver?.panImage },
    { label: 'Driving License', file: driver?.dlImage },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="My Profile" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="My Profile" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing.xxl}]}
        showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View style={styles.idCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{driver?.name || 'Delivery Partner'}</Text>
          <Text style={styles.driverId}>{driver?.driverId || '—'}</Text>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.dot,
                { backgroundColor: driver?.blockstatus ? colors.danger : colors.success },
              ]}
            />
            <Text style={styles.statusText}>
              {driver?.blockstatus ? 'Blocked' : 'Active'}
            </Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={openEdit} activeOpacity={0.85}>
            <MaterialIcons name="edit" size={16} color={colors.textInverse} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {[
            { icon: 'person', label: 'Name', value: driver?.name },
            { icon: 'phone', label: 'Phone', value: driver?.phone },
            { icon: 'email', label: 'Email', value: driver?.email || '—' },
            { icon: 'badge', label: 'Driver ID', value: driver?.driverId },
          ].map(row => (
            <View key={row.label} style={styles.detailRow}>
              <MaterialIcons name={row.icon} size={20} color={colors.textMuted} />
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KYC Documents</Text>
          {docs.every(d => !d.file) ? (
            <Text style={styles.noDocs}>No documents uploaded.</Text>
          ) : (
            <View style={styles.docGrid}>
              {docs.map(d => (
                <View key={d.label} style={styles.docItem}>
                  <Text style={styles.docLabel}>{d.label}</Text>
                  {d.file ? (
                    <Image source={{ uri: docUrl(d.file) }} style={styles.docImg} />
                  ) : (
                    <View style={[styles.docImg, styles.docFallback]}>
                      <Text style={styles.docFallbackText}>Not uploaded</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalCard, {paddingBottom: insets.bottom + spacing.xl}]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Your email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  idCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textInverse, fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  driverId: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginTop: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.text },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    marginTop: spacing.lg,
  },
  editBtnText: { color: colors.textInverse, fontSize: 14, fontWeight: '700', marginLeft: 6 },

  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadow.soft,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 12, color: colors.textMuted },
  detailValue: { fontSize: 15, color: colors.text, fontWeight: '500', marginTop: 1 },

  docGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  docItem: { width: '48%', marginBottom: spacing.md },
  docLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  docImg: {
    width: '100%',
    height: 90,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  docFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  docFallbackText: { fontSize: 11, color: colors.textMuted },
  noDocs: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveBtnText: { color: colors.textInverse, fontSize: 15, fontWeight: '700' },
});

export default Profile;
