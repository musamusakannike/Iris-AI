import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Host, Button, Column, Text as UIText } from "@expo/ui";
import { MenuView } from "@expo/ui/community/menu";
import { Image } from "expo-image";
import { GlassSurface } from "../components/glass-surface";
import { ModeSelector } from "../components/mode-selector";
import { colors } from "../theme/colors";
import { useIrisStore } from "../store/useIrisStore";
import { apiService, AssistiveMode } from "../services/api";
import { speechService } from "../services/speech";
import { hapticService } from "../services/haptics";
import { irisWebSocket } from "../services/websocket";

let ExpoSpeechRecognitionModule: any = null;
try {
  const mod = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
} catch {
  // native speech recognition optional
}

const CIRCLE_BG = "rgba(255,255,255,0.08)";
const CIRCLE_BORDER = "rgba(255,255,255,0.22)";

/* ---------- Small building blocks ---------- */

function Icon({
  name,
  size = 22,
  tint = "#FFFFFF",
}: {
  name: string;
  size?: number;
  tint?: string;
}) {
  return (
    <Image
      source={`sf:${name}`}
      style={{ width: size, height: size }}
      tintColor={tint}
    />
  );
}

function IconButton({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? "rgba(255,255,255,0.16)" : "transparent",
      })}
    >
      <Icon name={icon} tint={tint} />
    </Pressable>
  );
}

function ActionCircle({
  icon,
  label,
  active,
  activeColor,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  icon: string;
  label: string;
  active?: boolean;
  activeColor: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        gap: 6,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? activeColor : CIRCLE_BG,
          borderWidth: 1,
          borderColor: active ? activeColor : CIRCLE_BORDER,
        }}
      >
        <Icon name={icon} size={26} tint={active ? "#000000" : "#FFFFFF"} />
      </View>
      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- Screen ---------- */

const MENU_ACTIONS = [
  { id: "guide", title: "How to use", image: "questionmark.circle" },
  { id: "history", title: "History", image: "clock.arrow.circlepath" },
  { id: "settings", title: "Settings", image: "gearshape" },
] as const;

