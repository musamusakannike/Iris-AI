import React from 'react';
import { View, Text } from 'react-native';
import { Host, Button, Row } from '@expo/ui';
import { GlassSurface } from './glass-surface';
import { colors } from '../theme/colors';
import { VisionResponse, AssistiveMode } from '../services/api';
import { hapticService } from '../services/haptics';

interface SpeechBannerProps {
  description: VisionResponse | null;
  liveStreamingText?: string;
  isLiveStreaming?: boolean;
  activeMode?: AssistiveMode;
  onReplay: () => void;
  onClose: () => void;
}

export const SpeechBanner: React.FC<SpeechBannerProps> = ({
  description,
  liveStreamingText,
  isLiveStreaming,
  activeMode = 'explore',
  onReplay,
  onClose,
}) => {
  const hasLiveText = Boolean(liveStreamingText && liveStreamingText.trim().length > 0);
  if (!description && !hasLiveText) return null;

  const currentMode = description?.mode || activeMode;
  const displayText = (hasLiveText ? liveStreamingText : description?.spokenSummary) || '';

  const isHazard =
    description?.hazardLevel === 'medium' ||
    description?.hazardLevel === 'high' ||
    displayText.toLowerCase().includes('danger') ||
    displayText.toLowerCase().includes('hazard') ||
    displayText.toLowerCase().includes('caution');

  const isLowHazard = description?.hazardLevel === 'low';

  const accent = isHazard
    ? colors.systemRed
    : isLowHazard
      ? colors.systemOrange
      : colors.accent;

  return (
    <GlassSurface
      colorScheme="light"
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: accent,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            backgroundColor: accent,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            borderCurve: 'continuous',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>
            {currentMode.toUpperCase()}
            {hasLiveText && isLiveStreaming ? '  ·  LIVE' : ''}
            {isHazard ? '  ·  HAZARD' : ''}
          </Text>
        </View>
        <Host matchContents>
          <Button
            label="Close"
            variant="text"
            onPress={() => {
              hapticService.tap();
              onClose();
            }}
          />
        </Host>
      </View>

      <Text
        selectable
        style={{
          marginTop: 10,
          fontSize: 17,
          lineHeight: 24,
          fontWeight: '600',
          color: colors.textDark,
        }}
        accessibilityLabel={`Spoken description: ${displayText}`}
      >
        {displayText}
        {hasLiveText && isLiveStreaming ? ' ▍' : ''}
      </Text>

      {description && !isLiveStreaming ? (
        <View style={{ marginTop: 10 }}>
          <Host matchContents>
            <Row>
              <Button
                label="Listen Again"
                variant="filled"
                onPress={() => {
                  hapticService.tap();
                  onReplay();
                }}
              />
            </Row>
          </Host>
        </View>
      ) : null}
    </GlassSurface>
  );
};
