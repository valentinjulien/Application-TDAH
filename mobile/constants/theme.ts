/**
 * TDAH-Friendly Design System
 * Palette "Twilight Calm" - Low stimulation colors
 */

export const Colors = {
  // Primary - Soft Indigo (calming, not too stimulating)
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  // Accent - Soft Teal (focus, achievement)
  accent: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },
  // Warning - Soft Amber (gentle urgency)
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  // Danger - Soft Rose (not aggressive)
  danger: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },
  // Neutrals - Slate (soft, not harsh)
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  // Semantic
  background: {
    light: '#F8FAFC',
    dark: '#0F172A',
  },
  surface: {
    light: '#FFFFFF',
    dark: '#1E293B',
  },
  text: {
    light: '#0F172A',
    dark: '#F1F5F9',
    muted: '#64748B',
  },
  // Quadrant colors (Eisenhower Matrix)
  quadrant: {
    urgent: '#F43F5E',
    important: '#F59E0B',
    delegate: '#6366F1',
    eliminate: '#64748B',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const FontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// TDAH-friendly touch targets (minimum 44x44 per Apple HIG, we use 48+)
export const TouchTargets = {
  minimum: 48,
  comfortable: 56,
  large: 64,
};

export default {
  Colors,
  Spacing,
  BorderRadius,
  FontSizes,
  FontWeights,
  TouchTargets,
};