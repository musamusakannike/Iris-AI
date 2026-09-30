import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '../theme/colors';
import { AIState } from '../store/useIrisStore';

interface VoicePulseIndicatorProps {
  state: AIState;
  size?: number;
}

const SYMBOLS: Record<AIState, string> = {
  listening: 'sf:mic.fill',
  thinking: 'sf:sparkles',
  speaking: 'sf:speaker.wave.2.fill',
  idle: 'sf:eye.fill',
  error: 'sf:exclamationmark.octagon.fill',
};

export const VoicePulseIndicator: React.FC<VoicePulseIndicatorProps> = ({
  state,
  size = 52,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (state === 'listening' || state === 'thinking' || state === 'speaking') {
      const duration = state === 'speaking' ? 400 : state === 'thinking' ? 800 : 600;
      scale.value = withRepeat(
        withSequence(
          withTiming(1.28, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.65, { duration }), withTiming(0.2, { duration })),
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

  const currentColor =
    state === 'listening'
      ? colors.listening
      : state === 'thinking'
        ? colors.thinking
        : state === 'speaking'
          ? colors.speaking
          : state === 'error'
            ? colors.error
            : colors.idle;

  const iconTint = state === 'idle' ? (colors.accent as string) : '#FFFFFF';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {state !== 'idle' && (
        <Animated.View
          style={[
            {
              position: 'absolute',
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
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: state === 'idle' ? 'rgba(0,0,0,0.55)' : currentColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={SYMBOLS[state]}
          style={{ width: size * 0.42, height: size * 0.42 }}
          tintColor={iconTint}
        />
      </View>
    </View>
  );
};
