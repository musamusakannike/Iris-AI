import * as Haptics from 'expo-haptics';

export const hapticService = {
  /**
   * Light tactile feedback for standard button taps and mode switching
   */
  async tap(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Safe fallback if haptics unavailable on simulator/web
    }
  },

  /**
   * Medium impact when starting an action (e.g. capturing snapshot or mic active)
   */
  async triggerStart(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  /**
   * Heavy impact for important toggles (e.g. continuous scan started)
   */
  async triggerHeavy(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  },

  /**
   * Success notification when AI completes analysis
   */
  async success(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  /**
   * Urgent warning vibration when a physical hazard is detected
   */
  async warning(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  },

  /**
   * Error vibration when action fails
   */
  async error(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },

  /**
   * Selection tick for cycling through modes
   */
  async selection(): Promise<void> {
    try {
      await Haptics.selectionAsync();
    } catch {}
  },
};
