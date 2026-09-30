import React from 'react';
import { View, ViewStyle, StyleProp, Platform } from 'react-native';
import { GlassView, GlassStyle, GlassEffectStyleConfig, GlassColorScheme } from 'expo-glass-effect';
import { colors } from '../theme/colors';

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glassEffectStyle?: GlassStyle | GlassEffectStyleConfig;
  colorScheme?: GlassColorScheme;
  tintColor?: string;
  isInteractive?: boolean;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  glassEffectStyle = 'regular',
  colorScheme = 'dark',
  tintColor,
  isInteractive,
}) => {
  const containerStyle: StyleProp<ViewStyle> = [
    {
      borderRadius: 16,
      overflow: 'hidden',
      borderCurve: 'continuous',
    },
    style,
  ];

  if (Platform.OS === 'ios') {
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

  return (
    <View
      style={[
        {
          backgroundColor: colors.glassBackgroundLight,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        containerStyle,
      ]}
    >
      {children}
    </View>
  );
};
