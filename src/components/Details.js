import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Linking,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from './ui/AppHeader';
import { DELIVERY_API, HOST } from '../config';
import { colors, spacing, radius, shadow } from '../theme';

const STATUS_META = {
  accepted: { label: 'Accepted', color: '#3E7BFA' },
  out_for_delivery: { label: 'Out for delivery', color: '#7C3AED' },
  delivered: { label: 'Delivered', color: '#2E9E5B' },
  undelivered: { label: 'Undelivered', color: '#E5484D' },
  placed: { label: 'New', color: '#F59E0B' },
};

const resolveImage = raw => {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  return `${HOST}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

const Details = ({ route, navigation }) => {
  const { orderId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // OTP entry
  const [otpModal, setOtpModal] = useState(false);
  const [otp, setOtp] = useState('');

  // Undelivered
  const [undelModal, setUndelModal] = useState(false);
  const [reason, setReason] = useState('');

  const authHeader = useCallback(
    t => ({ headers: { Authorization: `Bearer ${t || token}` } }),
    [token],
  );

  const fetchOrder = useCallback(
    async t => {
      try {
        const res = await axios.get(
          `${DELIVERY_API}/orders/${orderId}`,
          authHeader(t),
        );
        setOrder(res.data.order);
      } catch (error) {
        ToastAndroid.show('Unable to load order', ToastAndroid.SHORT);
      } finally {
        setLoading(false);
      }
    },
    [orderId, authHeader],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const stored = await AsyncStorage.getItem('token');
        const t = stored ? JSON.parse(stored) : '';
        if (!active) return;
        setToken(t);
        fetchOrder(t);
      })();
      return () => {
        active = false;
      };
    }, [fetchOrder]),
  );

  const startDelivery = async () => {
    setBusy(true);
    try {
      await axios.post(`${DELIVERY_API}/orders/${orderId}/start`, {}, authHeader());
      ToastAndroid.show(
        'Delivery started. Enter the OTP once you reach the customer.',
        ToastAndroid.LONG,
      );
      await fetchOrder();
      // Do NOT generate/open the OTP now — the partner requests the OTP at the
      // door via "Enter OTP", which is when the customer's OTP is generated.
    } catch (error) {
      ToastAndroid.show(
        error.response?.data?.message || 'Could not start delivery',
        ToastAndroid.SHORT,
      );
    } finally {
      setBusy(false);
    }
  };

  // Partner is at the door: request the OTP (generates it for the customer),
  // then open the entry modal.
  const requestOtp = async () => {
    setBusy(true);
    try {
      await axios.post(
        `${DELIVERY_API}/orders/${orderId}/request-otp`,
        {},
        authHeader(),
      );
      setOtp('');
      setOtpModal(true);
      ToastAndroid.show(
        'OTP sent to customer. Ask them to read it out.',
        ToastAndroid.LONG,
      );
    } catch (error) {
      ToastAndroid.show(
        error.response?.data?.message || 'Could not request OTP',
        ToastAndroid.SHORT,
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      ToastAndroid.show('Enter the 6-digit OTP', ToastAndroid.SHORT);
      return;
    }
    setBusy(true);
    try {
      await axios.post(
        `${DELIVERY_API}/orders/${orderId}/verify-otp`,
        { otp },
        authHeader(),
      );
      setOtpModal(false);
      setOtp('');
      Alert.alert('Delivered', 'Order marked delivered successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      ToastAndroid.show(
        error.response?.data?.message || 'Invalid OTP',
        ToastAndroid.SHORT,
      );
    } finally {
      setBusy(false);
    }
  };

  const markUndelivered = async () => {
    if (!reason.trim()) {
      ToastAndroid.show('Please add a reason', ToastAndroid.SHORT);
      return;
    }
    setBusy(true);
    try {
      await axios.post(
        `${DELIVERY_API}/orders/${orderId}/undelivered`,
        { remarks: reason },
        authHeader(),
      );
      setUndelModal(false);
      ToastAndroid.show('Marked undelivered', ToastAndroid.SHORT);
      navigation.goBack();
    } catch (error) {
      ToastAndroid.show(
        error.response?.data?.message || 'Could not update',
        ToastAndroid.SHORT,
      );
    } finally {
      setBusy(false);
    }
  };

  const callCustomer = () => {
    const num = order?.addressContact;
    if (num) Linking.openURL(`tel:${num}`);
    else ToastAndroid.show('No contact number', ToastAndroid.SHORT);
  };

  const openMap = () => {
    const address = order?.deliveryAddress;
    if (!address) {
      ToastAndroid.show('No address to navigate', ToastAndroid.SHORT);
      return;
    }
    // Opens Google Maps navigation to the delivery address.
    const query = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    Linking.openURL(url).catch(() =>
      ToastAndroid.show('Could not open maps', ToastAndroid.SHORT),
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Order Details" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <AppHeader title="Order Details" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.muted}>Order not found</Text>
        </View>
      </View>
    );
  }

  const meta = STATUS_META[order.deliveryStatus] || STATUS_META.placed;
  const customerName =
    order.addressName || order.user?.userDetails?.fullName || 'Customer';

  return (
    <View style={styles.container}>
      <AppHeader title="Order Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status header */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderId}>#{order.orderId || order._id.slice(-6)}</Text>
            <View style={[styles.badge, { backgroundColor: meta.color }]}>
              <Text style={styles.badgeText}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.amount}>₹{Number(order.total || 0).toLocaleString()}</Text>

          {/* Payment method */}
          {order.paymentMethod === 'cod' ? (
            <View style={styles.codBanner}>
              <MaterialIcons name="payments" size={18} color="#B45309" />
              <Text style={styles.codText}>
                Collect ₹{Number(order.total || 0).toLocaleString()} — Cash on Delivery
              </Text>
            </View>
          ) : (
            <View style={styles.paidBanner}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.paidText}>Paid online — no cash to collect</Text>
            </View>
          )}

          {/* Progress timeline */}
          {order.deliveryStatus !== 'undelivered' && (
            <View style={styles.timeline}>
              {[
                { key: 'accepted', label: 'Accepted' },
                { key: 'out_for_delivery', label: 'On the way' },
                { key: 'delivered', label: 'Delivered' },
              ].map((step, i) => {
                const order3 = ['accepted', 'out_for_delivery', 'delivered'];
                const currentIdx = order3.indexOf(order.deliveryStatus);
                const done = i <= currentIdx;
                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineRow}>
                      {i > 0 && (
                        <View
                          style={[
                            styles.timelineBar,
                            done && { backgroundColor: colors.success },
                          ]}
                        />
                      )}
                      <View
                        style={[
                          styles.timelineDot,
                          done && { backgroundColor: colors.success, borderColor: colors.success },
                        ]}>
                        {done && (
                          <MaterialIcons name="check" size={12} color={colors.textInverse} />
                        )}
                      </View>
                      {i < 2 && (
                        <View
                          style={[
                            styles.timelineBar,
                            i < currentIdx && { backgroundColor: colors.success },
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.timelineLabel,
                        done && { color: colors.text, fontWeight: '600' },
                      ]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.name}>{customerName}</Text>
          {!!order.addressContact && (
            <Text style={styles.contact}>{order.addressContact}</Text>
          )}

          {/* Address (tap to navigate) */}
          <TouchableOpacity
            style={styles.addressRow}
            activeOpacity={0.7}
            onPress={openMap}>
            <MaterialIcons name="place" size={18} color={colors.primary} />
            <Text style={styles.address}>{order.deliveryAddress}</Text>
          </TouchableOpacity>

          {!!order.orderNotes && (
            <Text style={styles.notes}>Note: {order.orderNotes}</Text>
          )}

          {/* Call + Navigate actions */}
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: colors.success }]}
              onPress={callCustomer}
              activeOpacity={0.85}>
              <MaterialIcons name="call" size={18} color={colors.textInverse} />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#3E7BFA' }]}
              onPress={openMap}
              activeOpacity={0.85}>
              <MaterialIcons name="navigation" size={18} color={colors.textInverse} />
              <Text style={styles.contactBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.itemsHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              Items ({order.items?.length || 0})
            </Text>
            <View
              style={[
                styles.payBadge,
                order.paymentMethod === 'cod'
                  ? { backgroundColor: '#FEF3C7' }
                  : { backgroundColor: '#DCFCE7' },
              ]}>
              <MaterialIcons
                name={order.paymentMethod === 'cod' ? 'payments' : 'check-circle'}
                size={13}
                color={order.paymentMethod === 'cod' ? '#B45309' : '#15803D'}
              />
              <Text
                style={[
                  styles.payBadgeText,
                  { color: order.paymentMethod === 'cod' ? '#B45309' : '#15803D' },
                ]}>
                {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid'}
              </Text>
            </View>
          </View>
          {order.items?.map((it, idx) => {
            const img = resolveImage(it.image);
            return (
              <View key={idx} style={styles.itemRow}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.itemImg} />
                ) : (
                  <View style={[styles.itemImg, styles.itemImgFallback]}>
                    <MaterialIcons name="inventory-2" size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                  <Text style={styles.itemQty}>Qty: {it.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  ₹{Number((it.price || 0) * (it.quantity || 1)).toLocaleString()}
                </Text>
              </View>
            );
          })}

          {/* Price breakdown */}
          <View style={styles.breakdown}>
            {order.subtotal != null && (
              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Subtotal</Text>
                <Text style={styles.breakValue}>
                  ₹{Number(order.subtotal).toLocaleString()}
                </Text>
              </View>
            )}
            {order.gst != null && order.gst > 0 && (
              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>GST</Text>
                <Text style={styles.breakValue}>
                  ₹{Number(order.gst).toLocaleString()}
                </Text>
              </View>
            )}
            <View style={[styles.breakRow, styles.breakTotalRow]}>
              <Text style={styles.breakTotalLabel}>Total</Text>
              <Text style={styles.breakTotalValue}>
                ₹{Number(order.total || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {order.deliveryStatus === 'delivered' && (
          <View style={styles.deliveredBox}>
            <MaterialIcons name="check-circle" size={22} color={colors.success} />
            <Text style={styles.deliveredText}>Delivered successfully</Text>
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      {order.deliveryStatus === 'accepted' && (
        <View style={[styles.footer, {paddingBottom: insets.bottom + spacing.md}]}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.outlineBtn]}
            onPress={() => setUndelModal(true)}>
            <Text style={styles.outlineBtnText}>Can't Deliver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, styles.primaryBtn]}
            onPress={startDelivery}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.primaryBtnText}>Start Delivery</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {order.deliveryStatus === 'out_for_delivery' && (
        <View style={[styles.footer, {paddingBottom: insets.bottom + spacing.md}]}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.outlineBtn]}
            onPress={() => setUndelModal(true)}>
            <Text style={styles.outlineBtnText}>Can't Deliver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, styles.primaryBtn]}
            onPress={requestOtp}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.primaryBtnText}>Request & Enter OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* OTP modal */}
      <Modal visible={otpModal} transparent animationType="slide" onRequestClose={() => setOtpModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalCard, {paddingBottom: insets.bottom + spacing.xl}]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Delivery</Text>
              <TouchableOpacity onPress={() => setOtpModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Ask the customer for the 6-digit OTP shown in their app and enter it here.
            </Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={t => setOtp(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="------"
              placeholderTextColor={colors.textMuted}
              textAlign="center"
            />
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={verifyOtp} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Complete</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Undelivered modal */}
      <Modal visible={undelModal} transparent animationType="slide" onRequestClose={() => setUndelModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalCard, {paddingBottom: insets.bottom + spacing.xl}]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Can't Deliver</Text>
              <TouchableOpacity onPress={() => setUndelModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Tell us why this order couldn't be delivered.</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (e.g. customer unavailable)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { backgroundColor: colors.danger }]}
              onPress={markUndelivered}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>Submit</Text>
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
  muted: { color: colors.textMuted, fontSize: 15 },
  content: { padding: spacing.lg, paddingBottom: 120 },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderId: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  amount: { fontSize: 24, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  codBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  codText: { fontSize: 14, fontWeight: '700', color: '#B45309', marginLeft: 8 },
  paidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  paidText: { fontSize: 13, color: colors.textMuted, marginLeft: 6 },
  timeline: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  timelineStep: { flex: 1, alignItems: 'center' },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBar: { flex: 1, height: 3, backgroundColor: colors.border },
  timelineLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  contact: { fontSize: 13, color: colors.text, marginTop: 3, fontWeight: '500' },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  address: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginLeft: 6,
    lineHeight: 18,
  },
  notes: { fontSize: 13, color: colors.textMuted, marginTop: spacing.md, fontStyle: 'italic' },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  contactBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImg: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.background, marginRight: spacing.md },
  itemImgFallback: { alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, color: colors.text, fontWeight: '500' },
  itemQty: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.text, marginLeft: spacing.sm },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  payBadgeText: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
  breakdown: { marginTop: spacing.md, paddingTop: spacing.md },
  breakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakLabel: { fontSize: 13, color: colors.textMuted },
  breakValue: { fontSize: 13, color: colors.text, fontWeight: '500' },
  breakTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: 2,
  },
  breakTotalLabel: { fontSize: 15, color: colors.text, fontWeight: '700' },
  breakTotalValue: { fontSize: 16, color: colors.primary, fontWeight: '800' },
  deliveredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E9E5B15',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  deliveredText: { color: colors.success, fontWeight: '700', marginLeft: spacing.sm, fontSize: 15 },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  footerBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: colors.primary },
  primaryBtnText: { color: colors.textInverse, fontSize: 15, fontWeight: '700' },
  outlineBtn: { borderWidth: 1.5, borderColor: colors.border },
  outlineBtnText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalHint: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg },
  otpInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: 28,
    letterSpacing: 12,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 14,
    marginBottom: spacing.lg,
  },
  reasonInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: 15,
    color: colors.text,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
});

export default Details;
