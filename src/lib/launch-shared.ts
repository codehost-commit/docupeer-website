export const FEATURE_LAUNCH_TARGET = "2026-08-20T04:50:00.000Z";
export const FEATURE_LAUNCH_LABEL = "11:50 PM CDT · AUG 19, 2026";

export type LaunchSnapshot = {
  isLaunched: boolean;
  targetAt: string;
  launchedAt: string | null;
  updatedAt: string;
};

export function defaultLaunchSnapshot(): LaunchSnapshot {
  return {
    isLaunched: false,
    targetAt: FEATURE_LAUNCH_TARGET,
    launchedAt: null,
    updatedAt: new Date(0).toISOString(),
  };
}

export function launchTimeParts(targetAt: string, now = Date.now()) {
  const remaining = Math.max(0, new Date(targetAt).getTime() - now);
  return {
    remaining,
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };
}
