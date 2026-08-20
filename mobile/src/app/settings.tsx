import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Volume2,
  Sliders,
  ShieldAlert,
  Server,
  Check,
  RefreshCw,
  Zap,
  Mic,
  Headphones,
  Sparkles,
  Play,
  Search,
  Globe,
  Radio,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { colors, brutalistShadow } from '../theme/colors';
import { useIrisStore } from '../store/useIrisStore';
import { speechService, VoiceInfo } from '../services/speech';
import { hapticService } from '../services/haptics';
import { setApiBaseUrl, getApiBaseUrl } from '../services/api';
import { setWsUrl, irisWebSocket } from '../services/websocket';

const SPEECH_RATES = [
  { label: '0.8x', value: 0.8, description: 'SLOWER' },
  { label: '1.0x', value: 1.0, description: 'NORMAL' },
  { label: '1.25x', value: 1.25, description: 'FAST' },
  { label: '1.5x', value: 1.5, description: 'VERY FAST' },
];

const SPEECH_PITCHES = [
  { label: '0.85x', value: 0.85, name: 'DEEP', description: 'Low warm tone' },
  { label: '1.0x', value: 1.0, name: 'NATURAL', description: 'Standard balanced' },
  { label: '1.15x', value: 1.15, name: 'CLEAR', description: 'Crisp articulation' },
  { label: '1.3x', value: 1.3, name: 'BRIGHT', description: 'High resonance' },
];

// Fallback curated voices in case device returns empty list (e.g. some simulator environments)
const CURATED_FALLBACK_VOICES: VoiceInfo[] = [
  { identifier: 'default', name: 'Iris Auto-Enhanced Default', quality: 'Enhanced HD', language: 'en-US', isEnhanced: true, isNeural: true, badge: 'HD NEURAL' },
  { identifier: 'en-us-studio', name: 'Samantha (Studio HD)', quality: 'Enhanced HD', language: 'en-US', isEnhanced: true, isNeural: true, badge: 'HD NEURAL' },
  { identifier: 'en-gb-clarity', name: 'Daniel (Clear British)', quality: 'Enhanced HD', language: 'en-GB', isEnhanced: true, isNeural: true, badge: 'STUDIO' },
  { identifier: 'en-au-warm', name: 'Karen (Natural Pacific)', quality: 'Natural', language: 'en-AU', isEnhanced: false, isNeural: false, badge: 'NATURAL' },
  { identifier: 'en-us-neural', name: 'Alex (Deep Focus)', quality: 'Enhanced HD', language: 'en-US', isEnhanced: true, isNeural: true, badge: 'HD NEURAL' },
];

