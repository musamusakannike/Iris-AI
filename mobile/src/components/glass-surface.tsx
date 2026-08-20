import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { GlassView, GlassStyle, GlassEffectStyleConfig, GlassColorScheme } from 'expo-glass-effect';
import { colors, brutalistShadow } from '../theme/colors';

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glassEffectStyle?: GlassStyle | GlassEffectStyleConfig;
  colorScheme?: GlassColorScheme;
  tintColor?: string;
  isInteractive?: boolean;
  border?: boolean;
  highlight?: boolean;
  brutalist?: boolean;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  glassEffectStyle = 'regular',
  colorScheme = 'dark',
  tintColor,
  isInteractive,
  border = true,
  highlight = false,
  brutalist = false,
}) => {
  const isIOS = Platform.OS === 'ios';

  const containerStyle = [
    styles.base,
    border && (highlight ? styles.borderHighlight : styles.border),
    brutalist && styles.brutalistShadow,
    style,
  ];

  if (isIOS) {
    return (
      <GlassView
        style={containerStyle}
        glassEffectStyle={glassEffectStyle}
        colorScheme={colorScheme}
        tintColor={tintColor}
        isInteractive={isInteractive}
      >
        {children}
      </GlassView>
    );
  }

  // Fallback for Android and Web with polished translucent dark styling
  return (
    <View style={[styles.fallbackSurface, containerStyle]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1.5,
    borderColor: colors.borderDark,
  },
  borderHighlight: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  brutalistShadow: {
    ...brutalistShadow.md,
  },
  fallbackSurface: {
    backgroundColor: colors.surface,
  },
});

