import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ToastAndroid,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { DRIVER_API } from '../config';
import { registerFcmToken } from '../services/push';
import { colors, spacing, radius, shadow } from '../theme';

function Login({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const startCountdown = () => {
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validatePhoneNumber = number => /^[0-9]{10}$/.test(number);

  const requestOtp = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      ToastAndroid.show('Please enter a valid 10-digit mobile number', ToastAndroid.SHORT);
      return;
    }
    setLoading(true);
    try {
      const res = await axios({
        url: '/send-otp',
        method: 'post',
        baseURL: DRIVER_API,
        headers: { 'content-type': 'application/json' },
        data: { phone: phoneNumber },
      });
      if (res.status === 200 && res.data.success) {
        setIsOtpSent(true);
        startCountdown();
        // No SMS gateway yet: the backend returns the OTP so we can show it.
        Alert.alert('OTP Sent', `Your OTP is ${res.data.otp}`, [{ text: 'OK' }]);
        ToastAndroid.show('OTP has been sent to your mobile number', ToastAndroid.SHORT);
      }
    } catch (error) {
      if (error.response) {
        ToastAndroid.show(
          error.response.data.message || 'Failed to send OTP',
          ToastAndroid.SHORT,
        );
      } else {
        ToastAndroid.show('Network error. Please try again.', ToastAndroid.SHORT);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      ToastAndroid.show('Please enter a valid 6-digit OTP', ToastAndroid.SHORT);
      return;
    }
    setLoading(true);
    try {
      const res = await axios({
        url: '/verify-otp',
        method: 'post',
        baseURL: DRIVER_API,
        headers: { 'content-type': 'application/json' },
        data: { phone: phoneNumber, otp },
      });
      if (res.status === 200 && res.data.success && res.data.driver) {
        await AsyncStorage.setItem('user', JSON.stringify(res.data.driver));
        await AsyncStorage.setItem('token', JSON.stringify(res.data.token));
        // Register this device for push notifications under the logged-in driver.
        registerFcmToken(res.data.token);
        ToastAndroid.show('Successfully Logged In', ToastAndroid.SHORT);
        navigation.navigate('welcome');
      } else {
        ToastAndroid.show('Something went wrong', ToastAndroid.SHORT);
      }
    } catch (error) {
      if (error.response) {
        ToastAndroid.show(
          error.response.data.message || 'Verification failed',
          ToastAndroid.SHORT,
        );
      } else {
        ToastAndroid.show('Network error. Please try again.', ToastAndroid.SHORT);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <Image style={styles.logo} source={require('../assets/Sangam-logo.png')} resizeMode="contain" />
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Login with your mobile number</Text>

              <View style={styles.card}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.inputRow}>
                  <View style={styles.ccBox}>
                    <Text style={styles.ccText}>+91</Text>
                  </View>
                  <TextInput
                    placeholder="10-digit number"
                    style={styles.input}
                    placeholderTextColor={colors.textMuted}
                    value={phoneNumber}
                    onChangeText={t => setPhoneNumber(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!isOtpSent}
                  />
                </View>

                {isOtpSent && (
                  <>
                    <Text style={[styles.label, { marginTop: spacing.lg }]}>Enter OTP</Text>
                    <View style={styles.inputRow}>
                      <MaterialIcons name="lock-outline" size={20} color={colors.textMuted} style={{ marginLeft: spacing.md }} />
                      <TextInput
                        placeholder="6-digit OTP"
                        style={styles.input}
                        placeholderTextColor={colors.textMuted}
                        value={otp}
                        onChangeText={t => setOtp(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                    <Text style={styles.otpNote}>OTP sent to +91 {phoneNumber}</Text>
                  </>
                )}

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={isOtpSent ? verifyOtp : requestOtp}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>{isOtpSent ? 'Verify & Login' : 'Get OTP'}</Text>
                  )}
                </TouchableOpacity>

                {isOtpSent &&
                  (countdown > 0 ? (
                    <Text style={styles.resendText}>Resend OTP in {countdown}s</Text>
                  ) : (
                    <TouchableOpacity onPress={requestOtp}>
                      <Text style={styles.resendActive}>Resend OTP</Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}> Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, justifyContent: 'center' },
  logo: { width: 200, height: 90, alignSelf: 'center', marginBottom: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ccBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  ccText: { fontSize: 15, fontWeight: '600', color: colors.text },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 15, color: colors.text },
  otpNote: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadow.soft,
  },
  primaryBtnText: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
  resendText: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.md },
  resendActive: { textAlign: 'center', color: colors.primaryDark, fontWeight: '700', marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { fontSize: 14, color: colors.textMuted },
  registerLink: { fontSize: 14, color: colors.primaryDark, fontWeight: '700' },
});

export default Login;