export default function SettingsScreen() {
  const { settings, updateSettings } = useIrisStore();
  const [serverHost, setServerHost] = useState(
    getApiBaseUrl().replace('/api/v1', '')
  );
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Voice State & Modal
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<'ALL' | 'EN' | 'ENHANCED'>('EN');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);

  useEffect(() => {
    speechService.announce('Preferences and accessibility settings screen.');
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const voices = await speechService.getAvailableVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
      } else {
        setAvailableVoices(CURATED_FALLBACK_VOICES);
      }
    } catch (e) {
      setAvailableVoices(CURATED_FALLBACK_VOICES);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Filter and prioritize voices
  const filteredVoices = useMemo(() => {
    let list = availableVoices;

    if (voiceSearchQuery.trim()) {
      const q = voiceSearchQuery.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.language.toLowerCase().includes(q) ||
          v.identifier.toLowerCase().includes(q) ||
          (v.badge && v.badge.toLowerCase().includes(q))
      );
    } else {
      if (selectedVoiceFilter === 'EN') {
        list = list.filter((v) => v.language.toLowerCase().startsWith('en'));
      } else if (selectedVoiceFilter === 'ENHANCED') {
        list = list.filter(
          (v) => v.isEnhanced || v.badge === 'HD NEURAL' || v.badge === 'STUDIO'
        );
      }
    }

    return list;
  }, [availableVoices, selectedVoiceFilter, voiceSearchQuery]);

  const handleOpenVoiceModal = () => {
    hapticService.tap();
    setIsVoiceModalVisible(true);
    speechService.announce('Voice selection dialog opened.');
  };

  const handleCloseVoiceModal = () => {
    hapticService.tap();
    setIsVoiceModalVisible(false);
  };

  const handleSelectVoice = (voice: VoiceInfo) => {
    hapticService.selection();
    const voiceId = voice.identifier === 'default' ? undefined : voice.identifier;
    updateSettings({ voiceIdentifier: voiceId });
    speechService.announce(`Selected ${voice.name}`);
  };

  const handlePreviewVoice = async (voice: VoiceInfo) => {
    hapticService.tap();
    setPreviewingVoiceId(voice.identifier);
    const voiceId = voice.identifier === 'default' ? undefined : voice.identifier;
    await speechService.previewVoice(
      voiceId,
      voice.name,
      settings.speechPitch,
      settings.speechRate
    );
    setPreviewingVoiceId(null);
  };

  const handlePitchChange = (pitch: number, name: string) => {
    hapticService.selection();
    updateSettings({ speechPitch: pitch });
    speechService.speak(`Voice tone set to ${name}`, {
      pitch,
      rate: settings.speechRate,
      voice: settings.voiceIdentifier,
    });
  };

  const handleRateChange = (rate: number) => {
    hapticService.selection();
    updateSettings({ speechRate: rate });
    speechService.speak(`Speech speed set to ${rate}x`, {
      rate,
      pitch: settings.speechPitch,
      voice: settings.voiceIdentifier,
    });
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

  const handleVerbosityChange = (verbosity: 'concise' | 'detailed') => {
    hapticService.selection();
    updateSettings({ verbosity });
    speechService.announce(
      verbosity === 'concise'
        ? 'Concise mode active. Quick summaries.'
        : 'Detailed mode active. Full spatial descriptions.'
    );
  };

  const handleToggleHazardSound = (val: boolean) => {
    hapticService.tap();
    updateSettings({ hazardAlertSound: val });
  };

  const handleToggleHazardVibration = (val: boolean) => {
    hapticService.tap();
    updateSettings({ hazardVibration: val });
  };

  const handleSaveServerHost = () => {
    const trimmed = serverHost.trim();
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
      const res = await fetch(`${serverHost.trim()}/api/v1/health`);
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

  // Find active voice details
  const currentActiveVoice = useMemo(() => {
    if (!settings.voiceIdentifier || settings.voiceIdentifier === 'default') {
      const best = availableVoices.find((v) => v.isEnhanced) || availableVoices[0];
      if (best) {
        return {
          ...best,
          name: `${best.name} (Auto-Enhanced)`,
          badge: (best.badge || 'HD NEURAL') as any,
        };
      }
      return {
        identifier: 'default',
        name: 'Iris Neural Default',
        language: 'en-US',
        quality: 'Enhanced HD',
        badge: 'HD NEURAL' as const,
        isEnhanced: true,
        isNeural: true,
      };
    }
    const found = availableVoices.find((v) => v.identifier === settings.voiceIdentifier);
    return (
      found || {
        identifier: settings.voiceIdentifier,
        name: 'Custom Device Voice',
        language: 'en-US',
        quality: 'Default',
        isEnhanced: false,
        isNeural: false,
      }
    );
  }, [settings.voiceIdentifier, availableVoices]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* VOICE & PERSONA SELECTION CARD */}
        <View style={[styles.sectionCard, { borderTopColor: colors.primary }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
              <Headphones size={16} color="#0A0E11" />
            </View>
            <Text style={styles.sectionTitle}>AI VOICE & PERSONA</Text>
          </View>
          <Text style={styles.sectionDescription}>
            High-definition on-device neural voice for zero-latency offline assistance
          </Text>

          {/* Active Voice Feature Card with BottomSheet Trigger */}
          <View style={styles.activeVoiceHeroCard}>
            <View style={styles.activeVoiceHeroTop}>
              <View style={styles.activeVoiceIconBadge}>
                <Radio size={16} color={colors.primary} />
              </View>
              <View style={styles.activeVoiceHeroInfo}>
                <View style={styles.activeVoiceHeroTitleRow}>
                  <Text style={styles.activeVoiceHeroName} numberOfLines={1}>
                    {currentActiveVoice.name}
                  </Text>
                  <View style={styles.languageBadge}>
                    <Text style={styles.languageBadgeText}>
                      {currentActiveVoice.language.toUpperCase()}
                    </Text>
                  </View>
                  {currentActiveVoice.badge === 'HD NEURAL' && (
                    <View style={styles.enhancedBadge}>
                      <Text style={styles.enhancedBadgeText}>⚡ HD NEURAL</Text>
                    </View>
                  )}
                  {currentActiveVoice.badge === 'STUDIO' && (
                    <View style={styles.studioBadge}>
                      <Text style={styles.studioBadgeText}>STUDIO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.activeVoiceHeroSubtitle} numberOfLines={1}>
                  100% OFFLINE • ZERO LATENCY • {currentActiveVoice.identifier}
                </Text>
              </View>
            </View>

            <View style={styles.activeVoiceHeroActions}>
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Preview active voice"
                onPress={() => handlePreviewVoice(currentActiveVoice)}
                style={styles.heroPreviewButton}
              >
                {previewingVoiceId === currentActiveVoice.identifier ? (
                  <ActivityIndicator size={13} color="#0A0E11" />
                ) : (
                  <Play size={13} color="#0A0E11" />
                )}
                <Text style={styles.heroPreviewButtonText}>PREVIEW VOICE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Switch AI voice in bottom sheet"
                onPress={handleOpenVoiceModal}
                style={styles.switchVoiceButton}
              >
                <Text style={styles.switchVoiceButtonText}>CHANGE VOICE</Text>
                <ChevronRight size={15} color="#0A0E11" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Test Voice Setup Button */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Test entire active voice configuration"
            onPress={handleTestCurrentVoiceSetup}
            style={styles.masterTestButton}
          >
            <Volume2 size={16} color="#0A0E11" />
            <Text style={styles.masterTestButtonText}>
              TEST ACTIVE VOICE SETUP
            </Text>
          </TouchableOpacity>
        </View>

        {/* VOICE PITCH & TONE */}
        <View style={[styles.sectionCard, { borderTopColor: colors.engineering }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.engineering }]}>
              <Sparkles size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>VOICE TONE & PITCH</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Modulate the vocal resonance and acoustic pitch
          </Text>

          <View style={styles.rateGrid}>
            {SPEECH_PITCHES.map((pitch) => {
              const isSelected =
                Math.abs((settings.speechPitch || 1.0) - pitch.value) < 0.05;
              return (
                <TouchableOpacity
                  key={pitch.value}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Pitch ${pitch.name} (${pitch.label}), ${isSelected ? 'selected' : 'not selected'}`}
                  onPress={() => handlePitchChange(pitch.value, pitch.name)}
                  style={[
                    styles.pitchButton,
                    isSelected
                      ? styles.pitchButtonActive
                      : styles.pitchButtonInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rateButtonText,
                      isSelected
                        ? styles.rateButtonTextActive
                        : styles.rateButtonTextInactive,
                    ]}
                  >
                    {pitch.label}
                  </Text>
                  <Text
                    style={[
                      styles.rateButtonSubtext,
                      isSelected
                        ? styles.pitchSubtextActive
                        : styles.rateButtonSubtextInactive,
                    ]}
                  >
                    {pitch.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Speech Speed Setting */}
        <View style={[styles.sectionCard, { borderTopColor: colors.droneTech }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.droneTech }]}>
              <Volume2 size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>SPEECH SPEED</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose how fast IRIS articulates scene descriptions aloud
          </Text>

          <View style={styles.rateGrid}>
            {SPEECH_RATES.map((rate) => {
              const isSelected = settings.speechRate === rate.value;
              return (
                <TouchableOpacity
                  key={rate.value}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Speech speed ${rate.label} (${rate.description}), ${isSelected ? 'selected' : 'not selected'}`}
                  onPress={() => handleRateChange(rate.value)}
                  style={[
                    styles.rateButton,
                    isSelected ? styles.rateButtonActive : styles.rateButtonInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rateButtonText,
                      isSelected ? styles.rateButtonTextActive : styles.rateButtonTextInactive,
                    ]}
                  >
                    {rate.label}
                  </Text>
                  <Text
                    style={[
                      styles.rateButtonSubtext,
                      isSelected ? styles.rateButtonSubtextActive : styles.rateButtonSubtextInactive,
                    ]}
                  >
                    {rate.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Verbosity Mode */}
        <View style={[styles.sectionCard, { borderTopColor: colors.foundations }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.foundations }]}>
              <Sliders size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>DESCRIPTION STYLE</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Select between punchy direct cues or full spatial details
          </Text>

          <View style={styles.verbosityRow}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Concise mode, ${settings.verbosity === 'concise' ? 'selected' : 'not selected'}`}
              accessibilityHint="Gives punchy 1-2 sentence direct audio descriptions"
              onPress={() => handleVerbosityChange('concise')}
              style={[
                styles.verbosityButton,
                settings.verbosity === 'concise'
                  ? styles.verbosityButtonActive
                  : styles.verbosityButtonInactive,
              ]}
            >
              <Text
                style={[
                  styles.verbosityTitle,
                  settings.verbosity === 'concise' && styles.verbosityTitleActive,
                ]}
              >
                CONCISE
              </Text>
              <Text style={styles.verbosityDesc}>
                Quick direct summaries optimized for rapid walking
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Detailed mode, ${settings.verbosity === 'detailed' ? 'selected' : 'not selected'}`}
              accessibilityHint="Gives comprehensive spatial directions and object layout"
              onPress={() => handleVerbosityChange('detailed')}
              style={[
                styles.verbosityButton,
                settings.verbosity === 'detailed'
                  ? styles.verbosityButtonActive
                  : styles.verbosityButtonInactive,
              ]}
            >
              <Text
                style={[
                  styles.verbosityTitle,
                  settings.verbosity === 'detailed' && styles.verbosityTitleActive,
                ]}
              >
                DETAILED
              </Text>
              <Text style={styles.verbosityDesc}>
                Comprehensive breakdown with object distances
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety & Hazard Alerts */}
        <View style={[styles.sectionCard, { borderTopColor: colors.hazardHigh }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.hazardHigh }]}>
              <ShieldAlert size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>SAFETY & HAZARDS</Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleLabel}>Hazard Vibration Alerts</Text>
              <Text style={styles.toggleSubtext}>
                Haptic vibration pattern when stairs or obstacles are ahead
              </Text>
            </View>
            <Switch
              value={settings.hazardVibration}
              onValueChange={handleToggleHazardVibration}
              trackColor={{ false: '#2C3742', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.toggleRow, { marginTop: 16 }]}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleLabel}>Auditory Warning Signal</Text>
              <Text style={styles.toggleSubtext}>
                Immediate spoken voice alert for critical hazards
              </Text>
            </View>
            <Switch
              value={settings.hazardAlertSound}
              onValueChange={handleToggleHazardSound}
              trackColor={{ false: '#2C3742', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Server & Engine Connection */}
        <View style={[styles.sectionCard, { borderTopColor: '#475569' }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#475569' }]}>
              <Server size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>BACKEND SERVER ENGINE</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Configure your Express + Gemini Vision backend endpoint
          </Text>

          <TextInput
            style={styles.serverInput}
            value={serverHost}
            onChangeText={setServerHost}
            placeholder="http://localhost:5000"
            placeholderTextColor={colors.textDarkMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.serverActionRow}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Test backend server connection"
              onPress={handleTestConnection}
              style={styles.testButton}
              disabled={isTesting}
            >
              <RefreshCw size={13} color="#0A0E11" />
              <Text style={styles.testButtonText}>
                {isTesting ? 'TESTING...' : 'TEST LINK'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Save server address"
              onPress={handleSaveServerHost}
              style={styles.saveServerButton}
            >
              <Check size={13} color="#0A0E11" />
              <Text style={styles.saveServerButtonText}>SAVE</Text>
            </TouchableOpacity>
          </View>

          {testSuccess === true && (
            <View style={styles.statusBoxSuccess}>
              <Text style={styles.testSuccessText}>
                ✓ SERVER CONNECTED & ACTIVE
              </Text>
            </View>
          )}
          {testSuccess === false && (
            <View style={styles.statusBoxError}>
              <Text style={styles.testErrorText}>
                ✕ SERVER UNREACHABLE — OFFLINE ASSIST ACTIVE
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET MODAL FOR VOICE SELECTION */}
      {/* ========================================================================= */}
      <Modal
        visible={isVoiceModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseVoiceModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleCloseVoiceModal}>
          <Pressable style={styles.bottomSheetContainer} onPress={(e) => e.stopPropagation()}>
            {/* Sheet Handle Bar */}
            <View style={styles.sheetHandle} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
                  <Headphones size={16} color="#0A0E11" />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>SELECT VOICE PERSONA</Text>
                  <Text style={styles.sheetSubtitle}>
                    {availableVoices.length} voices available on device
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close voice selection sheet"
                onPress={handleCloseVoiceModal}
                style={styles.sheetCloseButton}
              >
                <X size={18} color="#0A0E11" />
              </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <View style={styles.modalFilterChipsRow}>
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Filter English Voices"
                onPress={() => {
                  hapticService.tap();
                  setSelectedVoiceFilter('EN');
                  setVoiceSearchQuery('');
                }}
                style={[
                  styles.filterChip,
                  selectedVoiceFilter === 'EN' && !voiceSearchQuery
                    ? styles.filterChipActive
                    : styles.filterChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedVoiceFilter === 'EN' && !voiceSearchQuery
                      ? styles.filterChipTextActive
                      : styles.filterChipTextInactive,
                  ]}
                >
                  ENGLISH
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Filter Enhanced HD Voices"
                onPress={() => {
                  hapticService.tap();
                  setSelectedVoiceFilter('ENHANCED');
                  setVoiceSearchQuery('');
                }}
                style={[
                  styles.filterChip,
                  selectedVoiceFilter === 'ENHANCED' && !voiceSearchQuery
                    ? styles.filterChipActive
                    : styles.filterChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedVoiceFilter === 'ENHANCED' && !voiceSearchQuery
                      ? styles.filterChipTextActive
                      : styles.filterChipTextInactive,
                  ]}
                >
                  ⚡ HD NEURAL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Show All Voices"
                onPress={() => {
                  hapticService.tap();
                  setSelectedVoiceFilter('ALL');
                  setVoiceSearchQuery('');
                }}
                style={[
                  styles.filterChip,
                  selectedVoiceFilter === 'ALL' && !voiceSearchQuery
                    ? styles.filterChipActive
                    : styles.filterChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedVoiceFilter === 'ALL' && !voiceSearchQuery
                      ? styles.filterChipTextActive
                      : styles.filterChipTextInactive,
                  ]}
                >
                  ALL ({availableVoices.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Offline Studio Voice Guide Banner */}
            <TouchableOpacity
              onPress={() => setShowVoiceGuide(!showVoiceGuide)}
              style={styles.voiceGuideBanner}
            >
              <View style={styles.voiceGuideBannerHeader}>
                <Sparkles size={14} color="#0A0E11" />
                <Text style={styles.voiceGuideBannerTitle}>
                  {showVoiceGuide ? 'HIDE OFFLINE HD SETUP GUIDE' : '💡 HOW TO UNLOCK FREE STUDIO NEURAL VOICES'}
                </Text>
              </View>
              {showVoiceGuide && (
                <View style={styles.voiceGuideBannerBody}>
                  <Text style={styles.voiceGuideText}>
                    <Text style={{ fontWeight: '900' }}>iOS / iPhone:</Text> Settings ➔ Accessibility ➔ Spoken Content ➔ Voices ➔ English ➔ Download <Text style={{ fontWeight: '900' }}>Ava (Premium)</Text>, <Text style={{ fontWeight: '900' }}>Zoe</Text>, or <Text style={{ fontWeight: '900' }}>Siri</Text> for 100% free studio audio.
                  </Text>
                  <Text style={[styles.voiceGuideText, { marginTop: 6 }]}>
                    <Text style={{ fontWeight: '900' }}>Android:</Text> Settings ➔ Accessibility ➔ Text-to-speech output ➔ Install voice data (Google TTS High Quality).
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Voice Search Input */}
            <View style={styles.modalSearchContainer}>
              <Search size={14} color="#737373" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by voice name or country..."
                placeholderTextColor="#9CA3AF"
                value={voiceSearchQuery}
                onChangeText={setVoiceSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {voiceSearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setVoiceSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearSearchText}>CLEAR</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Scrollable Voice List inside Sheet */}
            <ScrollView
              style={styles.sheetScrollList}
              contentContainerStyle={styles.sheetScrollListContent}
              showsVerticalScrollIndicator={true}
            >
              {isLoadingVoices ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={styles.loadingText}>Scanning device voices...</Text>
                </View>
              ) : (
                <>
                  {/* Default Native Option */}
                  {(!voiceSearchQuery ||
                    'system native default auto-enhanced'.includes(voiceSearchQuery.toLowerCase())) && (
                    <TouchableOpacity
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`System Auto-Enhanced Voice, ${!settings.voiceIdentifier ? 'selected' : 'not selected'}`}
                      onPress={() =>
                        handleSelectVoice({
                          identifier: 'default',
                          name: 'Iris Auto-Enhanced Default',
                          quality: 'Enhanced HD',
                          language: 'en-US',
                          isEnhanced: true,
                          isNeural: true,
                          badge: 'HD NEURAL',
                        })
                      }
                      style={[
                        styles.voiceCard,
                        !settings.voiceIdentifier
                          ? styles.voiceCardActive
                          : styles.voiceCardInactive,
                      ]}
                    >
                      <View style={styles.voiceCardLeft}>
                        <View
                          style={[
                            styles.voiceRadio,
                            !settings.voiceIdentifier && styles.voiceRadioActive,
                          ]}
                        >
                          {!settings.voiceIdentifier && (
                            <View style={styles.voiceRadioInner} />
                          )}
                        </View>
                        <View style={styles.voiceInfoCol}>
                          <View style={styles.voiceNameRow}>
                            <Text style={styles.voiceName}>Auto-Enhanced Default</Text>
                            <View style={styles.enhancedBadge}>
                              <Text style={styles.enhancedBadgeText}>⚡ BEST HD</Text>
                            </View>
                          </View>
                          <Text style={styles.voiceSubtext}>
                            Auto-selects highest quality on-device neural voice
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Preview system native voice"
                        onPress={() =>
                          handlePreviewVoice({
                            identifier: 'default',
                            name: 'Auto-Enhanced Default',
                            quality: 'Enhanced HD',
                            language: 'en-US',
                            isEnhanced: true,
                            isNeural: true,
                          })
                        }
                        style={styles.previewButton}
                      >
                        {previewingVoiceId === 'default' ? (
                          <ActivityIndicator size={12} color="#0A0E11" />
                        ) : (
                          <Play size={12} color="#0A0E11" />
                        )}
                        <Text style={styles.previewButtonText}>PREVIEW</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}

                  {/* Dynamic Available Voices */}
                  {filteredVoices.map((voice) => {
                    const isSelected = settings.voiceIdentifier === voice.identifier;
                    const isPreviewing = previewingVoiceId === voice.identifier;

                    return (
                      <TouchableOpacity
                        key={voice.identifier}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`${voice.name} voice, ${voice.language}, ${isSelected ? 'selected' : 'not selected'}`}
                        onPress={() => handleSelectVoice(voice)}
                        style={[
                          styles.voiceCard,
                          isSelected
                            ? styles.voiceCardActive
                            : styles.voiceCardInactive,
                        ]}
                      >
                        <View style={styles.voiceCardLeft}>
                          <View
                            style={[
                              styles.voiceRadio,
                              isSelected && styles.voiceRadioActive,
                            ]}
                          >
                            {isSelected && <View style={styles.voiceRadioInner} />}
                          </View>
                          <View style={styles.voiceInfoCol}>
                            <View style={styles.voiceNameRow}>
                              <Text
                                style={[
                                  styles.voiceName,
                                  isSelected && styles.voiceNameActive,
                                ]}
                                numberOfLines={1}
                              >
                                {voice.name}
                              </Text>
                              <View style={styles.languageBadge}>
                                <Text style={styles.languageBadgeText}>
                                  {voice.language.toUpperCase()}
                                </Text>
                              </View>
                              {voice.badge === 'HD NEURAL' && (
                                <View style={styles.enhancedBadge}>
                                  <Text style={styles.enhancedBadgeText}>⚡ HD NEURAL</Text>
                                </View>
                              )}
                              {voice.badge === 'STUDIO' && (
                                <View style={styles.studioBadge}>
                                  <Text style={styles.studioBadgeText}>STUDIO</Text>
                                </View>
                              )}
                              {voice.badge === 'NATURAL' && (
                                <View style={styles.naturalBadge}>
                                  <Text style={styles.naturalBadgeText}>NATURAL</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.voiceIdText} numberOfLines={1}>
                              {voice.identifier}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          accessible={true}
                          accessibilityRole="button"
                          accessibilityLabel={`Preview ${voice.name} voice`}
                          onPress={() => handlePreviewVoice(voice)}
                          style={styles.previewButton}
                        >
                          {isPreviewing ? (
                            <ActivityIndicator size={12} color="#0A0E11" />
                          ) : (
                            <Play size={12} color="#0A0E11" />
                          )}
                          <Text style={styles.previewButtonText}>PREVIEW</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}

                  {filteredVoices.length === 0 && (
                    <View style={styles.emptyVoicesBox}>
                      <Text style={styles.emptyVoicesText}>
                        No voices found matching "{voiceSearchQuery}".
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Bottom Sheet Apply Button */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Apply voice selection and close"
                onPress={handleCloseVoiceModal}
                style={styles.sheetApplyButton}
              >
                <Check size={16} color="#0A0E11" />
                <Text style={styles.sheetApplyButtonText}>APPLY & CLOSE</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF', // High-contrast clean white surface
    borderWidth: 2,
    borderColor: '#0A0E11',
    borderTopWidth: 5,
    borderRadius: 4,
    padding: 18,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#525252',
    marginBottom: 14,
    lineHeight: 18,
  },

  // Active Voice Hero Card (Settings Page)
  activeVoiceHeroCard: {
    backgroundColor: '#FFF7F5',
    borderWidth: 2,
    borderColor: '#0A0E11',
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    borderRadius: 4,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  activeVoiceHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeVoiceIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#FFF0ED',
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeVoiceHeroInfo: {
    flex: 1,
  },
  activeVoiceHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  activeVoiceHeroName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0A0E11',
  },
  activeVoiceHeroSubtitle: {
    fontSize: 11,
    color: '#737373',
    fontWeight: '600',
    marginTop: 2,
  },
  activeVoiceHeroActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    paddingTop: 10,
  },
  heroPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0A0E11',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 3,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  heroPreviewButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.5,
  },
  switchVoiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: '#0A0E11',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 3,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  switchVoiceButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.8,
  },

  masterTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: '#0A0E11',
    paddingVertical: 11,
    borderRadius: 3,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  masterTestButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.8,
  },

  // Pitch Grid
  rateGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 3,
    borderWidth: 2,
  },
  rateButtonActive: {
    backgroundColor: colors.droneTech,
    borderColor: '#0A0E11',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  rateButtonInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E5E5',
  },
  pitchButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 3,
    borderWidth: 2,
  },
  pitchButtonActive: {
    backgroundColor: colors.engineering,
    borderColor: '#0A0E11',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  pitchButtonInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E5E5',
  },
  rateButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  rateButtonTextActive: {
    color: '#FFFFFF',
  },
  rateButtonTextInactive: {
    color: '#171717',
  },
  rateButtonSubtext: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  rateButtonSubtextActive: {
    color: '#FFFFFF',
  },
  rateButtonSubtextInactive: {
    color: '#737373',
  },
  pitchSubtextActive: {
    color: '#FFFFFF',
  },

  // Description Mode
  verbosityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  verbosityButton: {
    flex: 1,
    padding: 14,
    borderRadius: 3,
    borderWidth: 2,
  },
  verbosityButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0A0E11',
    borderTopWidth: 4,
    borderTopColor: colors.foundations,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  verbosityButtonInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E5E5',
  },
  verbosityTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#171717',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  verbosityTitleActive: {
    color: '#0A0E11',
  },
  verbosityDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: '#525252',
    fontWeight: '600',
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#171717',
  },
  toggleSubtext: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
    lineHeight: 16,
  },

  // Server Box
  serverInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#171717',
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: '#0A0E11',
    marginBottom: 12,
  },
  serverActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 3,
    backgroundColor: '#E5E5E5',
    borderWidth: 2,
    borderColor: '#0A0E11',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  testButtonText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#0A0E11',
  },
  saveServerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 3,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#0A0E11',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  saveServerButtonText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#0A0E11',
  },
  statusBoxSuccess: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: colors.safe,
    borderRadius: 3,
  },
  testSuccessText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  statusBoxError: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: colors.hazardHigh,
    borderRadius: 3,
  },
  testErrorText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B91C1C',
    letterSpacing: 0.5,
  },

  // =========================================================================
  // BOTTOM SHEET MODAL STYLES
  // =========================================================================
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 17, 0.75)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 2,
    borderColor: '#0A0E11',
    borderTopWidth: 6,
    borderTopColor: colors.primary,
    maxHeight: '84%',
    paddingBottom: 24,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    marginTop: 10,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.8,
  },
  sheetSubtitle: {
    fontSize: 11,
    color: '#737373',
    fontWeight: '600',
    marginTop: 1,
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#0A0E11',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFilterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  filterChipActive: {
    backgroundColor: '#0A0E11',
    borderColor: '#0A0E11',
  },
  filterChipInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E5E5',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextInactive: {
    color: '#525252',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 18,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#171717',
    padding: 0,
  },
  clearSearchText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  sheetScrollList: {
    maxHeight: 340,
    paddingHorizontal: 18,
  },
  sheetScrollListContent: {
    gap: 8,
    paddingBottom: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#737373',
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 3,
    borderWidth: 2,
  },
  voiceCardActive: {
    backgroundColor: '#FFF7F5',
    borderColor: colors.primary,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  voiceCardInactive: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E5E5',
  },
  voiceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  voiceRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceRadioActive: {
    borderColor: colors.primary,
  },
  voiceRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  voiceInfoCol: {
    flex: 1,
  },
  voiceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  voiceName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#171717',
  },
  voiceNameActive: {
    color: '#0A0E11',
    fontWeight: '900',
  },
  badgeAuto: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  badgeAutoText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3730A3',
  },
  languageBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
  },
  languageBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4B5563',
  },
  enhancedBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: colors.safe,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  enhancedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.3,
  },
  studioBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  studioBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: 0.3,
  },
  naturalBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D97706',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  naturalBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.3,
  },
  voiceGuideBanner: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1.5,
    borderColor: '#0A0E11',
    borderRadius: 3,
    padding: 10,
    marginHorizontal: 18,
    marginBottom: 8,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  voiceGuideBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceGuideBannerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.4,
  },
  voiceGuideBannerBody: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EAB308',
  },
  voiceGuideText: {
    fontSize: 11,
    color: '#451A03',
    lineHeight: 16,
  },
  voiceSubtext: {
    fontSize: 10,
    color: '#737373',
    marginTop: 2,
    fontWeight: '600',
  },
  voiceIdText: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0A0E11',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 3,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  previewButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.5,
  },
  emptyVoicesBox: {
    padding: 16,
    alignItems: 'center',
  },
  emptyVoicesText: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '600',
  },
  sheetFooter: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  sheetApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#0A0E11',
    paddingVertical: 12,
    borderRadius: 3,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  sheetApplyButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.8,
  },
});
