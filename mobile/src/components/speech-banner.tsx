import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Volume2, X, AlertTriangle, RotateCcw } from 'lucide-react-native';
import { GlassSurface } from './glass-surface';
import { colors } from '../theme/colors';
import { VisionResponse } from '../services/api';
import { hapticService } from '../services/haptics';

interface SpeechBannerProps {
  description: VisionResponse | null;
  onReplay: () => void;
  onClose: () => void;
}

export const SpeechBanner: React.FC<SpeechBannerProps> = ({
  description,
  onReplay,
  onClose,
}) => {
  if (!description) return null;

  const isHazard =
    description.hazardLevel === 'medium' || description.hazardLevel === 'high';
  const isLowHazard = description.hazardLevel === 'low';

  const handleReplay = () => {
    hapticService.tap();
    onReplay();
  };

  const handleClose = () => {
    hapticService.tap();
    onClose();
  };

  return (
    <GlassSurface
      style={[
        styles.container,
        isHazard && styles.hazardContainer,
        isLowHazard && styles.cautionContainer,
      ]}
      glassEffectStyle="regular"
      highlight={isHazard || isLowHazard}
    >
      {/* Top Header Row with Badge and Close */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          {isHazard && (
            <View style={styles.hazardBadge}>
              <AlertTriangle size={14} color="#FFFFFF" />
              <Text style={styles.hazardBadgeText}>Hazard Alert</Text>
            </View>
          )}
          {isLowHazard && (
            <View style={styles.cautionBadge}>
              <AlertTriangle size={14} color="#FFFFFF" />
              <Text style={styles.cautionBadgeText}>Caution</Text>
            </View>
          )}
          <Text style={styles.modeTag}>
            {description.mode.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close spoken description"
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Main Spoken Text */}
      <Text
        style={styles.spokenText}
        accessible={true}
        accessibilityLabel={`Spoken description: ${description.spokenSummary}`}
      >
        {description.spokenSummary}
      </Text>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Listen again"
          accessibilityHint="Repeats the audio description out loud"
          onPress={handleReplay}
          style={styles.replayButton}
        >
          <Volume2 size={16} color={colors.primary} />
          <Text style={styles.replayText}>Listen Again</Text>
        </TouchableOpacity>
      </View>
    </GlassSurface>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  hazardContainer: {
    backgroundColor: 'rgba(69, 10, 10, 0.88)',
    borderColor: colors.hazardHigh,
    borderWidth: 1.5,
  },
  cautionContainer: {
    backgroundColor: 'rgba(69, 39, 10, 0.88)',
    borderColor: colors.hazardLow,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hazardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.hazardHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  hazardBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cautionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.hazardLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  cautionBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  modeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  spokenText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  replayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
