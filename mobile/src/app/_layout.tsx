import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../theme/colors';
import { irisWebSocket } from '../services/websocket';
import { useIrisStore } from '../store/useIrisStore';

export default function RootLayout() {
  const { fetchHistory, loadSettings } = useIrisStore();
  const colorScheme = useColorScheme();

  useEffect(() => {
    irisWebSocket.connect();
    fetchHistory();
    loadSettings();

    return () => {
      irisWebSocket.disconnect();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.systemBackground }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerBlurEffect: colorScheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterial',
          headerTintColor: colors.accent,
          headerTitleStyle: {
            color: colors.label,
          },
          headerLargeStyle: { backgroundColor: 'transparent' },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: {
            backgroundColor: colors.groupedBackground,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="guide"
          options={{
            title: 'How to Use IRIS',
            headerLargeTitle: true,
            headerBackTitle: 'Camera',
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            title: 'Scan History',
            headerLargeTitle: true,
            headerBackTitle: 'Camera',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Preferences',
            headerLargeTitle: true,
            headerBackTitle: 'Camera',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
