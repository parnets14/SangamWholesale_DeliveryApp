/**
 * App-wide design system.
 *
 * Keeping colors, spacing, radius and typography in one place gives the whole
 * app a consistent, clean look. Import from here instead of hardcoding hex
 * values in each screen.
 */

export const colors = {
  // brand — Sangam Wholesale maroon (matches the Udaan customer app)
  primary: '#7B2533',        // Sangam maroon
  primaryDark: '#6E2832',    // deeper maroon (used for the app icon background)
  secondary: '#B8863B',      // warm gold accent that complements the maroon

  // status
  success: '#2E9E5B',
  warning: '#F5A623',
  danger: '#E5484D',
  info: '#3E7BFA',

  // surfaces
  background: '#F5F6F8',
  card: '#FFFFFF',
  border: '#ECEEF1',

  // text
  text: '#1A1D1F',
  textMuted: '#6F767E',
  textInverse: '#FFFFFF',

  // misc
  overlay: 'rgba(0,0,0,0.4)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '700', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, fontWeight: '400', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  caption: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
};

export default { colors, spacing, radius, typography, shadow };
