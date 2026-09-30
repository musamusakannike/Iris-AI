import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  Host,
  FieldGroup,
  Button,
  Text,
  Collapsible,
  Column,
} from '@expo/ui';
import { Stack } from 'expo-router';
import { colors } from '../theme/colors';
import { speechService } from '../services/speech';
import { hapticService } from '../services/haptics';

const GUIDE_SECTIONS = [
  {
    title: 'Instant scene description',
    body: 'Point your camera at anything. Tap Describe Scene or double-tap the viewfinder. IRIS analyzes the scene and speaks what is in front of you.',
  },
  {
    title: 'Ask questions with your voice',
    body: 'Tap Ask Voice and speak naturally. Try “Where is the door?”, “What color is this shirt?”, or “Is there a step ahead?”',
  },
  {
    title: 'Assistive sensing modes',
    body: 'Use the segmented control to switch modes. Explore describes layout, Read Text speaks signs and documents, Hazards watches for obstacles, and Colors identifies clothing and objects.',
  },
  {
    title: 'Continuous live scan',
    body: 'Tap Live to enable ambient commentary. IRIS streams the camera and announces changes every few seconds.',
  },
  {
    title: 'Shortcuts',
    body: 'Double-tap the camera to describe instantly. Use the flashlight in the top bar for dark scenes. Listen Again repeats the last description.',
  },
];

export default function GuideScreen() {
  const [openIndex, setOpenIndex] = useState(0);

  const fullNarration =
    'Welcome to the IRIS AI user guide. Point your camera at anything and tap Describe Scene to hear your surroundings. You can also tap Ask Voice to ask any question. Use the control at the top to switch between Explore, Read Text, Hazards, and Colors. Tap Live Mode to have IRIS continuously scan the world for you.';

  useEffect(() => {
    speechService.announce('How to use IRIS AI guide. Tap Read Guide Out Loud to listen.');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="speaker.wave.2.fill"
          onPress={() => {
            hapticService.tap();
            speechService.speak(fullNarration);
          }}
        />
      </Stack.Toolbar>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title="Audio">
            <Column>
              <Text textStyle={{ fontSize: 15, color: '#8E8E93' }}>
                Listen to a spoken walkthrough of every step.
              </Text>
              <Button
                label="Read Guide Out Loud"
                variant="filled"
                onPress={() => {
                  hapticService.tap();
                  speechService.speak(fullNarration);
                }}
              />
            </Column>
          </FieldGroup.Section>

          <FieldGroup.Section title="Steps">
            {GUIDE_SECTIONS.map((section, index) => (
              <Collapsible
                key={section.title}
                label={`${index + 1}. ${section.title}`}
                isOpen={openIndex === index}
                onOpenChange={(open) => setOpenIndex(open ? index : -1)}
              >
                <Text textStyle={{ fontSize: 16, lineHeight: 22 }}>{section.body}</Text>
              </Collapsible>
            ))}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </View>
  );
}
