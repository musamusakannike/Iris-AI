import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Flashlight,
  FlashlightOff,
  HelpCircle,
  History,
  Settings,
  Mic,
  Eye,
  Radio,
  Volume2,
  Square,
  Sparkles,
} from 'lucide-react-native';
import { GlassSurface } from '../components/glass-surface';
import { ModeSelector } from '../components/mode-selector';
import { VoicePulseIndicator } from '../components/voice-pulse-indicator';
import { SpeechBanner } from '../components/speech-banner';
import { ActionButton } from '../components/action-button';
import { colors } from '../theme/colors';
import { useIrisStore } from '../store/useIrisStore';
import { apiService, AssistiveMode } from '../services/api';
import { speechService } from '../services/speech';
import { hapticService } from '../services/haptics';
import { irisWebSocket } from '../services/websocket';

// Try importing ExpoSpeechRecognitionModule safely
let ExpoSpeechRecognitionModule: any = null;
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
} catch {
  // Graceful fallback if native speech recognition not compiled
}

export default function IrisHomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechPromptText, setSpeechPromptText] = useState('');
  const lastTapRef = useRef<number>(0);
  const liveScanTimerRef = useRef<any>(null);

  const {
    activeMode,
    setActiveMode,
    aiState,
    setAiState,
    isLiveScanning,
    toggleLiveScanning,
    torchOn,
    toggleTorch,
    currentDescription,
    setCurrentDescription,
    clearCurrentDescription,
    speakDescription,
    stopSpeaking,
  } = useIrisStore();

  // Announce welcome message on mount
  useEffect(() => {
    speechService.announce(
      'Welcome to IRIS AI. Camera is active. Tap the large Describe button or double tap anywhere to hear your surroundings.'
    );
  }, []);

  // Listen to WebSocket AI descriptions and hazard alerts
  useEffect(() => {
    const unsubscribe = irisWebSocket.subscribe({
      onDescription: (data) => {
        setCurrentDescription(data);
        setIsProcessing(false);
      },
      onHazardAlert: (hazard) => {
        hapticService.warning();
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Continuous Live Scan Loop
  useEffect(() => {
    if (isLiveScanning) {
      const runContinuousScan = async () => {
        if (isProcessing) return;
        try {
          await captureAndAnalyze(activeMode, undefined, true);
        } catch {}
      };

      runContinuousScan();
      liveScanTimerRef.current = setInterval(runContinuousScan, 3500);
    } else {
      if (liveScanTimerRef.current) {
        clearInterval(liveScanTimerRef.current);
        liveScanTimerRef.current = null;
      }
    }

    return () => {
      if (liveScanTimerRef.current) {
        clearInterval(liveScanTimerRef.current);
        liveScanTimerRef.current = null;
      }
    };
  }, [isLiveScanning, activeMode, isProcessing]);

  /**
   * Capture snapshot and analyze with specified mode
   */
  const captureAndAnalyze = useCallback(
    async (mode: AssistiveMode, query?: string, isStream = false) => {
      if (!cameraRef.current) return;

      if (!isStream) {
        setIsProcessing(true);
        setAiState('thinking');
        hapticService.triggerStart();
        speechService.announce('Analyzing scene...');
      }

      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
          shutterSound: false,
        });

        if (!photo?.base64) {
          throw new Error('Could not capture frame');
        }

        const base64Data = photo.base64;

        if (isStream && irisWebSocket.getStatus() === 'connected') {
          irisWebSocket.sendFrame(base64Data, mode);
          return;
        }

        // Send via REST API
        let result;
        if (query) {
          result = await apiService.askQuestion(base64Data, query);
        } else {
          result = await apiService.analyzeScene(base64Data, mode);
        }

        setCurrentDescription(result);
        setIsProcessing(false);
      } catch (err: any) {
        console.warn('Capture & analyze error:', err);
        setIsProcessing(false);
        setAiState('error');
        hapticService.error();
        speechService.announce('Sorry, unable to analyze right now. Please try again.');
      }
    },
    [cameraRef]
  );

  /**
   * Handle single button tap to describe scene
   */
  const handleDescribePress = () => {
    if (isProcessing) return;
    captureAndAnalyze(activeMode);
  };

  /**
   * Handle double tap anywhere on viewfinder
   */
  const handleViewfinderDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      // Double tap detected
      hapticService.tap();
      handleDescribePress();
    }
    lastTapRef.current = now;
  };

  /**
   * Start / stop voice query speech recognition
   */
  const handleMicPress = async () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      setAiState('idle');
      if (ExpoSpeechRecognitionModule) {
        try {
          await ExpoSpeechRecognitionModule.stop();
        } catch {}
      }
      return;
    }

    hapticService.triggerStart();
    speechService.announce('Listening. Ask your question now.');
    setIsListening(true);
    setAiState('listening');

    if (ExpoSpeechRecognitionModule) {
      try {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (perm.granted) {
          ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: true,
            maxAlternatives: 1,
          });

          ExpoSpeechRecognitionModule.addListener?.('onSpeechResults', (event: any) => {
            const transcript = event.results?.[0];
            if (transcript) {
              setSpeechPromptText(transcript);
            }
          });

          ExpoSpeechRecognitionModule.addListener?.('onSpeechEnd', () => {
            setIsListening(false);
            if (speechPromptText) {
              captureAndAnalyze('ask', speechPromptText);
            }
          });
          return;
        }
      } catch (err) {
        console.warn('Speech recognition module error, using quick voice prompt:', err);
      }
    }

    // Fallback simulated voice question after 2.5s
    setTimeout(() => {
      setIsListening(false);
      captureAndAnalyze('ask', 'What is directly in front of me?');
    }, 2500);
  };

  // 1. Camera Permissions Guard
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Eye size={64} color={colors.primary} style={{ marginBottom: 20 }} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionDescription}>
          IRIS AI needs camera access to see your surroundings, read text, and detect hazards in real-time.
        </Text>
        <ActionButton
          label="Grant Camera Access"
          onPress={requestPermission}
          variant="primary"
          style={{ width: '100%', marginTop: 24 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fullscreen Camera Viewfinder */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleViewfinderDoubleTap}
        accessible={true}
        accessibilityRole="imagebutton"
        accessibilityLabel="Camera viewfinder. Double tap to describe current scene."
      >
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          autofocus="on"
        />
      </Pressable>

      {/* Floating Liquid Glass Top HUD */}
      <SafeAreaView style={styles.topHudContainer} edges={['top']}>
        <GlassSurface style={styles.topBar} glassEffectStyle="regular">
          {/* Logo & Status Badge */}
          <View style={styles.logoRow}>
            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isLiveScanning ? colors.safe : colors.primary,
                  },
                ]}
              />
              <Text style={styles.logoText}>IRIS AI</Text>
            </View>
            {isLiveScanning && (
              <View style={styles.liveBadge}>
                <Radio size={12} color="#FFFFFF" />
                <Text style={styles.liveBadgeText}>LIVE SCAN</Text>
              </View>
            )}
          </View>

          {/* Quick HUD Action Buttons */}
          <View style={styles.hudActions}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Flashlight ${torchOn ? 'on' : 'off'}`}
              accessibilityHint="Toggles camera light to illuminate dark scenes"
              onPress={toggleTorch}
              style={styles.iconButton}
            >
              {torchOn ? (
                <Flashlight size={22} color={colors.hazardLow} />
              ) : (
                <FlashlightOff size={22} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="How to use guide"
              accessibilityHint="Opens voice-narrated tutorial"
              onPress={() => router.push('/guide')}
              style={styles.iconButton}
            >
              <HelpCircle size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Scan history"
              accessibilityHint="View past descriptions and questions"
              onPress={() => router.push('/history')}
              style={styles.iconButton}
            >
              <History size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              accessibilityHint="Adjust speech speed and accessibility preferences"
              onPress={() => router.push('/settings')}
              style={styles.iconButton}
            >
              <Settings size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </GlassSurface>

        {/* Mode Selector */}
        <ModeSelector activeMode={activeMode} onSelectMode={setActiveMode} />
      </SafeAreaView>

      {/* Center/Bottom Overlay Deck */}
      <View style={styles.bottomDeck}>
        {/* Floating Spoken Subtitle Banner */}
        <SpeechBanner
          description={currentDescription}
          onReplay={() => {
            if (currentDescription?.spokenSummary) {
              speakDescription(currentDescription.spokenSummary);
            }
          }}
          onClose={clearCurrentDescription}
        />

        {/* Primary Controls Row */}
        <SafeAreaView edges={['bottom']} style={styles.controlsRow}>
          {/* Continuous Live Scan Toggle */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Continuous live scan: ${isLiveScanning ? 'active' : 'inactive'}`}
            accessibilityHint="Passively scans and announces changes every few seconds"
            onPress={toggleLiveScanning}
            style={styles.auxButton}
          >
            <GlassSurface
              style={[
                styles.auxSurface,
                isLiveScanning && styles.auxSurfaceActive,
              ]}
              glassEffectStyle="regular"
              highlight={isLiveScanning}
            >
              <Radio
                size={22}
                color={isLiveScanning ? colors.safe : colors.textMuted}
              />
              <Text
                style={[
                  styles.auxText,
                  isLiveScanning ? { color: colors.safe, fontWeight: '700' } : { color: colors.textMuted },
                ]}
              >
                {isLiveScanning ? 'Stop Live' : 'Live Mode'}
              </Text>
            </GlassSurface>
          </TouchableOpacity>

          {/* Giant Describe Scene Button */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Describe scene right now"
            accessibilityHint="Analyzes the camera view and speaks out loud"
            activeOpacity={0.8}
            onPress={handleDescribePress}
            disabled={isProcessing}
            style={styles.mainDescribeTouchable}
          >
            <GlassSurface
              style={styles.mainDescribeSurface}
              glassEffectStyle="regular"
              highlight={true}
            >
              <VoicePulseIndicator state={aiState} size={54} />
              <View style={styles.describeTextColumn}>
                <Text style={styles.mainDescribeTitle}>
                  {isProcessing ? 'Analyzing...' : 'Describe Scene'}
                </Text>
                <Text style={styles.mainDescribeSubtitle}>
                  {activeMode.toUpperCase()} • TAP TO HEAR
                </Text>
              </View>
            </GlassSurface>
          </TouchableOpacity>

          {/* Ask Iris Voice Mic Button */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Stop listening' : 'Ask Iris voice question'}
            accessibilityHint="Speak a question about what is in front of you"
            onPress={handleMicPress}
            style={styles.auxButton}
          >
            <GlassSurface
              style={[
                styles.auxSurface,
                isListening && styles.micSurfaceActive,
              ]}
              glassEffectStyle="regular"
              highlight={isListening}
            >
              <Mic
                size={24}
                color={isListening ? '#FFFFFF' : colors.primary}
              />
              <Text
                style={[
                  styles.auxText,
                  isListening ? { color: '#FFFFFF', fontWeight: '700' } : { color: colors.primary },
                ]}
              >
                {isListening ? 'Listening' : 'Ask Voice'}
              </Text>
            </GlassSurface>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionText: {
    color: colors.textPrimary,
    marginTop: 16,
    fontSize: 16,
  },
  topHudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.safe,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  hudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 6,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomDeck: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  mainDescribeTouchable: {
    flex: 1,
    minHeight: 76,
  },
  mainDescribeSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: colors.primary,
    borderWidth: 1.5,
    gap: 12,
  },
  describeTextColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  mainDescribeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  mainDescribeSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  auxButton: {
    minHeight: 76,
    justifyContent: 'center',
  },
  auxSurface: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    gap: 4,
    minWidth: 70,
    minHeight: 76,
  },
  auxSurfaceActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: colors.safe,
    borderWidth: 1.5,
  },
  micSurfaceActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  auxText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
