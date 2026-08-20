import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
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
} from 'lucide-react-native';
import { colors, brutalistShadow } from '../theme/colors';
import { useIrisStore } from '../store/useIrisStore';
import { speechService } from '../services/speech';
import { hapticService } from '../services/haptics';
import { setApiBaseUrl, getApiBaseUrl } from '../services/api';
import { setWsUrl, irisWebSocket } from '../services/websocket';

const SPEECH_RATES = [
  { label: '0.8x', value: 0.8, description: 'SLOWER' },
  { label: '1.0x', value: 1.0, description: 'NORMAL' },
  { label: '1.25x', value: 1.25, description: 'FAST' },
  { label: '1.5x', value: 1.5, description: 'VERY FAST' },
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
        <View style={[styles.sectionCard, { borderTopColor: colors.primary }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
              <Volume2 size={16} color="#0A0E11" />
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
        <View style={[styles.sectionCard, { borderTopColor: colors.engineering }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.engineering }]}>
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
        <View style={[styles.sectionCard, { borderTopColor: colors.droneTech }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.droneTech }]}>
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
    marginBottom: 16,
    lineHeight: 18,
  },
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
    backgroundColor: colors.primary,
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
  rateButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  rateButtonTextActive: {
    color: '#0A0E11',
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
    color: '#381611',
  },
  rateButtonSubtextInactive: {
    color: '#737373',
  },
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
    borderTopColor: colors.engineering,
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
});

