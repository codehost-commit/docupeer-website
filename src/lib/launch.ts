import "server-only";
import { prisma } from "@/lib/db";
import {
  FEATURE_LAUNCH_TARGET,
  defaultLaunchSnapshot,
  type LaunchSnapshot,
} from "@/lib/launch-shared";

function serializeLaunchState(state: {
  isLaunched: boolean;
  targetAt: Date;
  launchedAt: Date | null;
  updatedAt: Date;
}): LaunchSnapshot {
  return {
    isLaunched: state.isLaunched,
    targetAt: state.targetAt.toISOString(),
    launchedAt: state.launchedAt?.toISOString() ?? null,
    updatedAt: state.updatedAt.toISOString(),
  };
}

export async function getLaunchSnapshot() {
  try {
    const state = await prisma.siteLaunchState.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        targetAt: new Date(FEATURE_LAUNCH_TARGET),
      },
    });
    return serializeLaunchState(state);
  } catch (error) {
    console.error("Could not load feature launch state", error);
    return defaultLaunchSnapshot();
  }
}

export async function launchFeature() {
  const launchedAt = new Date();
  const state = await prisma.siteLaunchState.upsert({
    where: { id: "global" },
    update: {
      isLaunched: true,
      launchedAt,
    },
    create: {
      id: "global",
      isLaunched: true,
      targetAt: new Date(FEATURE_LAUNCH_TARGET),
      launchedAt,
    },
  });
  return serializeLaunchState(state);
}
