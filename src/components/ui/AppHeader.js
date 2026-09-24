import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../theme';

/**
 * Shared gradient header used across screens for a consistent look.
 *
 * Props:
 *  - title:      main heading text
 *  - subtitle:   optional line under the title
 *  - onBack:     if provided, shows a back arrow that calls this
 *  - right:      optional element rendered on the right (e.g. an icon button)
 */
const AppHeader = ({ title, subtitle, onBack, right }) => {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, {paddingTop: insets.top + spacing.md}]}
      >
        <View style={styles.row}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
              <MaterialIcons name="arrow-back" size={22} color={colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconBtn} />
          )}

          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>

          {right ? <View style={styles.iconBtn}>{right}</View> : <View style={styles.iconBtn} />}
        </View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { color: colors.textInverse, fontSize: 18, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
});

export default AppHeader;
