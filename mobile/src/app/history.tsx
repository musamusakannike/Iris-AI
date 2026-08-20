import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Volume2, Trash2, Clock, AlertTriangle, EyeOff, Sparkles } from 'lucide-react-native';
import { colors, brutalistShadow } from '../theme/colors';
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

  const handlePlayItem = (item: VisionResponse) => {
    hapticService.tap();
    speakDescription(item.spokenSummary);
  };

  const handleDeleteItem = (item: VisionResponse) => {
    if (item.id) {
      hapticService.tap();
      deleteHistoryItem(item.id);
    }
  };

  // Get category colors matching Academy CourseCard styles
  const getCategoryColor = (mode: AssistiveMode, isHazard: boolean) => {
    if (isHazard) return colors.hazardHigh;
    switch (mode) {
      case 'read':
        return colors.droneTech; // #2563EB Blue
      case 'color':
        return colors.engineering; // #7C3AED Purple
      case 'hazard':
        return colors.hazardHigh; // #EF4444 Red
      case 'ask':
        return colors.software; // #13A851 Green
      case 'explore':
      default:
        return colors.primary; // #FF634E Coral
    }
  };

  const renderItem = ({ item }: { item: VisionResponse }) => {
    const isHazard = item.hazardLevel === 'medium' || item.hazardLevel === 'high';
    const catColor = getCategoryColor(item.mode, isHazard);

    return (
      <View style={[styles.card, { borderTopColor: catColor }]}>
        {/* Card Header with Badges & Delete */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            {/* Category / Mode Badge */}
            <View style={[styles.modeBadge, { backgroundColor: catColor }]}>
              <Text style={styles.modeBadgeText}>
                {item.mode.toUpperCase()}
              </Text>
            </View>

            {isHazard && (
              <View style={styles.hazardBadge}>
                <AlertTriangle size={11} color="#FFFFFF" />
                <Text style={styles.hazardBadgeText}>HAZARD</Text>
              </View>
            )}
          </View>

          {/* Delete Icon */}
          {item.id && (
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Delete item"
              onPress={() => handleDeleteItem(item)}
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={16} color={colors.textDarkMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Prompt/Question if available */}
        {(item.prompt || item.question) && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptText}>
              Q: "{item.prompt || item.question}"
            </Text>
          </View>
        )}

        {/* Spoken Summary */}
        <Text style={styles.summaryText}>{item.spokenSummary}</Text>

        {/* Card Footer Actions (Tactile Button & Timestamp) */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Listen to description: ${item.spokenSummary}`}
            activeOpacity={0.85}
            onPress={() => handlePlayItem(item)}
            style={styles.playButton}
          >
            <Volume2 size={14} color="#0A0E11" />
            <Text style={styles.playButtonText}>LISTEN AGAIN</Text>
          </TouchableOpacity>

          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textDarkMuted} />
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {history.length > 0 && (
        <View style={styles.topActionBar}>
          <View style={styles.countBadge}>
            <Text style={styles.historyCountText}>
              {history.length} {history.length === 1 ? 'RECORD' : 'RECORDS'}
            </Text>
          </View>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear all scan history"
            onPress={clearAllHistory}
            style={styles.clearButton}
          >
            <Trash2 size={13} color={colors.hazardHigh} />
            <Text style={styles.clearButtonText}>CLEAR ALL</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoadingHistory && history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>LOADING HISTORY...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <EyeOff size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>NO SCANS SAVED YET</Text>
          <Text style={styles.emptyText}>
            Visual descriptions and voice queries captured through your camera will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.id || `hist_${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2C3742',
    backgroundColor: '#0A0E11',
  },
  countBadge: {
    backgroundColor: '#181F26',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#2C3742',
  },
  historyCountText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.hazardHigh,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF', // High contrast clean card from Academy
    borderWidth: 2,
    borderColor: '#0A0E11',
    borderTopWidth: 5,
    borderRadius: 4,
    padding: 16,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 2,
  },
  modeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hazardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.hazardHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    gap: 4,
  },
  hazardBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  deleteButton: {
    padding: 4,
  },
  promptContainer: {
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  promptText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#171717',
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  playButtonText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#0A0E11',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDarkMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 4,
    backgroundColor: '#181F26',
    borderWidth: 2,
    borderColor: '#2C3742',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
});

