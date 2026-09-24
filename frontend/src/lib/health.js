import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

const HEALTH_PERMISSIONS = {
  read: ['weight'],
  write: ['weight', 'calories'],
};

function isFullyAuthorized(status) {
  return HEALTH_PERMISSIONS.read.every(type => status.readAuthorized?.includes(type))
    && HEALTH_PERMISSIONS.write.every(type => status.writeAuthorized?.includes(type));
}

export async function getHealthStatus() {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, authorized: false, reason: 'Native platform required' };
  }

  const availability = await Health.isAvailable();
  if (!availability.available) return { ...availability, authorized: false };

  const authorization = await Health.checkAuthorization(HEALTH_PERMISSIONS);
  return { ...availability, ...authorization, authorized: isFullyAuthorized(authorization) };
}

export async function initHealth() {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const availability = await Health.isAvailable();
    if (!availability.available) {
      console.warn('Health Connect / HealthKit is unavailable:', availability.reason);
      return false;
    }

    const authorization = await Health.requestAuthorization(HEALTH_PERMISSIONS);
    const authorized = isFullyAuthorized(authorization);
    console.log('Health authorization:', authorization);
    return authorized;
  } catch (err) {
    console.error('Failed to init Health:', err);
    return false;
  }
}

export async function logWorkoutToHealth(workout) {
  if (!workout?.end || !workout?.start) return false;

  try {
    const status = await getHealthStatus();
    if (!status.available || !status.authorized) return false;

    const startDate = new Date(workout.start);
    const endDate = new Date(workout.end);
    const hours = (workout.end - workout.start) / 1000 / 60 / 60;
    const calories = workout.calories || Math.max(1, Math.round(hours * 500));

    await Health.saveSample({
      dataType: 'calories',
      value: calories,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      metadata: { source: 'openGym', workoutId: String(workout.id || '') },
    });
    console.log('Workout logged to Health Connect / HealthKit');
    return true;
  } catch (err) {
    console.error('Failed to log workout to Health:', err);
    return false;
  }
}

export async function logBodyWeightToHealth(entry) {
  if (!entry || !Number.isFinite(Number(entry.w))) return false;

  try {
    const status = await getHealthStatus();
    if (!status.available || !status.authorized) return false;

    const recordedAt = entry.t || new Date(`${entry.d}T12:00:00`).getTime();
    await Health.saveSample({
      dataType: 'weight',
      value: Number(entry.w),
      startDate: new Date(recordedAt).toISOString(),
      metadata: { source: 'openGym' },
    });
    return true;
  } catch (err) {
    console.error('Failed to log body weight to Health:', err);
    return false;
  }
}