export default function IrisHomeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const speechTextRef = useRef("");
  const lastTapRef = useRef<number>(0);
  const liveScanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    activeMode,
    setActiveMode,
    aiState,
    setAiState,
    isLiveScanning,
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

  useEffect(() => {
    irisWebSocket.connect();
    speechService.announce(
      "Welcome to IRIS AI. Tap Describe, or turn on Live for continuous guidance.",
    );
  }, []);

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

  // Speech recognition listeners: registered once, cleaned up on unmount
  useEffect(() => {
    if (!ExpoSpeechRecognitionModule?.addListener) return;
    const subs = [
      ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
        const transcript = event?.results?.[0]?.transcript;
        if (transcript) speechTextRef.current = transcript;
      }),
      ExpoSpeechRecognitionModule.addListener("end", () => {
        setIsListening(false);
        const text = speechTextRef.current.trim();
        speechTextRef.current = "";
        if (text) captureAndAnalyze("ask", text);
        else setAiState("idle");
      }),
    ];
    return () => subs.forEach((s: any) => s?.remove?.());
  }, []);

  const captureAndAnalyze = useCallback(
    async (mode: AssistiveMode, query?: string, isStream = false) => {
      if (!cameraRef.current) return;

      if (!isStream) {
        setIsProcessing(true);
        setAiState("thinking");
        hapticService.triggerStart();
        speechService.announce("Analyzing scene...");
      }

      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
          shutterSound: false,
        });

        if (!photo?.base64) throw new Error("Could not capture frame");
        const base64Data = photo.base64;

        if (query && irisWebSocket.getStatus() === "connected") {
          irisWebSocket.sendVoiceQuery(base64Data, query, mode);
          return;
        }

        if (isStream && irisWebSocket.getStatus() === "connected") {
          irisWebSocket.sendFrame(base64Data, mode);
          return;
        }

        const result = query
          ? await apiService.askQuestion(base64Data, query)
          : await apiService.analyzeScene(base64Data, mode);

        setCurrentDescription(result);
        setIsProcessing(false);
      } catch (err) {
        console.warn("Capture & analyze error:", err);
        setIsProcessing(false);
        setAiState("error");
        hapticService.error();
        speechService.announce(
          "Sorry, unable to analyze right now. Please try again.",
        );
      }
    },
    [],
  );

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
    } else if (liveScanTimerRef.current) {
      clearInterval(liveScanTimerRef.current);
      liveScanTimerRef.current = null;
    }

    return () => {
      if (liveScanTimerRef.current) {
        clearInterval(liveScanTimerRef.current);
        liveScanTimerRef.current = null;
      }
    };
  }, [isLiveScanning, activeMode, isProcessing, captureAndAnalyze]);

  const handleDescribePress = () => {
    if (isProcessing) return;
    captureAndAnalyze(activeMode);
  };

  const handleViewfinderDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      hapticService.tap();
      handleDescribePress();
    }
    lastTapRef.current = now;
  };

  const handleMicPress = async () => {
    if (isListening) {
      setIsListening(false);
      setAiState("idle");
      try {
        await ExpoSpeechRecognitionModule?.stop();
      } catch {}
      return;
    }

    hapticService.triggerStart();
    speechService.announce("Listening. Ask your question now.");
    setIsListening(true);
    setAiState("listening");
    speechTextRef.current = "";

    if (ExpoSpeechRecognitionModule) {
      try {
        const perm =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (perm.granted) {
          ExpoSpeechRecognitionModule.start({
            lang: "en-US",
            interimResults: true,
            maxAlternatives: 1,
          });
          return;
        }
      } catch (err) {
        console.warn(
          "Speech recognition module error, using quick voice prompt:",
          err,
        );
      }
    }

    setTimeout(() => {
      setIsListening(false);
      captureAndAnalyze("ask", "What is directly in front of me?");
    }, 2500);
  };

  if (!permission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.systemBackground,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.systemBackground,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Host matchContents>
          <Column>
            <UIText
              textStyle={{
                fontSize: 28,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Camera Access Needed
            </UIText>
            <UIText
              textStyle={{
                fontSize: 16,
                textAlign: "center",
                color: "#8E8E93",
              }}
            >
              IRIS needs the camera to describe surroundings, read text, and
              detect hazards.
            </UIText>
            <Button
              label="Grant Camera Access"
              variant="filled"
              onPress={requestPermission}
            />
          </Column>
        </Host>
      </SafeAreaView>
    );
  }

  const bannerText =
    isLiveScanning && liveStreamingTranscript
      ? liveStreamingTranscript
      : currentDescription?.spokenSummary;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Camera */}
      <Pressable
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={handleViewfinderDoubleTap}
        accessible
        accessibilityRole="imagebutton"
        accessibilityLabel="Camera viewfinder. Double tap to describe current scene."
      >
        <CameraView
          ref={cameraRef}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          enableTorch={torchOn}
          autofocus="on"
        />
      </Pressable>

      {/* Top area */}
      <SafeAreaView
        pointerEvents="box-none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}
      >
        <GlassSurface
          isInteractive
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#FFFFFF",
                letterSpacing: 1,
              }}
            >
              IRIS
            </Text>
            {isLiveScanning ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.systemGreen,
                  }}
                />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                  }}
                >
                  LIVE
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <IconButton
              icon={torchOn ? "flashlight.on.fill" : "flashlight.off.fill"}
              label={`Flashlight ${torchOn ? "on" : "off"}`}
              tint={torchOn ? (colors.accent as string) : "#FFFFFF"}
              onPress={toggleTorch}
            />
            <MenuView
              actions={[...MENU_ACTIONS]}
              onPressAction={({ nativeEvent }) => {
                const id = nativeEvent.event;
                if (id === "guide") router.push("/guide");
                else if (id === "history") router.push("/history");
                else if (id === "settings") router.push("/settings");
              }}
            >
              <View
                accessibilityRole="button"
                accessibilityLabel="Open menu"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="ellipsis" />
              </View>
            </MenuView>
          </View>
        </GlassSurface>

        <ModeSelector activeMode={activeMode} onSelectMode={setActiveMode} />
      </SafeAreaView>

      {/* Bottom area */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        {/* Compact caption */}
        {bannerText ? (
          <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
            <GlassSurface
              isInteractive
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingLeft: 16,
                paddingRight: 8,
                paddingVertical: 8,
              }}
            >
              <Pressable
                style={{ flex: 1 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss description"
                onPress={() => {
                  clearCurrentDescription();
                  clearLiveStreamingTranscript();
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{ color: "#FFFFFF", fontSize: 16, lineHeight: 22 }}
                >
                  {bannerText}
                </Text>
              </Pressable>
              <IconButton
                icon="speaker.wave.2.fill"
                label="Replay description"
                onPress={() => {
                  if (currentDescription?.spokenSummary)
                    speakDescription(currentDescription.spokenSummary);
                }}
              />
            </GlassSurface>
          </View>
        ) : null}

        {/* Action bar */}
        <SafeAreaView
          edges={["bottom"]}
          style={{ paddingHorizontal: 12, paddingBottom: 8 }}
        >
          <GlassSurface
            isInteractive
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-around",
              paddingTop: 14,
              paddingBottom: 12,
              paddingHorizontal: 12,
            }}
          >
            <ActionCircle
              icon="waveform"
              label="Live"
              active={isLiveScanning}
              activeColor={colors.systemGreen as string}
              onPress={() => {
                hapticService.tap();
                toggleLiveScanning();
              }}
              accessibilityLabel={
                isLiveScanning ? "Live guidance on" : "Live guidance off"
              }
              accessibilityHint="Toggles continuous scene guidance"
            />

            {/* Describe (hero) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Describe scene"
              accessibilityHint="Captures the camera view and describes it"
              onPress={handleDescribePress}
              disabled={isProcessing}
              style={({ pressed }) => ({
                alignItems: "center",
                gap: 6,
                marginBottom: 2,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 4,
                  borderColor: "rgba(255,255,255,0.35)",
                  opacity: isProcessing ? 0.85 : 1,
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#000000" size="large" />
                ) : (
                  <Icon name="eye" size={38} tint="#000000" />
                )}
              </View>
              <Text
                style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}
              >
                Describe
              </Text>
            </Pressable>

            <ActionCircle
              icon="mic.fill"
              label={isListening ? "Listening" : "Ask"}
              active={isListening}
              activeColor={colors.accent as string}
              onPress={handleMicPress}
              accessibilityLabel={
                isListening ? "Listening. Tap to stop" : "Ask a question"
              }
              accessibilityHint="Ask something about what the camera sees"
            />
          </GlassSurface>
        </SafeAreaView>
      </View>
    </View>
  );
}
