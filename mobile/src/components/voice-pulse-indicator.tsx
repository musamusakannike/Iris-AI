import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Mic, Volume2, Sparkles, Eye, AlertOctagon } from 'lucide-react-native';
import { colors, brutalistShadow } from '../theme/colors';
import { AIState } from '../store/useIrisStore';

interface VoicePulseIndicatorProps {
  state: AIState;
  size?: number;
}

export const VoicePulseIndicator: React.FC<VoicePulseIndicatorProps> = ({
  state,
  size = 52,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (state === 'listening') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
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
          withTiming(0.55, { duration: 800 }),
          withTiming(0.15, { duration: 800 })
        ),
        -1,
        true
      );
    } else if (state === 'speaking') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 400 }),
          withTiming(1.0, { duration: 400 })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 400 }),
          withTiming(0.25, { duration: 400 })
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
        return colors.listening; // #FF634E
      case 'thinking':
        return colors.thinking; // #7C3AED
      case 'speaking':
        return colors.speaking; // #13A851
      case 'error':
        return colors.error; // #EF4444
      default:
        return '#232C35';
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
              width: size * 1.4,
              height: size * 1.4,
              borderRadius: (size * 1.4) / 2,
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
            backgroundColor: state === 'idle' ? '#0A0E11' : currentColor,
            borderColor: state === 'idle' ? colors.primary : '#0A0E11',
          },
        ]}
      >
        {state === 'listening' && <Mic size={22} color="#0A0E11" />}
        {state === 'thinking' && <Sparkles size={22} color="#FFFFFF" />}
        {state === 'speaking' && <Volume2 size={22} color="#FFFFFF" />}
        {state === 'idle' && <Eye size={22} color={colors.primary} />}
        {state === 'error' && <AlertOctagon size={22} color="#FFFFFF" />}
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
    borderWidth: 2.5,
    borderColor: '#0A0E11',
    shadowColor: '#0A0E11',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
});

