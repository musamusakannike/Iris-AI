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
    isGeminiLiveStreaming,
    liveStreamingTranscript,
    appendLiveStreamingTranscript,
    clearLiveStreamingTranscript,
    toggleLiveScanning,
    torchOn,
    toggleTorch,
    currentDescription,
    setCurrentDescription,
    clearCurrentDescription,
    speakDescription,
    stopSpeaking,
  } = useIrisStore();

  // Announce welcome message on mount and connect WebSocket
  useEffect(() => {
    irisWebSocket.connect();
    speechService.announce(
      'Welcome to IRIS AI. Camera is active with Gemini Live. Tap Describe or turn on Live for continuous spatial guidance.'
    );
  }, []);

  // Listen to WebSocket AI descriptions, streaming chunks, and hazard alerts
  useEffect(() => {
    const unsubscribe = irisWebSocket.subscribe({
      onTranscriptionChunk: (chunk, fullText) => {
        appendLiveStreamingTranscript(chunk, fullText);
        setIsProcessing(false);
      },
      onDescription: (data) => {
        setCurrentDescription(data);
        clearLiveStreamingTranscript();
        setIsProcessing(false);
      },
      onHazardAlert: () => {
        hapticService.warning();
      },
      onInterrupted: () => {
        stopSpeaking();
        clearLiveStreamingTranscript();
        hapticService.tap();
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Continuous Gemini Live Scan Loop (1 FPS as specified by Live API)
  useEffect(() => {
    if (isLiveScanning) {
      const runContinuousScan = async () => {
        if (isProcessing) return;
        try {
          await captureAndAnalyze(activeMode, undefined, true);
        } catch {}
      };

      runContinuousScan();
      liveScanTimerRef.current = setInterval(runContinuousScan, 1200);
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

        if (query && irisWebSocket.getStatus() === 'connected') {
          irisWebSocket.sendVoiceQuery(base64Data, query, mode);
          return;
        }

        if (isStream && irisWebSocket.getStatus() === 'connected') {
          irisWebSocket.sendFrame(base64Data, mode);
          return;
        }

        // Send via REST API fallback
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

        {/* Technical Viewfinder Corner Accents (Academy Industrial Aesthetic) */}
        <View style={styles.viewfinderOverlay} pointerEvents="none">
          <View style={[styles.cornerBracket, styles.cornerTL]} />
          <View style={[styles.cornerBracket, styles.cornerTR]} />
          <View style={[styles.cornerBracket, styles.cornerBL]} />
          <View style={[styles.cornerBracket, styles.cornerBR]} />
        </View>
      </Pressable>

      {/* Top HUD: Academy Tech Bar + Actions + Mode Selector */}
      <SafeAreaView style={styles.topHudContainer} edges={['top']}>
        {/* Technical Ruler Ticks Line */}
        <View style={styles.rulerBar}>
          <View style={styles.rulerTicksRow}>
            {[...Array(24)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.rulerTick,
                  i % 4 === 0 ? styles.rulerTickMajor : styles.rulerTickMinor,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Main Top Action Header */}
        <View style={styles.topBar}>
          {/* Logo & Hub Status Badge */}
          <View style={styles.logoRow}>
            <View style={styles.statusIndicator}>
              <Text style={styles.logoText}>IRIS</Text>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>AI</Text>
              </View>
            </View>
            {isLiveScanning && (
              <View style={styles.liveBadge}>
                <Radio size={10} color="#FFFFFF" />
                <Text style={styles.liveBadgeText}>GEMINI LIVE</Text>
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
              style={[styles.hudButton, torchOn && styles.hudButtonActive]}
            >
              {torchOn ? (
                <Flashlight size={18} color="#0A0E11" />
              ) : (
                <FlashlightOff size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="How to use guide"
              accessibilityHint="Opens voice-narrated tutorial"
              onPress={() => router.push('/guide')}
              style={styles.hudButton}
            >
              <HelpCircle size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Scan history"
              accessibilityHint="View past descriptions and questions"
              onPress={() => router.push('/history')}
              style={styles.hudButton}
            >
              <History size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              accessibilityHint="Adjust speech speed and accessibility preferences"
              onPress={() => router.push('/settings')}
              style={styles.hudButton}
            >
              <Settings size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Mode Selector (Category Pills) */}
        <ModeSelector activeMode={activeMode} onSelectMode={setActiveMode} />
      </SafeAreaView>

      {/* Center/Bottom Overlay Deck */}
      <View style={styles.bottomDeck}>
        {/* Floating Spoken Subtitle Banner */}
        <SpeechBanner
          description={currentDescription}
          liveStreamingText={liveStreamingTranscript}
          isLiveStreaming={isLiveScanning && isGeminiLiveStreaming}
          activeMode={activeMode}
          onReplay={() => {
            if (currentDescription?.spokenSummary) {
              speakDescription(currentDescription.spokenSummary);
            }
          }}
          onClose={() => {
            clearCurrentDescription();
            clearLiveStreamingTranscript();
          }}
        />

        {/* Primary Controls Row */}
        <SafeAreaView edges={['bottom']} style={styles.controlsRow}>
          {/* Continuous Gemini Live Scan Toggle */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Gemini live scan: ${isLiveScanning ? 'active' : 'inactive'}`}
            accessibilityHint="Continuously streams camera and voice with Gemini Live"
            activeOpacity={0.8}
            onPress={toggleLiveScanning}
            style={[
              styles.auxButton,
              isLiveScanning ? styles.liveButtonActive : styles.liveButtonInactive,
            ]}
          >
            <Radio
              size={18}
              color={isLiveScanning ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.auxText,
                isLiveScanning ? { color: '#FFFFFF' } : { color: colors.textSecondary },
              ]}
            >
              {isLiveScanning ? 'LIVE ON' : 'GEMINI LIVE'}
            </Text>
          </TouchableOpacity>

          {/* Giant Describe Scene Button (A1 Academy Primary CTA) */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Describe scene right now"
            accessibilityHint="Analyzes the camera view and speaks out loud"
            activeOpacity={0.85}
            onPress={handleDescribePress}
            disabled={isProcessing}
            style={[
              styles.mainDescribeButton,
              isProcessing && styles.mainDescribeButtonProcessing,
            ]}
          >
            <VoicePulseIndicator state={aiState} size={48} />
            <View style={styles.describeTextColumn}>
              <Text style={styles.mainDescribeTitle}>
                {isProcessing ? 'ANALYZING...' : 'DESCRIBE SCENE'}
              </Text>
              <Text style={styles.mainDescribeSubtitle}>
                {activeMode.toUpperCase()} • TAP TO HEAR
              </Text>
            </View>
          </TouchableOpacity>

          {/* Ask Iris Voice Mic Button */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Stop listening' : 'Ask Iris voice question'}
            accessibilityHint="Speak a question about what is in front of you"
            activeOpacity={0.8}
            onPress={handleMicPress}
            style={[
              styles.auxButton,
              isListening ? styles.micButtonActive : styles.micButtonInactive,
            ]}
          >
            <Mic
              size={20}
              color={isListening ? '#0A0E11' : colors.primary}
            />
            <Text
              style={[
                styles.auxText,
                isListening ? { color: '#0A0E11' } : { color: colors.primary },
              ]}
            >
              {isListening ? 'LISTENING' : 'ASK VOICE'}
            </Text>
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
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  permissionDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
  },
  viewfinderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    justifyContent: 'space-between',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 140,
    left: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 140,
    right: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 180,
    left: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 180,
    right: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  topHudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  rulerBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#0A0E11',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 99, 78, 0.4)',
  },
  rulerTicksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rulerTick: {
    backgroundColor: colors.primary,
  },
  rulerTickMajor: {
    width: 2,
    height: 8,
  },
  rulerTickMinor: {
    width: 1,
    height: 4,
    opacity: 0.7,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#0A0E11',
    borderWidth: 2,
    borderColor: '#2C3742',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  logoBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
  },
  logoBadgeText: {
    color: '#0A0E11',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.safe,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudButton: {
    width: 36,
    height: 36,
    borderRadius: 3,
    backgroundColor: '#181F26',
    borderWidth: 1.5,
    borderColor: '#2C3742',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#0A0E11',
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
  mainDescribeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 4,
    backgroundColor: colors.primary, // A1 Primary coral
    borderWidth: 2.5,
    borderColor: '#0A0E11',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    gap: 10,
    minHeight: 68,
  },
  mainDescribeButtonProcessing: {
    backgroundColor: colors.primaryDark,
  },
  describeTextColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  mainDescribeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0A0E11', // A1 contrast black text on primary
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mainDescribeSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#381611',
    marginTop: 2,
    letterSpacing: 0.6,
  },
  auxButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0A0E11',
    gap: 4,
    minWidth: 68,
    minHeight: 68,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  liveButtonInactive: {
    backgroundColor: '#181F26',
    borderColor: '#2C3742',
  },
  liveButtonActive: {
    backgroundColor: colors.safe,
    borderColor: '#0A0E11',
  },
  micButtonInactive: {
    backgroundColor: '#181F26',
    borderColor: '#2C3742',
  },
  micButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#0A0E11',
  },
  auxText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

