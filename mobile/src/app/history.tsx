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
import { Volume2, Trash2, Clock, AlertTriangle, EyeOff } from 'lucide-react-native';
import { GlassSurface } from '../components/glass-surface';
import { ActionButton } from '../components/action-button';
import { colors } from '../theme/colors';
import { useIrisStore } from '../store/useIrisStore';
import { VisionResponse } from '../services/api';
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
      deleteHistoryItem(item.id);
    }
  };

  const renderItem = ({ item }: { item: VisionResponse }) => {
    const isHazard = item.hazardLevel === 'medium' || item.hazardLevel === 'high';

    return (
      <GlassSurface
        style={[styles.card, isHazard && styles.hazardCard]}
        glassEffectStyle="regular"
        highlight={isHazard}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <Text style={styles.modeBadge}>{item.mode.toUpperCase()}</Text>
            {isHazard && (
              <View style={styles.hazardBadge}>
                <AlertTriangle size={12} color="#FFFFFF" />
                <Text style={styles.hazardBadgeText}>Hazard</Text>
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
            >
              <Trash2 size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Prompt/Question if available */}
        {(item.prompt || item.question) && (
          <Text style={styles.promptText}>
            Q: "{item.prompt || item.question}"
          </Text>
        )}

        {/* Spoken Summary */}
        <Text style={styles.summaryText}>{item.spokenSummary}</Text>

        {/* Card Footer Actions */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Listen to description: ${item.spokenSummary}`}
            onPress={() => handlePlayItem(item)}
            style={styles.playButton}
          >
            <Volume2 size={16} color={colors.primary} />
            <Text style={styles.playButtonText}>Listen Again</Text>
          </TouchableOpacity>

          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </GlassSurface>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {history.length > 0 && (
        <View style={styles.topActionBar}>
          <Text style={styles.historyCountText}>
            {history.length} Saved {history.length === 1 ? 'Scan' : 'Scans'}
          </Text>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear all scan history"
            onPress={clearAllHistory}
            style={styles.clearButton}
          >
            <Trash2 size={14} color={colors.hazardHigh} />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoadingHistory && history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading history...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EyeOff size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Scans Yet</Text>
          <Text style={styles.emptyText}>
            Descriptions and questions from your camera scans will appear here.
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.hazardHigh,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  hazardCard: {
    borderColor: colors.hazardHigh,
    borderWidth: 1.5,
    backgroundColor: 'rgba(69, 10, 10, 0.65)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  hazardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.hazardHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hazardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteButton: {
    padding: 4,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  playButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
