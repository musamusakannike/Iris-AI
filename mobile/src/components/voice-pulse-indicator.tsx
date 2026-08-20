import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Mic, Volume2, Sparkles, Eye } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { AIState } from '../store/useIrisStore';

interface VoicePulseIndicatorProps {
  state: AIState;
  size?: number;
}

export const VoicePulseIndicator: React.FC<VoicePulseIndicatorProps> = ({
  state,
  size = 56,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (state === 'listening') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.2, { duration: 600 })
        ),
        -1,
        true
      );
    } else if (state === 'thinking') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          withTiming(0.95, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0.15, { duration: 800 })
        ),
        -1,
        true
      );
    } else if (state === 'speaking') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(1.0, { duration: 400 })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [state]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getStateColor = () => {
    switch (state) {
      case 'listening':
        return colors.listening;
      case 'thinking':
        return colors.thinking;
      case 'speaking':
        return colors.speaking;
      case 'error':
        return colors.error;
      default:
        return colors.idle;
    }
  };

  const currentColor = getStateColor();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {state !== 'idle' && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: (size * 1.5) / 2,
              backgroundColor: currentColor,
            },
            animatedRingStyle,
          ]}
        />
      )}
      <View
        style={[
          styles.coreCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: state === 'idle' ? 'rgba(30, 41, 59, 0.8)' : currentColor,
          },
        ]}
      >
        {state === 'listening' && <Mic size={24} color="#FFFFFF" />}
        {state === 'thinking' && <Sparkles size={24} color="#FFFFFF" />}
        {state === 'speaking' && <Volume2 size={24} color="#FFFFFF" />}
        {state === 'idle' && <Eye size={24} color={colors.textSecondary} />}
        {state === 'error' && <Eye size={24} color="#FFFFFF" />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
  },
  coreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
});
