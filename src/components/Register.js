import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { DRIVER_API } from '../config';
import { colors, spacing, radius, shadow } from '../theme';

function Register({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [aadharFront, setAadharFront] = useState('');
  const [aadharBack, setAadharBack] = useState('');
  const [panImage, setPanImage] = useState('');
  const [dlImage, setDLImage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegistration = async () => {
    const formData = new FormData();
    formData.append('name', username);
    formData.append('phone', mobile);
    formData.append('email', email);

    const appendImg = (key, img) => {
      if (img && img.uri) {
        formData.append(key, {
          name: img.fileName || `${key}.jpg`,
          type: img.type || 'image/jpeg',
          uri: img.uri,
        });
      }
    };
    appendImg('aadharFront', aadharFront);
    appendImg('aadharBack', aadharBack);
    appendImg('panImage', panImage);
    appendImg('dlImage', dlImage);

    const res = await axios({
      url: '/register',
      method: 'post',
      baseURL: DRIVER_API,
      headers: { 'Content-Type': 'multipart/form-data' },
      data: formData,
    });
    if (res.status === 200 && res.data.success) {
      ToastAndroid.show('Registered! Please login with your number.', ToastAndroid.SHORT);
      navigation.navigate('Login');
    } else {
      ToastAndroid.show('Registration failed. Please try again.', ToastAndroid.SHORT);
    }
  };

  const validateAndSubmit = async () => {
    try {
      if (!username?.trim()) throw new Error('Name is required');
      if (!mobile?.trim()) throw new Error('Mobile number is required');
      if (!email?.trim()) throw new Error('Email is required');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address');
      if (!/^\d{10}$/.test(mobile)) throw new Error('Please enter a valid 10-digit mobile number');
      if (!aadharFront) throw new Error('Aadhaar front photo is required');
      if (!aadharBack) throw new Error('Aadhaar back photo is required');
      if (!panImage) throw new Error('PAN card photo is required');
      if (!dlImage) throw new Error('Driving license photo is required');

      setLoading(true);
      try {
        await handleRegistration();
      } catch (error) {
        ToastAndroid.show(
          error.response?.data?.message || error.message || 'Registration failed',
          ToastAndroid.SHORT,
        );
      } finally {
        setLoading(false);
      }
    } catch (error) {
      ToastAndroid.show(`${error.message}`, ToastAndroid.SHORT);
    }
  };

  const pickImage = async setter => {
    try {
      const response = await launchImageLibrary({ mediaType: 'photo' });
      if (!response.didCancel && !response.error && response.assets?.length) {
        setter(response.assets[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const docs = [
    { label: 'Aadhaar Front', value: aadharFront, setter: setAadharFront },
    { label: 'Aadhaar Back', value: aadharBack, setter: setAadharBack },
    { label: 'PAN Card', value: panImage, setter: setPanImage },
    { label: 'Driving License', value: dlImage, setter: setDLImage },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Image style={styles.logo} source={require('../assets/Sangam-logo.png')} resizeMode="contain" />
        <View style={styles.card}>
          <Text style={styles.title}>Driver Registration</Text>

          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Enter your name"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={styles.label}>Email ID</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Enter your email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="phone" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="10-digit number"
              style={styles.input}
              value={mobile}
              onChangeText={t => setMobile(t.replace(/[^0-9]/g, ''))}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg, fontSize: 15, color: colors.text }]}>
            Upload Documents
          </Text>
          {docs.map(doc => {
            const done = !!doc.value;
            return (
              <TouchableOpacity
                key={doc.label}
                style={[styles.uploadBtn, done && styles.uploadBtnDone]}
                onPress={() => pickImage(doc.setter)}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={done ? 'check-circle' : 'cloud-upload'}
                  size={20}
                  color={done ? colors.success : colors.textMuted}
                />
                <Text style={[styles.uploadText, done && { color: colors.success }]}>
                  {done ? doc.label : `Upload ${doc.label}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.primaryBtn} onPress={validateAndSubmit} disabled={loading} activeOpacity={0.9}>
            {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryBtnText}>Register</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}> Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  logo: { width: 200, height: 100, alignSelf: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.card,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: { marginLeft: spacing.md },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 15, color: colors.text },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  uploadBtnDone: { borderStyle: 'solid', borderColor: colors.success, backgroundColor: '#2E9E5B10' },
  uploadText: { marginLeft: spacing.sm, fontSize: 14, color: colors.text, fontWeight: '500' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadow.soft,
  },
  primaryBtnText: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xl },
  footerText: { fontSize: 14, color: colors.textMuted },
  loginLink: { fontSize: 14, color: colors.primaryDark, fontWeight: '700' },
});

export default Register;
