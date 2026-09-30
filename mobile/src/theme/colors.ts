import { Platform } from 'react-native';
import { Color } from 'expo-router';

const accent = '#FF634E';

export const colors = {
  accent,
  primary: accent,
  primaryHover: '#E8533F',
  primaryDark: '#D9381E',
  primaryLight: '#FFF0ED',
  primaryGlow: 'rgba(255, 99, 78, 0.35)',

  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: '#000000',
  })!,
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#3c3c43',
  })!,
  tertiaryLabel: Platform.select({
    ios: Color.ios.tertiaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#8e8e93',
  })!,
  systemBackground: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: '#ffffff',
  })!,
  secondarySystemBackground: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#f2f2f7',
  })!,
  groupedBackground: Platform.select({
    ios: Color.ios.systemGroupedBackground,
    android: Color.android.dynamic.surface,
    default: '#f2f2f7',
  })!,
  secondaryGroupedBackground: Platform.select({
    ios: Color.ios.secondarySystemGroupedBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#ffffff',
  })!,
  separator: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: '#c6c6c8',
  })!,
  systemFill: Platform.select({
    ios: Color.ios.systemFill,
    android: Color.android.dynamic.surfaceContainerHigh,
    default: 'rgba(120,120,128,0.2)',
  })!,
  systemBlue: Platform.select({
    ios: Color.ios.systemBlue,
    android: Color.android.dynamic.primary,
    default: '#007aff',
  })!,
  systemGreen: Platform.select({
    ios: Color.ios.systemGreen,
    android: Color.android.material.primary,
    default: '#34c759',
  })!,
  systemRed: Platform.select({
    ios: Color.ios.systemRed,
    android: Color.android.material.error,
    default: '#ff3b30',
  })!,
  systemOrange: Platform.select({
    ios: Color.ios.systemOrange,
    android: Color.android.material.tertiary,
    default: '#ff9500',
  })!,
  systemPurple: Platform.select({
    ios: Color.ios.systemPurple,
    android: Color.android.material.secondary,
    default: '#af52de',
  })!,

  black: '#000000',
  background: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: '#000000',
  })!,
  backgroundSecondary: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#1c1c1e',
  })!,
  surface: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#1c1c1e',
  })!,
  surfaceLight: Platform.select({
    ios: Color.ios.tertiarySystemBackground,
    android: Color.android.dynamic.surfaceContainerHigh,
    default: '#2c2c2e',
  })!,
  surfaceCard: Platform.select({
    ios: Color.ios.secondarySystemGroupedBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#ffffff',
  })!,

  borderBlack: '#000000',
  borderDark: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: '#3a3a3c',
  })!,
  borderLight: '#E5E5E5',
  borderSubtle: '#F0F0F0',
  borderHighlight: accent,

  glassBackground: 'rgba(0, 0, 0, 0.45)',
  glassBackgroundLight: 'rgba(28, 28, 30, 0.72)',
  glassBackgroundActive: 'rgba(255, 99, 78, 0.22)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  glassBorderHighlight: accent,

  software: '#34C759',
  droneTech: '#007AFF',
  engineering: '#AF52DE',
  foundations: '#FF9500',
  mobileTech: accent,

  safe: '#34C759',
  safeGlow: 'rgba(52, 199, 89, 0.35)',
  hazardLow: '#FF9500',
  hazardMedium: '#FF9F0A',
  hazardHigh: '#FF3B30',
  hazardHighGlow: 'rgba(255, 59, 48, 0.45)',

  textPrimary: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: '#ffffff',
  })!,
  textSecondary: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#ebebf5',
  })!,
  textMuted: Platform.select({
    ios: Color.ios.tertiaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#8e8e93',
  })!,
  textDark: '#000000',
  textDarkSecondary: '#3C3C43',
  textDarkMuted: '#8E8E93',
  textInverse: '#FFFFFF',

  listening: accent,
  thinking: '#AF52DE',
  speaking: '#34C759',
  error: '#FF3B30',
  idle: '#8E8E93',
};
