import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const expo = new Expo({
  accessToken: env.EXPO_ACCESS_TOKEN,
});

export interface SendPushNotificationParams {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

export const pushNotificationService = {
  /**
   * Validate if a given token is a valid Expo push token
   */
  isValidPushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  },

  /**
   * Send a push notification to a single device
   */
  async sendPushNotification(params: SendPushNotificationParams): Promise<ExpoPushTicket | null> {
    if (!this.isValidPushToken(params.pushToken)) {
      logger.error(`Push token ${params.pushToken} is not a valid Expo push token`);
      return null;
    }

    const message: ExpoPushMessage = {
      to: params.pushToken,
      sound: params.sound !== undefined ? params.sound : 'default',
      title: params.title,
      body: params.body,
      data: params.data,
      badge: params.badge,
    };

    try {
      const chunks = expo.chunkPushNotifications([message]);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      logger.info('Push notification sent successfully', { tickets });
      return tickets[0] || null;
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  },

  /**
   * Send push notifications to multiple devices in batches
   */
  async sendBatchPushNotifications(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const validMessages = messages.filter((msg) => {
      const tokens = Array.isArray(msg.to) ? msg.to : [msg.to];
      return tokens.every((token) => Expo.isExpoPushToken(token));
    });

    const chunks = expo.chunkPushNotifications(validMessages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        logger.error('Error sending notification chunk:', error);
      }
    }

    return tickets;
  },
};
