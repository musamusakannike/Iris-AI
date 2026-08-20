import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { GlassView, GlassStyle, GlassEffectStyleConfig, GlassColorScheme } from 'expo-glass-effect';
import { colors } from '../theme/colors';

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glassEffectStyle?: GlassStyle | GlassEffectStyleConfig;
  colorScheme?: GlassColorScheme;
  tintColor?: string;
  isInteractive?: boolean;
  border?: boolean;
  highlight?: boolean;
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
}) => {
  const isIOS = Platform.OS === 'ios';

  const containerStyle = [
    styles.base,
    border && (highlight ? styles.borderHighlight : styles.border),
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  borderHighlight: {
    borderWidth: 1.5,
    borderColor: colors.glassBorderHighlight,
  },
  fallbackSurface: {
    backgroundColor: colors.glassBackground,
  },
});
