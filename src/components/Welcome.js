import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'react-native-linear-gradient';
import { colors, spacing, radius } from '../theme';

const WelcomeScreen = ({ onSkip, navigation }) => {
  const nav = useNavigation();
  const go = onSkip ? onSkip : () => (navigation || nav).navigate('home');

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <View style={styles.content}>
          <View style={styles.logoCard}>
            <Image
              source={require('../assets/Sangam-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brand}>SANGAM WHOLESALE</Text>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Deliver orders quickly and track your day, all in one place.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={go} activeOpacity={0.9}>
            <Text style={styles.ctaText}>Get Started</Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: { alignItems: 'center' },
  logoCard: {
    width: 160,
    height: 160,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: { width: 124, height: 124 },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textInverse,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  footer: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xxl + spacing.lg,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textInverse,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
});

export default WelcomeScreen;
