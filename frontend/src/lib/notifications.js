import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { t } from './i18n.js';

export async function scheduleInactivityReminder() {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    // Clear existing notifications
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    // Schedule a reminder 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(9, 0, 0, 0); // 9 AM

    await LocalNotifications.schedule({
      notifications: [
        {
          title: t('Time to train!'),
          body: t('You haven’t worked out in 3 days. Ready to get back to it?'),
          id: 1,
          schedule: { at: threeDaysFromNow },
          sound: null,
          attachments: null,
          actionTypeId: '',
          extra: null
        }
      ]
    });
    console.log('Scheduled inactivity reminder for', threeDaysFromNow);
  } catch (e) {
    console.error('Failed to schedule notification:', e);
  }
}
