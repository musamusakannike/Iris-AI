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
  const { fetchHistory, loadSettings } = useIrisStore();

  useEffect(() => {
    // Initialize background services and load preferences
    irisWebSocket.connect();
    fetchHistory();
    loadSettings();

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
              backgroundColor: colors.black,
            },
            headerTintColor: colors.primary,
            headerTitleStyle: {
              fontWeight: '900',
              fontSize: 16,
              color: '#FFFFFF',
            },
            headerBackTitleStyle: {
              fontSize: 14,
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
              headerShown: false, // We use custom Academy HUD in camera view
            }}
          />
          <Stack.Screen
            name="guide"
            options={{
              title: 'HOW TO USE IRIS',
              headerBackTitle: 'CAMERA',
            }}
          />
          <Stack.Screen
            name="history"
            options={{
              title: 'SCAN HISTORY',
              headerBackTitle: 'CAMERA',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: 'PREFERENCES',
              headerBackTitle: 'CAMERA',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
