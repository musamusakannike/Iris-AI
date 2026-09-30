import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Host, Button, Column, Text as UIText } from '@expo/ui';
import { Image } from 'expo-image';
import { colors } from '../theme/colors';
import { useIrisStore } from '../store/useIrisStore';
import { VisionResponse, AssistiveMode } from '../services/api';
import { speechService } from '../services/speech';
import { hapticService } from '../services/haptics';

export default function HistoryScreen() {
  const {
    history,
    isLoadingHistory,
    fetchHistory,
    deleteHistoryItem,
    clearAllHistory,
    speakDescription,
  } = useIrisStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
    speechService.announce('Scan history loaded.');
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const getCategoryColor = (mode: AssistiveMode, isHazard: boolean) => {
    if (isHazard) return colors.systemRed;
    switch (mode) {
      case 'read':
        return colors.systemBlue;
      case 'color':
        return colors.systemPurple;
      case 'hazard':
        return colors.systemRed;
      case 'ask':
        return colors.systemGreen;
      default:
        return colors.accent;
    }
  };

  const renderItem = ({ item }: { item: VisionResponse }) => {
    const isHazard = item.hazardLevel === 'medium' || item.hazardLevel === 'high';
    const catColor = getCategoryColor(item.mode, isHazard);

    return (
      <View
        style={{
          backgroundColor: colors.secondaryGroupedBackground,
          borderRadius: 14,
          borderCurve: 'continuous',
          padding: 16,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: catColor,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              borderCurve: 'continuous',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
              {item.mode.toUpperCase()}
              {isHazard ? '  ·  HAZARD' : ''}
            </Text>
          </View>
          {item.id ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete item"
              onPress={() => {
                hapticService.tap();
                deleteHistoryItem(item.id!);
              }}
              hitSlop={10}
            >
              <Image source="sf:trash" style={{ width: 18, height: 18 }} tintColor={colors.systemRed as string} />
            </Pressable>
          ) : null}
        </View>

        {(item.prompt || item.question) && (
          <Text selectable style={{ fontSize: 13, fontWeight: '600', color: colors.secondaryLabel, fontStyle: 'italic' }}>
            {item.prompt || item.question}
          </Text>
        )}

        <Text selectable style={{ fontSize: 16, lineHeight: 22, color: colors.label, fontWeight: '500' }}>
          {item.spokenSummary}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Host matchContents>
            <Button
              label="Listen Again"
              variant="filled"
              onPress={() => {
                hapticService.tap();
                speakDescription(item.spokenSummary);
              }}
            />
          </Host>
          <Text style={{ fontSize: 13, color: colors.secondaryLabel, fontVariant: ['tabular-nums'] }}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="trash"
          onPress={() => {
            if (history.length === 0) return;
            hapticService.tap();
            clearAllHistory();
          }}
        />
      </Stack.Toolbar>

      {isLoadingHistory && history.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator />
        </View>
      ) : history.length === 0 ? (
        <Host style={{ flex: 1 }}>
          <Column>
            <UIText textStyle={{ fontSize: 20, fontWeight: '700', textAlign: 'center' }}>IRIS</UIText>
            <UIText textStyle={{ fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
              No scans yet
            </UIText>
            <UIText textStyle={{ fontSize: 15, color: '#8E8E93', textAlign: 'center' }}>
              Descriptions and voice queries from the camera will appear here.
            </UIText>
          </Column>
        </Host>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.id || `hist_${index}`}
          renderItem={renderItem}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent as string} />
          }
        />
      )}
    </View>
  );
}
