import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

let isAuthorized = false;

export async function initHealth() {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const auth = await Health.requestAuthorization({
      read: ['weight', 'height', 'calories', 'activity'],
      write: ['weight', 'height', 'calories', 'activity'],
    });
    console.log('Health API Auth:', auth);
    isAuthorized = true;
    return true;
  } catch (err) {
    console.error('Failed to init Health:', err);
    return false;
  }
}

export async function logWorkoutToHealth(workout) {
  if (!isAuthorized) {
    const auth = await initHealth();
    if (!auth) return;
  }
  
  if (!workout.end || !workout.start) return;

  try {
    // Basic workout logging (Duration and optional calories)
    // Assuming duration is in milliseconds
    const startDate = new Date(workout.start);
    const endDate = new Date(workout.end);
    
    // Convert duration to calories (rough estimate: 500 kcal per hour)
    const hours = (workout.end - workout.start) / 1000 / 60 / 60;
    const calories = Math.round(hours * 500);

    await Health.saveActivity({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      activityType: 'workout',
      calories: calories
    });
    console.log('Workout logged to Health Connect / HealthKit');
  } catch (err) {
    console.error('Failed to log workout to Health:', err);
  }
}
