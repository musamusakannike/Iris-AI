import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Volume2, X, AlertTriangle } from 'lucide-react-native';
import { colors, brutalistShadow } from '../theme/colors';
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

  // Determine top border stripe color based on mode and hazard level
  const getTopBorderColor = () => {
    if (isHazard) return colors.hazardHigh;
    if (isLowHazard) return colors.hazardLow;
    switch (description.mode) {
      case 'read':
        return colors.droneTech;
      case 'color':
        return colors.engineering;
      case 'hazard':
        return colors.hazardHigh;
      case 'ask':
        return colors.software;
      case 'explore':
      default:
        return colors.primary;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { borderTopColor: getTopBorderColor() },
        isHazard && styles.hazardGlow,
      ]}
    >
      {/* Top Header Row with Badges and Close */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          {/* Mode Tag */}
          <View
            style={[
              styles.modeBadge,
              { backgroundColor: getTopBorderColor() },
            ]}
          >
            <Text style={styles.modeBadgeText}>
              {description.mode.toUpperCase()}
            </Text>
          </View>

          {isHazard && (
            <View style={styles.hazardBadge}>
              <AlertTriangle size={12} color="#FFFFFF" />
              <Text style={styles.hazardBadgeText}>HAZARD</Text>
            </View>
          )}
          {isLowHazard && (
            <View style={styles.cautionBadge}>
              <AlertTriangle size={12} color="#0A0E11" />
              <Text style={styles.cautionBadgeText}>CAUTION</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close spoken description"
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={18} color={colors.textDarkSecondary} />
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

      {/* Footer Action Bar */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Listen again"
          accessibilityHint="Repeats the audio description out loud"
          activeOpacity={0.85}
          onPress={handleReplay}
          style={styles.replayButton}
        >
          <Volume2 size={15} color="#0A0E11" />
          <Text style={styles.replayText}>LISTEN AGAIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF', // High-contrast clean white card from Academy
    borderWidth: 2,
    borderColor: '#0A0E11',
    borderTopWidth: 5,
    borderRadius: 4, // Sharp brutalist corner
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  hazardGlow: {
    borderColor: colors.hazardHigh,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  modeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hazardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.hazardHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    gap: 4,
  },
  hazardBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cautionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.hazardLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    gap: 4,
  },
  cautionBadgeText: {
    color: '#0A0E11',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  spokenText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: '#171717', // High contrast dark text from Academy
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 3,
    backgroundColor: colors.primary, // A1 Primary coral
    borderWidth: 2,
    borderColor: '#0A0E11',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  replayText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#0A0E11',
  },
});

