import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Host, Button } from '@expo/ui';
import { hapticService } from '../services/haptics';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'hazard' | 'outline' | 'dark';
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}) => {
  const mapped =
    variant === 'outline' || variant === 'secondary' ? 'outlined' : variant === 'dark' ? 'text' : 'filled';

  return (
    <Host matchContents style={[{ minHeight: 48 }, style]}>
      <Button
        label={label}
        variant={mapped}
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          hapticService.tap();
          onPress();
        }}
      />
    </Host>
  );
};
