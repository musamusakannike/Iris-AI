import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HelpCircle, History, Settings, Eye } from 'lucide-react-native';
import { GlassSurface } from '../components/glass-surface';
import { colors } from '../theme/colors';
import { hapticService } from '../services/haptics';
import { irisWebSocket } from '../services/websocket';
import { useIrisStore } from '../store/useIrisStore';

export default function RootLayout() {
  const { fetchHistory } = useIrisStore();

  useEffect(() => {
    // Initialize background services
    irisWebSocket.connect();
    fetchHistory();

    return () => {
      irisWebSocket.disconnect();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            contentStyle: {
              backgroundColor: colors.background,
            },
            animation: 'fade',
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false, // We use a custom floating glass HUD in the main camera view
            }}
          />
          <Stack.Screen
            name="guide"
            options={{
              title: 'How to Use Iris',
              headerBackTitle: 'Camera',
            }}
          />
          <Stack.Screen
            name="history"
            options={{
              title: 'Scan History',
              headerBackTitle: 'Camera',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: 'Preferences',
              headerBackTitle: 'Camera',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
