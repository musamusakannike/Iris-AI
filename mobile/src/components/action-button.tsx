import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { colors, brutalistShadow } from '../theme/colors';
import { hapticService } from '../services/haptics';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'hazard' | 'outline' | 'dark';
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'large',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  fullWidth = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    hapticService.tap();
    onPress();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
        };
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
        };
      case 'hazard':
        return {
          container: styles.hazardContainer,
          text: styles.hazardText,
        };
      case 'dark':
        return {
          container: styles.darkContainer,
          text: styles.darkText,
        };
      case 'outline':
      default:
        return {
          container: styles.outlineContainer,
          text: styles.outlineText,
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
          fontSize: 13,
          shadowOffset: 2,
        };
      case 'medium':
        return {
          minHeight: 52,
          paddingVertical: 12,
          paddingHorizontal: 22,
          fontSize: 15,
          shadowOffset: 3,
        };
      case 'large':
      default:
        return {
          minHeight: 60, // Oversized for accessible high visibility
          paddingVertical: 15,
          paddingHorizontal: 26,
          fontSize: 16,
          shadowOffset: 4,
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
      activeOpacity={0.85}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.baseButton,
        vStyle.container,
        {
          minHeight: sStyle.minHeight,
          paddingVertical: sStyle.paddingVertical,
          paddingHorizontal: sStyle.paddingHorizontal,
          transform: isPressed
            ? [{ translateX: sStyle.shadowOffset }, { translateY: sStyle.shadowOffset }]
            : [{ translateX: 0 }, { translateY: 0 }],
        },
        fullWidth && { width: '100%' },
        disabled && styles.disabledButton,
        style,
      ]}
    >
      {icon && iconPosition === 'left' && (
        <View style={styles.leftIcon}>{icon}</View>
      )}
      <Text
        style={[
          styles.baseText,
          vStyle.text,
          { fontSize: sStyle.fontSize },
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {label}
      </Text>
      {icon && iconPosition === 'right' && (
        <View style={styles.rightIcon}>{icon}</View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#0A0E11',
    borderRadius: 4, // A1 Academy sharp brutalist aesthetic
    shadowColor: '#0A0E11',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  baseText: {
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  primaryContainer: {
    backgroundColor: colors.primary,
    borderColor: '#0A0E11',
  },
  primaryText: {
    color: '#0A0E11', // High contrast black text on primary coral (Academy style)
  },
  secondaryContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0A0E11',
  },
  secondaryText: {
    color: '#0A0E11',
  },
  hazardContainer: {
    backgroundColor: colors.hazardHigh,
    borderColor: '#0A0E11',
  },
  hazardText: {
    color: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: colors.black,
    borderColor: colors.primary,
  },
  darkText: {
    color: '#FFFFFF',
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
  },
  outlineText: {
    color: colors.primary,
  },
  disabledButton: {
    opacity: 0.45,
    backgroundColor: '#263038',
    borderColor: '#181F26',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: colors.textMuted,
  },
});

