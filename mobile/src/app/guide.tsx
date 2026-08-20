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
import { GlassSurface } from '../components/glass-surface';
import { ActionButton } from '../components/action-button';
import { colors } from '../theme/colors';
import { speechService } from '../services/speech';
import { hapticService } from '../services/haptics';

const GUIDE_SECTIONS = [
  {
    title: '1. Instant Scene Description',
    icon: Eye,
    color: colors.primary,
    body: 'Point your camera at anything. Tap the large "Describe Scene" button at the bottom of the screen or double-tap anywhere on the camera viewfinder. IRIS will immediately analyze and speak what is in front of you.',
  },
  {
    title: '2. Ask Questions with Your Voice',
    icon: Mic,
    color: '#38BDF8',
    body: 'Want to know more? Tap "Ask Voice" and speak naturally. For example: "Where is the door?", "What color is this shirt?", or "Is there any step ahead?". IRIS will answer immediately.',
  },
  {
    title: '3. Assistive Modes',
    icon: Sparkles,
    color: '#A855F7',
    body: 'Swipe or tap the top pills to switch modes:\n• Explore: Spatial directions and general layout\n• Read Text: Reads documents, labels, signs & menus\n• Hazards: Scans strictly for walking obstacles & stairs\n• Colors: Identifies precise colors and clothing',
  },
  {
    title: '4. Live Continuous Scan',
    icon: Compass,
    color: colors.safe,
    body: 'Tap "Live Mode" on the bottom left to enable continuous ambient commentary. IRIS will passively watch and announce environment changes every few seconds.',
  },
  {
    title: '5. Shortcuts & Accessibility',
    icon: Hand,
    color: colors.hazardLow,
    body: '• Double-tap anywhere on the camera view to describe instantly\n• Flashlight button in top HUD turns on light for dark rooms\n• Replay button repeats the last audio description anytime',
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
        {/* Top Audio Action Card */}
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Read guide out loud"
          accessibilityHint="Reads the complete tutorial through audio"
          onPress={handleReadOutLoud}
          activeOpacity={0.8}
        >
          <GlassSurface
            style={styles.narrationCard}
            glassEffectStyle="regular"
            highlight={true}
          >
            <View style={styles.narrationIconWrapper}>
              <Volume2 size={26} color="#FFFFFF" />
            </View>
            <View style={styles.narrationTextCol}>
              <Text style={styles.narrationTitle}>Read Guide Out Loud</Text>
              <Text style={styles.narrationSubtitle}>
                Tap to listen to the audio walkthrough
              </Text>
            </View>
          </GlassSurface>
        </TouchableOpacity>

        {/* Section Cards */}
        {GUIDE_SECTIONS.map((section, index) => {
          const IconComponent = section.icon;

          return (
            <GlassSurface
              key={index}
              style={styles.sectionCard}
              glassEffectStyle="regular"
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${section.color}25` },
                  ]}
                >
                  <IconComponent size={20} color={section.color} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </GlassSurface>
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
    gap: 14,
  },
  narrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: colors.primary,
    borderWidth: 1.5,
    gap: 14,
  },
  narrationIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  narrationTextCol: {
    flex: 1,
  },
  narrationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  narrationSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
