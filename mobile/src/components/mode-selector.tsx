import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Compass, BookOpen, ShieldAlert, Palette } from 'lucide-react-native';
import { GlassSurface } from './glass-surface';
import { colors } from '../theme/colors';
import { AssistiveMode } from '../services/api';

interface ModeSelectorProps {
  activeMode: AssistiveMode;
  onSelectMode: (mode: AssistiveMode) => void;
}

const MODES: Array<{
  id: AssistiveMode;
  label: string;
  hint: string;
  icon: React.FC<{ size: number; color: string }>;
  accentColor: string;
}> = [
  {
    id: 'explore',
    label: 'Explore',
    hint: 'Describes your general surroundings and spatial layout',
    icon: Compass,
    accentColor: colors.primary,
  },
  {
    id: 'read',
    label: 'Read Text',
    hint: 'Reads documents, signs, labels, and text out loud',
    icon: BookOpen,
    accentColor: '#38BDF8',
  },
  {
    id: 'hazard',
    label: 'Hazards',
    hint: 'Scans strictly for steps, drop-offs, and obstacles in your path',
    icon: ShieldAlert,
    accentColor: colors.hazardHigh,
  },
  {
    id: 'color',
    label: 'Colors',
    hint: 'Identifies clothing colors and objects',
    icon: Palette,
    accentColor: '#A855F7',
  },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  activeMode,
  onSelectMode,
}) => {
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
              activeOpacity={0.7}
              onPress={() => onSelectMode(item.id)}
              style={styles.pillTouchable}
            >
              <GlassSurface
                style={[
                  styles.pillSurface,
                  isActive && {
                    backgroundColor: 'rgba(56, 189, 248, 0.22)',
                    borderColor: item.accentColor,
                    borderWidth: 1.5,
                  },
                ]}
                glassEffectStyle="regular"
                highlight={isActive}
              >
                <IconComponent
                  size={18}
                  color={isActive ? item.accentColor : colors.textMuted}
                />
                <Text
                  style={[
                    styles.pillLabel,
                    isActive ? { color: colors.textPrimary, fontWeight: '700' } : { color: colors.textMuted },
                  ]}
                >
                  {item.label}
                </Text>
              </GlassSurface>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  pillTouchable: {
    minHeight: 44, // Apple HIG min touch target
    justifyContent: 'center',
  },
  pillSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
