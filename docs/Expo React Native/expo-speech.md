---
title: Speech
description: A library that provides access to text-to-speech functionality.
sourceCodeUrl: 'https://github.com/expo/expo/tree/sdk-57/packages/expo-speech'
packageName: 'expo-speech'
iconUrl: '/static/images/packages/expo-speech.png'
platforms: ['android', 'ios', 'web', 'expo-go']
---

<AgentInstructions>

## Submitting Feedback

If you encounter errors, misleading or outdated information, report it so Expo can be improved:

Preferred command:
npx --yes submit-expo-feedback@latest --category docs --subject "/versions/latest/sdk/speech/" "<actionable feedback>"

Direct HTTP fallback:
curl -X POST https://api.expo.dev/v2/feedback/docs-send -H 'Content-Type: application/json' -d '{"url":"/versions/latest/sdk/speech/","feedback":"🤖 Agent feedback for docs: <specific, actionable description> (<model>, <harness>)"}'

Only submit when you have something specific and actionable to report. Try to give the most context.

## Navigation

When answering a related or follow-up question, use llms.txt to find the relevant page as Markdown (.md) instead of guessing.

You are here: Reference (v57.0.0) > Expo SDK (87 pages in this section)
Full documentation tree: [llms.txt](https://docs.expo.dev/llms.txt)

</AgentInstructions>

This documentation is available as Markdown for AI agents and LLMs. See the [full Markdown index](/llms.txt) or append .md to any documentation URL.

# Expo Speech

A library that provides access to text-to-speech functionality.
Android, iOS, Web, Included in Expo Go

`expo-speech` provides an API that allows you to utilize Text-to-speech functionality in your app.

> On iOS physical devices, `expo-speech` won't produce sound if the device is in silent mode. Make sure silent mode is turned off.

## Installation

```sh
# npm
npx expo install expo-speech

# yarn
yarn expo install expo-speech

# pnpm
pnpm expo install expo-speech

# bun
bun expo install expo-speech
```

If you are installing this in an [existing React Native app](/bare/overview.md), make sure to [install `expo`](/bare/installing-expo-modules.md) in your project.

## Usage

```jsx
import { View, StyleSheet, Button } from 'react-native';
import * as Speech from 'expo-speech';

export default function App() {
  const speak = () => {
    const thingToSay = '1';
    Speech.speak(thingToSay);
  };

  return (
    <View style={styles.container}>
      <Button title="Press to hear some words" onPress={speak} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
});
```

## API

```js
import * as Speech from 'expo-speech';
```

## Constants

### `Speech.maxSpeechInputLength`

Supported platforms: Android, iOS, Web.

Type: `number`

Maximum possible text length acceptable by `Speech.speak()` method. It is platform-dependent. On iOS, this returns `Number.MAX_VALUE`.

## Methods

### `Speech.getAvailableVoicesAsync()`

Supported platforms: Android, iOS, Web.

Returns list of all available voices.

Returns: `Promise<Voice[]>`

List of `Voice` objects.

### `Speech.isSpeakingAsync()`

Supported platforms: Android, iOS, Web.

Determine whether the Text-to-speech utility is currently speaking. Will return `true` if speaker is paused.

Returns: `Promise<boolean>`

Returns a Promise that fulfils with a boolean, `true` if speaking, `false` if not.

### `Speech.pause()`

Supported platforms: iOS, web.

Pauses current speech. This method is not available on Android.

Returns: `Promise<void>`

### `Speech.resume()`

Supported platforms: iOS, web.

Resumes speaking previously paused speech or does nothing if there's none. This method is not available on Android.

Returns: `Promise<void>`

### `Speech.speak(text, options)`

Supported platforms: Android, iOS, Web.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` | The text to be spoken. Cannot be longer than [`Speech.maxSpeechInputLength`](#speechmaxspeechinputlength). |
| `options`(optional) | [SpeechOptions](#speechoptions) | A `SpeechOptions` object. Default: `{}` |

  

Speak out loud the text given options. Calling this when another text is being spoken adds an utterance to queue.

Returns: `void`

### `Speech.stop()`

Supported platforms: Android, iOS, Web.

Interrupts current speech and deletes all in queue.

Returns: `Promise<void>`

## Types

### `SpeechEventCallback(this, ev)`

Supported platforms: Android, iOS, Web.

| Parameter | Type |
| --- | --- |
| `this` | [SpeechSynthesisUtterance](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance) |
| `ev` | [SpeechSynthesisEvent](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisEvent) |

Returns:

`any`

### `SpeechOptions`

Supported platforms: Android, iOS, Web.

| Property | Type | Description |
| --- | --- | --- |
| _voiceIndex(optional) | `number` | - |
| language(optional) | `string` | The code of a language that should be used to read the `text`, refer to IETF BCP 47 to see valid codes. |
| onBoundary(optional) | NativeBoundaryEventCallback | [SpeechEventCallback](/versions/latest/sdk/speech.md#speecheventcallbackthis-ev) | null | A callback that is invoked when the spoken utterance reaches a word. |
| onDone(optional) | () => void | [SpeechEventCallback](/versions/latest/sdk/speech.md#speecheventcallbackthis-ev) | A callback that is invoked when speaking finishes. |
| onError(optional) | (error: [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)) => void | [SpeechEventCallback](/versions/latest/sdk/speech.md#speecheventcallbackthis-ev) | Supported platforms: Android, iOS. A callback that is invoked when an error occurred while speaking. |
| onMark(optional) | [SpeechEventCallback](/versions/latest/sdk/speech.md#speecheventcallbackthis-ev) | null | - |
| onPause(optional) | [SpeechEventCallback](/versions/latest/sdk/speech.md#speecheventcallbackthis-ev) | null | - |
| onResume(optional) | [SpeechEventCallback](/versions/latest/sdk/speech.md#speecheventcallbackthis-ev) | null | - |
| onStart(optional) | () => void | [SpeechEventCallback](/versions/latest/sdk/speech.md#speecheventcallbackthis-ev) | A callback that is invoked when speaking starts. |
| onStopped(optional) | () => void | [SpeechEventCallback](/versions/latest/sdk/speech.md#speecheventcallbackthis-ev) | A callback that is invoked when speaking is stopped by calling `Speech.stop()`. |
| pitch(optional) | `number` | Pitch of the voice to speak `text`. `1.0` is the normal pitch. |
| rate(optional) | `number` | Rate of the voice to speak `text`. `1.0` is the normal rate. |
| useApplicationAudioSession(optional) | `boolean` | Supported platforms: iOS. If you set this value to `false`, the system creates a separate audio session to automatically manage speech, interruptions, and mixing and ducking the speech with other audio sources. |
| voice(optional) | `string` | Voice identifier. |
| volume(optional) | `number` | Volume of the voice to speak `text`. A number between `0.0` (muted) and `1.0` (max volume). Default: `1.0` |

### `Voice`

Supported platforms: Android, iOS, Web.

Object describing the available voices on the device.

| Property | Type | Description |
| --- | --- | --- |
| identifier | `string` | Voice unique identifier. |
| language | `string` | Voice language. |
| name | `string` | Voice name. |
| quality | [VoiceQuality](#voicequality) | Voice quality. |

### `WebVoice`

Supported platforms: Android, iOS, Web.

Type: [Voice](#voice) extended by:

| Property | Type | Description |
| --- | --- | --- |
| isDefault | `boolean` | - |
| localService | `boolean` | - |
| name | `string` | - |
| voiceURI | `string` | - |

## Enums

### `VoiceQuality`

Supported platforms: Android, iOS, Web.

Enum representing the voice quality.

#### `Default`

`VoiceQuality.Default = "Default"`

#### `Enhanced`

`VoiceQuality.Enhanced = "Enhanced"`
