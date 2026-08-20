import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { GlassSurface } from './glass-surface';
import { colors } from '../theme/colors';
import { hapticService } from '../services/haptics';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'hazard' | 'outline';
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'large',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}) => {
  const handlePress = () => {
    if (disabled) return;
    hapticService.tap();
    onPress();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          surface: styles.primarySurface,
          text: styles.primaryText,
          highlight: true,
        };
      case 'hazard':
        return {
          surface: styles.hazardSurface,
          text: styles.hazardText,
          highlight: true,
        };
      case 'secondary':
        return {
          surface: styles.secondarySurface,
          text: styles.secondaryText,
          highlight: false,
        };
      case 'outline':
      default:
        return {
          surface: styles.outlineSurface,
          text: styles.outlineText,
          highlight: false,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          minHeight: 44,
          paddingVertical: 8,
          paddingHorizontal: 16,
          fontSize: 14,
        };
      case 'medium':
        return {
          minHeight: 52,
          paddingVertical: 12,
          paddingHorizontal: 20,
          fontSize: 16,
        };
      case 'large':
      default:
        return {
          minHeight: 64, // Oversized for easy access by visually impaired users
          paddingVertical: 16,
          paddingHorizontal: 24,
          fontSize: 18,
        };
    }
  };

  const vStyle = getVariantStyles();
  const sStyle = getSizeStyles();

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.touchable, { minHeight: sStyle.minHeight }, style]}
    >
      <GlassSurface
        style={[
          styles.surface,
          vStyle.surface,
          { paddingVertical: sStyle.paddingVertical, paddingHorizontal: sStyle.paddingHorizontal },
          disabled && styles.disabledSurface,
        ]}
        glassEffectStyle="regular"
        highlight={vStyle.highlight}
      >
        {icon}
        <Text
          style={[
            styles.text,
            vStyle.text,
            { fontSize: sStyle.fontSize },
            disabled && styles.disabledText,
            textStyle,
          ]}
        >
          {label}
        </Text>
      </GlassSurface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 24,
    justifyContent: 'center',
  },
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    gap: 12,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primarySurface: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  hazardSurface: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: colors.hazardHigh,
    borderWidth: 1.5,
  },
  hazardText: {
    color: '#FFFFFF',
  },
  secondarySurface: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderColor: colors.glassBorder,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  outlineSurface: {
    backgroundColor: 'transparent',
    borderColor: colors.glassBorderHighlight,
  },
  outlineText: {
    color: colors.primary,
  },
  disabledSurface: {
    opacity: 0.5,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  disabledText: {
    color: colors.textMuted,
  },
});
