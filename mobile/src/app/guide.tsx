import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Volume2,
  Compass,
  BookOpen,
  ShieldAlert,
  Palette,
  Mic,
  Eye,
  Hand,
  Sparkles,
} from 'lucide-react-native';
import { colors, brutalistShadow } from '../theme/colors';
import { speechService } from '../services/speech';
import { hapticService } from '../services/haptics';

const GUIDE_SECTIONS = [
  {
    step: '01',
    title: 'INSTANT SCENE DESCRIPTION',
    category: 'SPATIAL VISION',
    icon: Eye,
    color: colors.primary, // #FF634E Coral
    body: 'Point your camera at anything. Tap the large "DESCRIBE SCENE" button or double-tap anywhere on the viewfinder screen. IRIS will immediately analyze and speak what is in front of you.',
  },
  {
    step: '02',
    title: 'ASK QUESTIONS WITH YOUR VOICE',
    category: 'NATURAL SPEECH',
    icon: Mic,
    color: colors.droneTech, // #2563EB Blue
    body: 'Want to know more? Tap "ASK VOICE" and speak naturally. For example: "Where is the door?", "What color is this shirt?", or "Is there any step ahead?". IRIS responds instantly.',
  },
  {
    step: '03',
    title: 'ASSISTIVE SENSING MODES',
    category: 'INTELLIGENCE',
    icon: Sparkles,
    color: colors.engineering, // #7C3AED Purple
    body: 'Select category pills at the top to switch operational modes:\n• Explore: Spatial directions and general layout\n• Read Text: Reads documents, labels, signs & menus\n• Hazards: Scans strictly for walking obstacles & stairs\n• Colors: Identifies precise colors and clothing',
  },
  {
    step: '04',
    title: 'CONTINUOUS LIVE SCAN',
    category: 'AMBIENT RADAR',
    icon: Compass,
    color: colors.safe, // #13A851 Green
    body: 'Tap "LIVE" on the bottom left to enable passive ambient commentary. IRIS will continuously scan and announce environmental changes every few seconds.',
  },
  {
    step: '05',
    title: 'SHORTCUTS & ACCESSIBILITY',
    category: 'QUICK CONTROLS',
    icon: Hand,
    color: colors.foundations, // #D97706 Amber
    body: '• Double-tap anywhere on camera view to describe instantly\n• Flashlight button in top HUD illuminates dark scenes\n• Replay button repeats the last audio description anytime',
  },
];

export default function GuideScreen() {
  const fullNarration =
    'Welcome to the IRIS AI user guide. Point your camera at anything and tap Describe Scene to hear your surroundings. You can also tap Ask Voice to ask any question. Use the top pills to switch between Explore, Read Text, Hazards, and Colors modes. Tap Live Mode to have IRIS continuously scan the world for you.';

  const handleReadOutLoud = () => {
    hapticService.tap();
    speechService.speak(fullNarration);
  };

  useEffect(() => {
    speechService.announce('How to use IRIS AI guide. Tap Read Guide Out Loud to listen.');
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Audio Narration Hero Card */}
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Read guide out loud"
          accessibilityHint="Reads the complete tutorial through audio"
          onPress={handleReadOutLoud}
          activeOpacity={0.85}
          style={styles.heroCard}
        >
          {/* Top Ruler Indicator */}
          <View style={styles.heroRulerTicks}>
            {[...Array(16)].map((_, i) => (
              <View key={i} style={styles.heroTick} />
            ))}
          </View>

          <View style={styles.heroContentRow}>
            <View style={styles.heroIconWrapper}>
              <Volume2 size={24} color="#0A0E11" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>READ GUIDE OUT LOUD</Text>
              <Text style={styles.heroSubtitle}>
                Tap to listen to the complete audio walkthrough
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Section Cards */}
        {GUIDE_SECTIONS.map((section, index) => {
          const IconComponent = section.icon;

          return (
            <View
              key={index}
              style={[styles.sectionCard, { borderTopColor: section.color }]}
            >
              {/* Card Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: section.color },
                    ]}
                  >
                    <Text style={styles.categoryBadgeText}>
                      {section.category}
                    </Text>
                  </View>
                  <Text style={styles.stepNumber}>{section.step}</Text>
                </View>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: `${section.color}20` },
                  ]}
                >
                  <IconComponent size={18} color={section.color} />
                </View>
              </View>

              {/* Title & Body */}
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          );
        })}
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
  heroCard: {
    backgroundColor: colors.primary, // A1 Primary coral hero
    borderWidth: 2.5,
    borderColor: '#0A0E11',
    borderRadius: 4,
    padding: 16,
    shadowColor: '#0A0E11',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  heroRulerTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    opacity: 0.4,
  },
  heroTick: {
    width: 2,
    height: 6,
    backgroundColor: '#0A0E11',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0A0E11',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.8,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#381611',
    fontWeight: '700',
    marginTop: 2,
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 2,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9CA3AF',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0A0E11',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#525252',
    fontWeight: '600',
  },
});

