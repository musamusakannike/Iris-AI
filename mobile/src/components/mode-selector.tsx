import React from 'react';
import { View } from 'react-native';
import { Host } from '@expo/ui';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { AssistiveMode } from '../services/api';
import { hapticService } from '../services/haptics';
import { colors } from '../theme/colors';

interface ModeSelectorProps {
  activeMode: AssistiveMode;
  onSelectMode: (mode: AssistiveMode) => void;
}

const MODE_VALUES = ['Explore', 'Read', 'Hazards', 'Colors'] as const;
const MODE_IDS: AssistiveMode[] = ['explore', 'read', 'hazard', 'color'];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  activeMode,
  onSelectMode,
}) => {
  const selectedIndex = Math.max(0, MODE_IDS.indexOf(activeMode));

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Host matchContents style={{ minHeight: 36 }}>
        <SegmentedControl
          values={[...MODE_VALUES]}
          selectedIndex={selectedIndex}
          tintColor={colors.accent as string}
          onChange={(event) => {
            const index = event.nativeEvent.selectedSegmentIndex;
            const next = MODE_IDS[index];
            if (next) {
              hapticService.selection();
              onSelectMode(next);
            }
          }}
        />
      </Host>
    </View>
  );
};
