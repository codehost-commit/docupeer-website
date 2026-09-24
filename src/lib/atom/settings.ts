import "server-only";
import { prisma } from "@/lib/db";
import { DEFAULT_REMINDERS } from "./types";

export interface AtomSettingsShape {
  pushEnabled: boolean;
  emailEnabled: boolean;
  reminderDefaults: Record<string, number[]>;
  categoryMutes: Record<string, boolean>;
  quietHours: { enabled: boolean; start: string; end: string };
  timezone: string;
}

export const DEFAULT_SETTINGS: AtomSettingsShape = {
  pushEnabled: true,
  emailEnabled: false,
  reminderDefaults: { ...DEFAULT_REMINDERS },
  categoryMutes: { assignment: false, test: false, project: false, ec: false, task: false },
  quietHours: { enabled: false, start: "22:00", end: "07:00" },
  timezone: "America/Chicago",
};

// Read the user's settings row, filling defaults for any unset JSON fields.
export async function getSettings(userId: string): Promise<AtomSettingsShape> {
  const row = await prisma.atomSettings.findUnique({ where: { userId } });
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    pushEnabled: row.pushEnabled,
    emailEnabled: row.emailEnabled,
    reminderDefaults: (row.reminderDefaults as Record<string, number[]>) ?? DEFAULT_SETTINGS.reminderDefaults,
    categoryMutes: (row.categoryMutes as Record<string, boolean>) ?? DEFAULT_SETTINGS.categoryMutes,
    quietHours: (row.quietHours as AtomSettingsShape["quietHours"]) ?? DEFAULT_SETTINGS.quietHours,
    timezone: row.timezone ?? DEFAULT_SETTINGS.timezone,
  };
}
