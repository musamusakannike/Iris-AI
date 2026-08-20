import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Compass, BookOpen, ShieldAlert, Palette } from 'lucide-react-native';
import { colors, brutalistShadow } from '../theme/colors';
import { AssistiveMode } from '../services/api';
import { hapticService } from '../services/haptics';

interface ModeSelectorProps {
  activeMode: AssistiveMode;
  onSelectMode: (mode: AssistiveMode) => void;
}

const MODES: Array<{
  id: AssistiveMode;
  label: string;
  categoryTag: string;
  hint: string;
  icon: React.FC<{ size: number; color: string }>;
  accentColor: string;
}> = [
  {
    id: 'explore',
    label: 'EXPLORE',
    categoryTag: 'SPATIAL',
    hint: 'Describes your general surroundings and spatial layout',
    icon: Compass,
    accentColor: colors.primary, // #FF634E Coral
  },
  {
    id: 'read',
    label: 'READ TEXT',
    categoryTag: 'OCR',
    hint: 'Reads documents, signs, labels, and text out loud',
    icon: BookOpen,
    accentColor: colors.droneTech, // #2563EB Tech Blue
  },
  {
    id: 'hazard',
    label: 'HAZARDS',
    categoryTag: 'SAFETY',
    hint: 'Scans strictly for steps, drop-offs, and obstacles in your path',
    icon: ShieldAlert,
    accentColor: colors.hazardHigh, // #EF4444 Hazard Red
  },
  {
    id: 'color',
    label: 'COLORS',
    categoryTag: 'VISION',
    hint: 'Identifies clothing colors and objects',
    icon: Palette,
    accentColor: colors.engineering, // #7C3AED Purple
  },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  activeMode,
  onSelectMode,
}) => {
  const handleSelect = (mode: AssistiveMode) => {
    hapticService.selection();
    onSelectMode(mode);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MODES.map((item) => {
          const isActive = activeMode === item.id;
          const IconComponent = item.icon;

          return (
            <TouchableOpacity
              key={item.id}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} mode, ${isActive ? 'selected' : 'not selected'}`}
              accessibilityHint={item.hint}
              activeOpacity={0.8}
              onPress={() => handleSelect(item.id)}
              style={[
                styles.pillTouchable,
                isActive ? styles.pillActive : styles.pillInactive,
                isActive && {
                  borderTopColor: item.accentColor,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isActive ? item.accentColor : '#232C35',
                  },
                ]}
              >
                <IconComponent
                  size={15}
                  color={isActive ? '#0A0E11' : colors.textMuted}
                />
              </View>
              <View style={styles.textColumn}>
                <Text
                  style={[
                    styles.pillLabel,
                    isActive ? styles.pillLabelActive : styles.pillLabelInactive,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  pillTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4, // Sharp brutalist badge
    borderWidth: 2,
    borderColor: '#0A0E11',
    gap: 8,
    minHeight: 46,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  pillInactive: {
    backgroundColor: '#181F26',
    borderColor: '#2C3742',
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pillLabelActive: {
    color: '#0A0E11',
  },
  pillLabelInactive: {
    color: colors.textSecondary,
  },
});

