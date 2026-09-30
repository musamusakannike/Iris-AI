import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Slider } from '@expo/ui/community/slider';
import { SymbolView } from 'expo-symbols';
import { colors } from '../theme/colors';
import { useIrisStore } from '../store/useIrisStore';
import { speechService, VoiceInfo } from '../services/speech';
import { hapticService } from '../services/haptics';
import { setApiBaseUrl, getApiBaseUrl } from '../services/api';
import { setWsUrl, irisWebSocket } from '../services/websocket';

const CURATED_FALLBACK_VOICES: VoiceInfo[] = [
  {
    identifier: 'default',
    name: 'Iris Auto-Enhanced Default',
    quality: 'Enhanced HD',
    language: 'en-US',
    isEnhanced: true,
    isNeural: true,
    badge: 'HD NEURAL',
  },
  {
    identifier: 'en-us-studio',
    name: 'Samantha (Studio HD)',
    quality: 'Enhanced HD',
    language: 'en-US',
    isEnhanced: true,
    isNeural: true,
    badge: 'STUDIO',
  },
];

export default function SettingsScreen() {
  const { settings, updateSettings } = useIrisStore();
  const [serverHostText, setServerHostText] = useState(
    getApiBaseUrl().replace('/api/v1', '')
  );
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState<'EN' | 'ENHANCED' | 'ALL'>('EN');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);

  useEffect(() => {
    speechService.announce('Preferences and accessibility settings screen.');
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const voices = await speechService.getAvailableVoices();
      setAvailableVoices(voices && voices.length > 0 ? voices : CURATED_FALLBACK_VOICES);
    } catch {
      setAvailableVoices(CURATED_FALLBACK_VOICES);
    }
  };

  const filteredVoices = useMemo(() => {
    let list = availableVoices;
    if (voiceSearchQuery.trim()) {
      const q = voiceSearchQuery.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.language.toLowerCase().includes(q) ||
          v.identifier.toLowerCase().includes(q)
      );
    } else if (voiceFilter === 'EN') {
      list = list.filter((v) => v.language.toLowerCase().startsWith('en'));
    } else if (voiceFilter === 'ENHANCED') {
      list = list.filter((v) => v.isEnhanced || v.badge === 'HD NEURAL' || v.badge === 'STUDIO');
    }
    return list.slice(0, 50);
  }, [availableVoices, voiceFilter, voiceSearchQuery]);

  const currentActiveVoice = useMemo(() => {
    if (!settings.voiceIdentifier || settings.voiceIdentifier === 'default') {
      const best = availableVoices.find((v) => v.isEnhanced) || availableVoices[0];
      return (
        best || {
          identifier: 'default',
          name: 'Iris Neural Default',
          language: 'en-US',
          quality: 'Enhanced HD',
          badge: 'HD NEURAL' as const,
          isEnhanced: true,
          isNeural: true,
        }
      );
    }
    return (
      availableVoices.find((v) => v.identifier === settings.voiceIdentifier) || {
        identifier: settings.voiceIdentifier,
        name: 'Custom Device Voice',
        language: 'en-US',
        quality: 'Default',
        isEnhanced: false,
        isNeural: false,
      }
    );
  }, [settings.voiceIdentifier, availableVoices]);

  const handleSelectVoice = (voice: VoiceInfo) => {
    hapticService.selection();
    const voiceId = voice.identifier === 'default' ? undefined : voice.identifier;
    updateSettings({ voiceIdentifier: voiceId });
    speechService.announce(`Selected ${voice.name}`);
    setIsVoiceModalVisible(false);
  };

  const handlePreviewVoice = async (voice: VoiceInfo) => {
    hapticService.tap();
    setPreviewingVoiceId(voice.identifier);
    const voiceId = voice.identifier === 'default' ? undefined : voice.identifier;
    await speechService.previewVoice(voiceId, voice.name, settings.speechPitch, settings.speechRate);
    setPreviewingVoiceId(null);
  };

  const handleTestCurrentVoiceSetup = () => {
    hapticService.success();
    speechService.speak(
      'IRIS AI vision system voice configured. All spatial descriptions and hazard alerts will use this voice.',
      {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        voice: settings.voiceIdentifier,
      }
    );
  };

  const handleSaveServerHost = () => {
    const trimmed = serverHostText.trim();
    if (!trimmed) return;
    setApiBaseUrl(trimmed);
    const wsUrl = trimmed.replace(/^http/, 'ws') + '/ws';
    setWsUrl(wsUrl);
    irisWebSocket.connect(wsUrl);
    hapticService.success();
    speechService.announce('Server address updated.');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestSuccess(null);
    try {
      const res = await fetch(`${serverHostText.trim()}/api/v1/health`);
      if (res.ok) {
        setTestSuccess(true);
        hapticService.success();
        speechService.announce('Server connection successful!');
      } else {
        setTestSuccess(false);
        hapticService.error();
      }
    } catch {
      setTestSuccess(false);
      hapticService.error();
    } finally {
      setIsTesting(false);
    }
  };

  const pitchLabel =
    Math.abs(settings.speechPitch - 0.85) < 0.05
      ? 'Deep'
      : Math.abs(settings.speechPitch - 1.15) < 0.05
        ? 'Clear'
        : settings.speechPitch > 1.2
          ? 'Bright'
          : 'Natural';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Preferences',
          headerLargeTitle: true,
          headerRight: () => (
            <Pressable
              hitSlop={12}
              onPress={handleTestCurrentVoiceSetup}
              accessibilityLabel="Test current voice speech"
              accessibilityRole="button"
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
            >
              <SymbolView
                name="speaker.wave.2.fill"
                tintColor={colors.accent}
                size={22}
                resizeMode="scaleAspectFit"
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {/* VOICE SECTION */}
        <Text style={styles.sectionHeader}>VOICE</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => {
              hapticService.tap();
              setIsVoiceModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Change voice"
          >
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Change Voice</Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {`${currentActiveVoice.name} · ${currentActiveVoice.language}`}
              </Text>
            </View>
            <SymbolView
              name="chevron.right"
              tintColor={colors.textMuted}
              size={14}
              resizeMode="scaleAspectFit"
            />
          </Pressable>

          <View style={styles.separator} />

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => handlePreviewVoice(currentActiveVoice)}
            accessibilityRole="button"
            accessibilityLabel="Preview voice"
          >
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Preview Voice</Text>
              <Text style={styles.rowSubtitle}>
                {previewingVoiceId ? 'Playing…' : 'Hear how IRIS will sound'}
              </Text>
            </View>
            <SymbolView
              name={previewingVoiceId ? 'waveform' : 'play.circle.fill'}
              tintColor={colors.accent}
              size={20}
              resizeMode="scaleAspectFit"
            />
          </Pressable>
        </View>

        {/* SPEECH PACING & PITCH */}
        <Text style={styles.sectionHeader}>SPEECH</Text>
        <View style={styles.card}>
          <View style={styles.sliderBlock}>
            <View style={styles.labelRow}>
              <Text style={styles.rowTitle}>Speech Speed</Text>
              <Text style={styles.badgeText}>{`${settings.speechRate.toFixed(2)}×`}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0.8}
              maximumValue={1.5}
              step={0.05}
              value={settings.speechRate}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.borderDark}
              thumbTintColor={colors.accent}
              onValueChange={(val: number) => {
                const rounded = Number(val.toFixed(2));
                if (rounded !== settings.speechRate) {
                  hapticService.selection();
                  updateSettings({ speechRate: rounded });
                }
              }}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.sliderBlock}>
            <View style={styles.labelRow}>
              <Text style={styles.rowTitle}>Speech Pitch</Text>
              <Text style={styles.badgeText}>{`${settings.speechPitch.toFixed(2)} · ${pitchLabel}`}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0.85}
              maximumValue={1.3}
              step={0.05}
              value={settings.speechPitch}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.borderDark}
              thumbTintColor={colors.accent}
              onValueChange={(val: number) => {
                const rounded = Number(val.toFixed(2));
                if (rounded !== settings.speechPitch) {
                  hapticService.selection();
                  updateSettings({ speechPitch: rounded });
                }
              }}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.segmentedBlock}>
            <Text style={styles.rowTitle}>Description Style</Text>
            <View style={styles.segmentedContainer}>
              <Pressable
                style={[
                  styles.segmentButton,
                  settings.verbosity === 'concise' && styles.segmentButtonActive,
                ]}
                onPress={() => {
                  hapticService.selection();
                  updateSettings({ verbosity: 'concise' });
                  speechService.announce('Concise mode active. Quick summaries.');
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.verbosity === 'concise' && styles.segmentTextActive,
                  ]}
                >
                  Concise
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentButton,
                  settings.verbosity === 'detailed' && styles.segmentButtonActive,
                ]}
                onPress={() => {
                  hapticService.selection();
                  updateSettings({ verbosity: 'detailed' });
                  speechService.announce('Detailed mode active. Full spatial descriptions.');
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.verbosity === 'detailed' && styles.segmentTextActive,
                  ]}
                >
                  Detailed
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* SAFETY ALERTS */}
        <Text style={styles.sectionHeader}>SAFETY & ALERTS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Hazard Vibration Alerts</Text>
              <Text style={styles.rowSubtitle}>Haptic pulses when obstacles are detected</Text>
            </View>
            <Switch
              value={settings.hazardVibration}
              onValueChange={(val) => {
                hapticService.tap();
                updateSettings({ hazardVibration: val });
              }}
              trackColor={{ false: colors.systemFill, true: colors.accent }}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Spoken Hazard Warnings</Text>
              <Text style={styles.rowSubtitle}>Audio interrupt for critical warnings</Text>
            </View>
            <Switch
              value={settings.hazardAlertSound}
              onValueChange={(val) => {
                hapticService.tap();
                updateSettings({ hazardAlertSound: val });
              }}
              trackColor={{ false: colors.systemFill, true: colors.accent }}
            />
          </View>
        </View>

        {/* SERVER CONFIGURATION */}
        <Text style={styles.sectionHeader}>BACKEND SERVER</Text>
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Server Host URL</Text>
            <TextInput
              style={styles.textInput}
              value={serverHostText}
              onChangeText={setServerHostText}
              placeholder="http://192.168.1.100:5000"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnOutline,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={styles.actionBtnOutlineText}>Test Connection</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnFilled,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleSaveServerHost}
            >
              <Text style={styles.actionBtnFilledText}>Save</Text>
            </Pressable>
          </View>

          {testSuccess === true ? (
            <View style={styles.statusRow}>
              <SymbolView name="checkmark.circle.fill" tintColor={colors.safe} size={16} />
              <Text style={[styles.statusText, { color: colors.safe }]}>Server connected successfully</Text>
            </View>
          ) : null}

          {testSuccess === false ? (
            <View style={styles.statusRow}>
              <SymbolView name="exclamationmark.triangle.fill" tintColor={colors.systemRed} size={16} />
              <Text style={[styles.statusText, { color: colors.systemRed }]}>
                Server unreachable — local offline assist active
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* VOICE SELECTION MODAL */}
      <Modal
        visible={isVoiceModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVoiceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Select Voice</Text>
              <Text style={styles.modalSubtitle}>
                {`${availableVoices.length} voices installed on device`}
              </Text>
            </View>
            <Pressable
              onPress={() => setIsVoiceModalVisible(false)}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>

          {/* FILTER TABS */}
          <View style={styles.modalFilterContainer}>
            <View style={styles.segmentedContainer}>
              <Pressable
                style={[styles.segmentButton, voiceFilter === 'EN' && styles.segmentButtonActive]}
                onPress={() => {
                  hapticService.tap();
                  setVoiceFilter('EN');
                }}
              >
                <Text style={[styles.segmentText, voiceFilter === 'EN' && styles.segmentTextActive]}>
                  English
                </Text>
              </Pressable>

              <Pressable
                style={[styles.segmentButton, voiceFilter === 'ENHANCED' && styles.segmentButtonActive]}
                onPress={() => {
                  hapticService.tap();
                  setVoiceFilter('ENHANCED');
                }}
              >
                <Text style={[styles.segmentText, voiceFilter === 'ENHANCED' && styles.segmentTextActive]}>
                  HD Neural
                </Text>
              </Pressable>

              <Pressable
                style={[styles.segmentButton, voiceFilter === 'ALL' && styles.segmentButtonActive]}
                onPress={() => {
                  hapticService.tap();
                  setVoiceFilter('ALL');
                }}
              >
                <Text style={[styles.segmentText, voiceFilter === 'ALL' && styles.segmentTextActive]}>
                  All
                </Text>
              </Pressable>
            </View>
          </View>

          {/* SEARCH INPUT */}
          <View style={styles.searchBox}>
            <SymbolView name="magnifyingglass" tintColor={colors.textMuted} size={16} />
            <TextInput
              style={styles.searchInput}
              value={voiceSearchQuery}
              onChangeText={setVoiceSearchQuery}
              placeholder="Search voices by name or language"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {/* INSTRUCTIONS ACCORDION */}
          <Pressable
            style={styles.guideToggle}
            onPress={() => setShowVoiceGuide(!showVoiceGuide)}
          >
            <Text style={styles.guideToggleText}>
              {showVoiceGuide ? 'Hide HD Voice Guide' : 'How to download HD & Studio voices'}
            </Text>
            <SymbolView
              name={showVoiceGuide ? 'chevron.up' : 'chevron.down'}
              tintColor={colors.accent}
              size={12}
            />
          </Pressable>

          {showVoiceGuide ? (
            <View style={styles.guideContent}>
              <Text style={styles.guideText}>
                • iOS: Settings → Accessibility → Spoken Content → Voices → English. Download Ava (Premium), Zoe, or Siri Voice 4 for studio quality.
              </Text>
              <Text style={[styles.guideText, { marginTop: 6 }]}>
                • Android: Settings → Accessibility → Text-to-speech output → Gear icon → Install voice data.
              </Text>
            </View>
          ) : null}

          {/* VOICE LIST */}
          <FlatList
            data={filteredVoices}
            keyExtractor={(item) => item.identifier}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const isSelected =
                (!settings.voiceIdentifier && item.identifier === 'default') ||
                settings.voiceIdentifier === item.identifier;

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.voiceItem,
                    isSelected && styles.voiceItemSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleSelectVoice(item)}
                >
                  <View style={styles.voiceInfoCol}>
                    <View style={styles.voiceNameRow}>
                      <Text style={[styles.voiceName, isSelected && { color: colors.accent }]}>
                        {item.name}
                      </Text>
                      {item.badge ? (
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.voiceDetails}>
                      {`${item.language} · ${item.quality}`}
                    </Text>
                  </View>

                  <View style={styles.voiceActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.playBtn,
                        pressed && { opacity: 0.6 },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(item);
                      }}
                      hitSlop={8}
                    >
                      {previewingVoiceId === item.identifier ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <SymbolView name="play.fill" tintColor={colors.accent} size={14} />
                      )}
                    </Pressable>

                    {isSelected ? (
                      <SymbolView
                        name="checkmark"
                        tintColor={colors.accent}
                        size={18}
                        style={{ marginLeft: 12 }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tertiaryLabel,
    marginLeft: 12,
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: colors.secondaryGroupedBackground,
    borderRadius: 14,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: {
    backgroundColor: colors.systemFill,
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.label,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.secondaryLabel,
    marginTop: 3,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 16,
  },
  sliderBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  segmentedBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.systemFill,
    borderRadius: 9,
    padding: 3,
    marginTop: 10,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentButtonActive: {
    backgroundColor: colors.secondaryGroupedBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryLabel,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: colors.label,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryLabel,
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    backgroundColor: colors.systemFill,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.label,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  actionBtnOutlineText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtnFilled: {
    backgroundColor: colors.accent,
  },
  actionBtnFilledText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.label,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  modalCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  modalCloseText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalFilterContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryGroupedBackground,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: colors.label,
  },
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  guideToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.accent,
  },
  guideContent: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.secondaryGroupedBackground,
    marginBottom: 8,
  },
  guideText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.secondaryLabel,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.secondaryGroupedBackground,
  },
  voiceItemSelected: {
    backgroundColor: colors.systemFill,
  },
  voiceInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  voiceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.label,
  },
  voiceDetails: {
    fontSize: 12,
    color: colors.secondaryLabel,
    marginTop: 3,
  },
  badgePill: {
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  voiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.systemFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

