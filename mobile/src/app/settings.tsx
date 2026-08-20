import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Volume2,
  Sliders,
  ShieldAlert,
  Server,
  Zap,
  Check,
  RefreshCw,
} from 'lucide-react-native';
import { GlassSurface } from '../components/glass-surface';
import { ActionButton } from '../components/action-button';
import { colors } from '../theme/colors';
import { useIrisStore } from '../store/useIrisStore';
import { speechService } from '../services/speech';
import { hapticService } from '../services/haptics';
import { setApiBaseUrl, getApiBaseUrl } from '../services/api';
import { setWsUrl, irisWebSocket } from '../services/websocket';

const SPEECH_RATES = [
  { label: '0.8x', value: 0.8, description: 'Slower' },
  { label: '1.0x', value: 1.0, description: 'Normal' },
  { label: '1.25x', value: 1.25, description: 'Fast' },
  { label: '1.5x', value: 1.5, description: 'Very Fast' },
];

export default function SettingsScreen() {
  const { settings, updateSettings } = useIrisStore();
  const [serverHost, setServerHost] = useState(
    getApiBaseUrl().replace('/api/v1', '')
  );
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    speechService.announce('Preferences and accessibility settings screen.');
  }, []);

  const handleRateChange = (rate: number) => {
    hapticService.selection();
    updateSettings({ speechRate: rate });
    speechService.speak(`Speech speed set to ${rate}x`, { rate });
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Speech Speed Setting */}
        <GlassSurface style={styles.sectionCard} glassEffectStyle="regular">
          <View style={styles.sectionHeader}>
            <Volume2 size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Speech Speed</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose how fast IRIS speaks descriptions aloud
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
                    isSelected && styles.rateButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rateButtonText,
                      isSelected && styles.rateButtonTextActive,
                    ]}
                  >
                    {rate.label}
                  </Text>
                  <Text
                    style={[
                      styles.rateButtonSubtext,
                      isSelected && styles.rateButtonSubtextActive,
                    ]}
                  >
                    {rate.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassSurface>

        {/* Verbosity Mode */}
        <GlassSurface style={styles.sectionCard} glassEffectStyle="regular">
          <View style={styles.sectionHeader}>
            <Sliders size={20} color="#A855F7" />
            <Text style={styles.sectionTitle}>Description Style</Text>
          </View>

          <View style={styles.verbosityRow}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Concise mode, ${settings.verbosity === 'concise' ? 'selected' : 'not selected'}`}
              accessibilityHint="Gives punchy 1-2 sentence direct audio descriptions"
              onPress={() => handleVerbosityChange('concise')}
              style={[
                styles.verbosityButton,
                settings.verbosity === 'concise' && styles.verbosityButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.verbosityTitle,
                  settings.verbosity === 'concise' && styles.verbosityTitleActive,
                ]}
              >
                Concise
              </Text>
              <Text style={styles.verbosityDesc}>
                Quick direct summaries for fast walking
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
                settings.verbosity === 'detailed' && styles.verbosityButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.verbosityTitle,
                  settings.verbosity === 'detailed' && styles.verbosityTitleActive,
                ]}
              >
                Detailed
              </Text>
              <Text style={styles.verbosityDesc}>
                Full spatial breakdown & distances
              </Text>
            </TouchableOpacity>
          </View>
        </GlassSurface>

        {/* Safety & Hazard Alerts */}
        <GlassSurface style={styles.sectionCard} glassEffectStyle="regular">
          <View style={styles.sectionHeader}>
            <ShieldAlert size={20} color={colors.hazardHigh} />
            <Text style={styles.sectionTitle}>Safety & Hazard Alerts</Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleLabel}>Hazard Vibration</Text>
              <Text style={styles.toggleSubtext}>
                Vibrate phone when stairs, drops, or obstacles are in path
              </Text>
            </View>
            <Switch
              value={settings.hazardVibration}
              onValueChange={handleToggleHazardVibration}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.toggleRow, { marginTop: 16 }]}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleLabel}>Auditory Warning Beep</Text>
              <Text style={styles.toggleSubtext}>
                Play urgent spoken hazard alert
              </Text>
            </View>
            <Switch
              value={settings.hazardAlertSound}
              onValueChange={handleToggleHazardSound}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </GlassSurface>

        {/* Server & Engine Connection */}
        <GlassSurface style={styles.sectionCard} glassEffectStyle="regular">
          <View style={styles.sectionHeader}>
            <Server size={20} color="#38BDF8" />
            <Text style={styles.sectionTitle}>Backend Server Connection</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Connect mobile app to your Express + MongoDB server
          </Text>

          <TextInput
            style={styles.serverInput}
            value={serverHost}
            onChangeText={setServerHost}
            placeholder="http://localhost:5000"
            placeholderTextColor={colors.textMuted}
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
              <RefreshCw size={14} color={colors.primary} />
              <Text style={styles.testButtonText}>
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Save server address"
              onPress={handleSaveServerHost}
              style={styles.saveServerButton}
            >
              <Check size={14} color="#FFFFFF" />
              <Text style={styles.saveServerButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {testSuccess === true && (
            <Text style={styles.testSuccessText}>
              ✓ Connected successfully to IRIS backend engine
            </Text>
          )}
          {testSuccess === false && (
            <Text style={styles.testErrorText}>
              ✕ Could not reach server. Offline fallback is active.
            </Text>
          )}
        </GlassSurface>
      </ScrollView>
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
    gap: 14,
  },
  sectionCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  rateGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rateButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: colors.primary,
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rateButtonTextActive: {
    color: colors.primary,
  },
  rateButtonSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  rateButtonSubtextActive: {
    color: colors.primary,
  },
  verbosityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  verbosityButton: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  verbosityButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#A855F7',
  },
  verbosityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  verbosityTitleActive: {
    color: '#A855F7',
  },
  verbosityDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toggleSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  serverInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 12,
  },
  serverActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  saveServerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  saveServerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  testSuccessText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.safe,
  },
  testErrorText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.hazardHigh,
  },
});
