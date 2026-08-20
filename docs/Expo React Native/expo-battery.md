---
title: Battery
description: A library that provides battery information for the physical device, as well as corresponding event listeners.
sourceCodeUrl: 'https://github.com/expo/expo/tree/sdk-57/packages/expo-battery'
packageName: 'expo-battery'
iconUrl: '/static/images/packages/expo-battery.png'
platforms: ['android', 'ios*', 'web', 'expo-go']
---

<AgentInstructions>

## Submitting Feedback

If you encounter errors, misleading or outdated information, report it so Expo can be improved:

Preferred command:
npx --yes submit-expo-feedback@latest --category docs --subject "/versions/latest/sdk/battery/" "<actionable feedback>"

Direct HTTP fallback:
curl -X POST https://api.expo.dev/v2/feedback/docs-send -H 'Content-Type: application/json' -d '{"url":"/versions/latest/sdk/battery/","feedback":"🤖 Agent feedback for docs: <specific, actionable description> (<model>, <harness>)"}'

Only submit when you have something specific and actionable to report. Try to give the most context.

## Navigation

When answering a related or follow-up question, use llms.txt to find the relevant page as Markdown (.md) instead of guessing.

You are here: Reference (v57.0.0) > Expo SDK (87 pages in this section)
Full documentation tree: [llms.txt](https://docs.expo.dev/llms.txt)

</AgentInstructions>

This documentation is available as Markdown for AI agents and LLMs. See the [full Markdown index](/llms.txt) or append .md to any documentation URL.

# Expo Battery

A library that provides battery information for the physical device, as well as corresponding event listeners.
Android, iOS (device only), Web, Included in Expo Go

`expo-battery` provides battery information for the physical device (such as battery level, whether or not the device is charging, and more) as well as corresponding event listeners.

## Installation

```sh
# npm
npx expo install expo-battery

# yarn
yarn expo install expo-battery

# pnpm
pnpm expo install expo-battery

# bun
bun expo install expo-battery
```

If you are installing this in an [existing React Native app](/bare/overview.md), make sure to [install `expo`](/bare/installing-expo-modules.md) in your project.

## Usage

```jsx
import { useBatteryLevel } from 'expo-battery';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  const batteryLevel = useBatteryLevel();

  return (
    <View style={styles.container}>
      <Text>Current Battery Level: {batteryLevel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

## API

```js
import * as Battery from 'expo-battery';
```

## Hooks

### `useBatteryLevel()`

Supported platforms: Android, iOS, Web.

Gets the device's battery level, as in [`getBatteryLevelAsync`](#getbatterylevelasync).

Returns: `number`

The battery level of the device.

Example

```ts
const batteryLevel = useBatteryLevel();
```

### `useBatteryState()`

Supported platforms: Android, iOS, Web.

Gets the device's battery state, as in [`getBatteryStateAsync`](#getbatterystateasync).

Returns: `BatteryState`

The battery state of the device.

Example

```ts
const batteryState = useBatteryState();
```

### `useLowPowerMode()`

Supported platforms: Android, iOS, Web.

Boolean that indicates if the device is in low power or power saver mode, as in [`isLowPowerModeEnabledAsync`](#islowpowermodeenabledasync).

Returns: `boolean`

Returns a boolean indicating if the device is in low power mode.

Example

```ts
const lowPowerMode = useLowPowerMode();
```

### `usePowerState()`

Supported platforms: Android, iOS, Web.

Gets the device's power state information, as in [`getPowerStateAsync`](#getpowerstateasync).

Returns: `PowerState`

Returns power state information.

Example

```ts
const { lowPowerMode, batteryLevel, batteryState } = usePowerState();
```

## Methods

### `getBatteryLevelAsync()`

Supported platforms: Android, iOS, Web.

Gets the battery level of the device as a number between `0` and `1`, inclusive. If the device does not support retrieving the battery level, this method returns `-1`. On web, this method always returns `1`.

Returns: `Promise<number>`

A `Promise` that fulfils with a number between `0` and `1` representing the battery level, or `-1` if the device does not provide it.

Example

```ts
await Battery.getBatteryLevelAsync();
// 0.759999
```

### `getBatteryStateAsync()`

Supported platforms: Android, iOS, Web.

Tells the battery's current state. On web, this always returns `BatteryState.UNKNOWN`.

Returns: `Promise<BatteryState>`

Returns a `Promise` which fulfills with a [`Battery.BatteryState`](#batterystate) enum value for whether the device is any of the five states.

Example

```ts
await Battery.getBatteryStateAsync();
// BatteryState.CHARGING
```

### `getPowerStateAsync()`

Supported platforms: Android, iOS, Web.

Gets the power state of the device including the battery level, whether it is plugged in, and if the system is currently operating in Power Saver Mode (Android) or Low Power Mode (iOS). This method re-throws any errors that occur when retrieving any of the power-state information.

Returns: `Promise<PowerState>`

Returns a `Promise` which fulfills with [`PowerState`](#powerstate) object.

Example

```ts
await Battery.getPowerStateAsync();
// {
//   batteryLevel: 0.759999,
//   batteryState: BatteryState.UNPLUGGED,
//   lowPowerMode: true,
// }
```

### `isAvailableAsync()`

Supported platforms: Android, iOS, Web.

Resolves with whether the battery API is available on the current device. The value of this property is `true` on Android and physical iOS devices and `false` on iOS simulators. On web, it depends on whether the browser supports the web battery API.

Returns: `Promise<boolean>`

### `isBatteryOptimizationEnabledAsync()`

Supported platforms: Android, iOS, Web.

Checks whether battery optimization is enabled for your application. If battery optimization is enabled for your app, background tasks might be affected when your app goes into doze mode state. (only on Android 6.0 or later)

Returns: `Promise<boolean>`

Returns a `Promise` which fulfills with a `boolean` value of either `true` or `false`, indicating whether the battery optimization is enabled or disabled, respectively. (Android only)

Example

```ts
await Battery.isBatteryOptimizationEnabledAsync();
// true
```

### `isLowPowerModeEnabledAsync()`

Supported platforms: Android, iOS, Web.

Gets the current status of Power Saver mode on Android and Low Power mode on iOS. If a platform doesn't support Low Power mode reporting (like web, older Android devices), the reported low-power state is always `false`, even if the device is actually in low-power mode.

Returns: `Promise<boolean>`

Returns a `Promise` which fulfills with a `boolean` value of either `true` or `false`, indicating whether low power mode is enabled or disabled.

Example

Power Saver Mode (Android) or Low Power Mode (iOS) are enabled.

```ts
await Battery.isLowPowerModeEnabledAsync();
// true
```

## Event subscriptions

### `addBatteryLevelListener(listener)`

Supported platforms: Android, iOS, Web.

| Parameter | Type | Description |
| --- | --- | --- |
| `listener` | (event: [BatteryLevelEvent](#batterylevelevent)) => void | A callback that is invoked when battery level changes. The callback is provided a single argument that is an object with a `batteryLevel` key. |

  

Subscribe to the battery level change updates.

On Android devices, the event fires only when significant changes happens, which is when the battery level drops below [`android.intent.action.BATTERY_LOW`](https://developer.android.com/reference/android/content/Intent#ACTION_BATTERY_LOW) or rises above [`android.intent.action.BATTERY_OKAY`](https://developer.android.com/reference/android/content/Intent#ACTION_BATTERY_OKAY) from a low battery level. See [Monitor the Battery Level and Charging State](https://developer.android.com/training/monitoring-device-state/battery-monitoring) in Android documentation for more information.

On iOS devices, the event fires when the battery level drops one percent or more, but is only fired once per minute at maximum.

On web, the event never fires.

Returns: `EventSubscription`

A `Subscription` object on which you can call `remove()` to unsubscribe from the listener.

### `addBatteryStateListener(listener)`

Supported platforms: Android, iOS, Web.

| Parameter | Type | Description |
| --- | --- | --- |
| `listener` | (event: [BatteryStateEvent](#batterystateevent)) => void | A callback that is invoked when battery state changes. The callback is provided a single argument that is an object with a `batteryState` key. |

  

Subscribe to the battery state change updates to receive an object with a [`Battery.BatteryState`](#batterystate) enum value for whether the device is any of the five states.

On web, the event never fires.

Returns: `EventSubscription`

A `Subscription` object on which you can call `remove()` to unsubscribe from the listener.

### `addLowPowerModeListener(listener)`

Supported platforms: Android, iOS, Web.

| Parameter | Type | Description |
| --- | --- | --- |
| `listener` | (event: [PowerModeEvent](#powermodeevent)) => void | A callback that is invoked when Power Saver Mode (Android) or Low Power Mode (iOS) changes. The callback is provided a single argument that is an object with a `lowPowerMode` key. |

  

Subscribe to Power Saver Mode (Android) or Low Power Mode (iOS) updates. The event fires whenever the power mode is toggled.

On web, the event never fires.

Returns: `EventSubscription`

A `Subscription` object on which you can call `remove()` to unsubscribe from the listener.

## Interfaces

### `Subscription`

Supported platforms: Android, iOS, Web.

A subscription object that allows to conveniently remove an event listener from the emitter.

Subscription Methods

### `remove()`

Supported platforms: Android, iOS, Web.

Removes an event listener for which the subscription has been created. After calling this function, the listener will no longer receive any events from the emitter.

Returns: `void`

## Types

### `BatteryLevelEvent`

Supported platforms: Android, iOS, Web.

| Property | Type | Description |
| --- | --- | --- |
| batteryLevel | `number` | A number between `0` and `1`, inclusive, or `-1` if the battery level is unknown. |

### `BatteryStateEvent`

Supported platforms: Android, iOS, Web.

| Property | Type | Description |
| --- | --- | --- |
| batteryState | [BatteryState](#batterystate) | An enum value representing the battery state. |

### `PowerModeEvent`

Supported platforms: Android, iOS, Web.

| Property | Type | Description |
| --- | --- | --- |
| lowPowerMode | `boolean` | A boolean value, `true` if lowPowerMode is on, `false` if lowPowerMode is off. |

### `PowerState`

Supported platforms: Android, iOS, Web.

| Property | Type | Description |
| --- | --- | --- |
| batteryLevel | `number` | A number between `0` and `1`, inclusive, or `-1` if the battery level is unknown. |
| batteryState | [BatteryState](#batterystate) | An enum value representing the battery state. |
| lowPowerMode | `boolean` | A boolean value, `true` if lowPowerMode is on, `false` if lowPowerMode is off. |

## Enums

### `BatteryState`

Supported platforms: Android, iOS, Web.

#### `UNKNOWN`

`BatteryState.UNKNOWN = 0`

If the battery state is unknown or inaccessible.

#### `UNPLUGGED`

`BatteryState.UNPLUGGED = 1`

If the battery is discharging (typically not connected to power). On Android, this corresponds to [`BATTERY_STATUS_DISCHARGING`](https://developer.android.com/reference/android/os/BatteryManager#BATTERY_STATUS_DISCHARGING).

#### `CHARGING`

`BatteryState.CHARGING = 2`

If battery is charging.

#### `FULL`

`BatteryState.FULL = 3`

If the battery level is full.

#### `NOT_CHARGING`

Supported platforms: Android.

`BatteryState.NOT_CHARGING = 4`

The battery is not charging while power is connected (AC/USB/wireless), for example when battery protection limits charge to 80%, or optimized charging pauses. This differs from `UNPLUGGED` (discharging on battery). On iOS and web, this value is never returned.
