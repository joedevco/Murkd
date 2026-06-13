import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    return expoPushToken.data;
  } catch (e) {
    console.error('registerForPushNotifications: error getting token', e);
    return null;
  }
}

export async function savePushToken(userId: string, token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, push_token: token, platform: Platform.OS },
        { onConflict: 'user_id' }
      );
    if (error) {
      console.error('savePushToken: upsert error', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('savePushToken: error', e);
    return false;
  }
}

export async function setupPushNotifications(userId: string): Promise<boolean> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return false;
  const saved = await savePushToken(userId, token);
  return saved;
}
