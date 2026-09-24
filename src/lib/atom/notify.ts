import "server-only";
import webpush from "web-push";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { getSettings } from "./settings";
import { reminderDedupeKey, reminderInstants, reminderDueInWindow, MIN } from "./dates";
import { reminderScopeForAssignment, type AssignmentType, type ReminderScope } from "./types";

// ---- Web Push (VAPID) ----
const VAPID_PUBLIC = process.env.ATOM_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.ATOM_VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.ATOM_VAPID_SUBJECT || "mailto:hello@docupeer.org";
let vapidReady = false;
function ensureVapid(): boolean {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
  }
  return true;
}
export function vapidPublicKey(): string {
  return VAPID_PUBLIC;
}
export function pushConfigured(): boolean {
  return !!(VAPID_PUBLIC && VAPID_PRIVATE);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!ensureVapid()) return { sent: 0, removed: 0 };
  const subs = await prisma.atomPushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await prisma.atomPushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        removed++;
      }
    }
  }
  return { sent, removed };
}

// ---- Email (Resend) ----
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.ATOM_EMAIL_FROM || "Atom by DocuPeer <atom@docupeer.org>";
export function emailConfigured(): boolean {
  return !!RESEND_KEY;
}
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_KEY) return false;
  try {
    const resend = new Resend(RESEND_KEY);
    await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    return true;
  } catch {
    return false;
  }
}

function emailHtml(title: string, body: string, url?: string): string {
  const link = url ? `<p style="margin:20px 0"><a href="${url}" style="background:#356d97;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open Atom</a></p>` : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1c2b">
  <h2 style="color:#356d97;margin:0 0 8px">${title}</h2>
  <p style="font-size:15px;line-height:1.5;color:#3f4560">${body}</p>${link}
  <p style="font-size:12px;color:#6a7495;margin-top:28px">You're receiving this because email reminders are on in Atom. Change this in Settings → Notifications.</p>
</div>`;
}

// ---- Reminder phrasing ----
function offsetPhrase(minutes: number): string {
  if (minutes >= 1440) {
    const d = Math.round(minutes / 1440);
    return d === 1 ? "tomorrow" : `in ${d} days`;
  }
  if (minutes >= 60) {
    const h = Math.round(minutes / 60);
    return h === 1 ? "in 1 hour" : `in ${h} hours`;
  }
  return `in ${minutes} minutes`;
}

interface Candidate {
  userId: string;
  itemType: "assignment" | "ec" | "task";
  itemId: string;
  scope: ReminderScope;
  dedupeKey: string;
  title: string;
  body: string;
  url: string;
}

const ATOM_URL = process.env.ATOM_PUBLIC_URL || "https://atom.docupeer.org";

// Core sweep: find reminders whose fire-time lands in (now-window, now], create a
// notification once (dedupe), and deliver via the user's enabled channels.
export async function runReminderSweep(now = new Date(), windowMinutes = 20) {
  const windowStart = new Date(now.getTime() - windowMinutes * MIN);
  const summary = { usersScanned: 0, created: 0, pushSent: 0, emailSent: 0 };

  const users = await prisma.user.findMany({
    where: { atomOnboardedAt: { not: null } },
    select: { id: true, email: true, name: true },
  });

  for (const user of users) {
    const settings = await getSettings(user.id);
    if (!settings.pushEnabled && !settings.emailEnabled) continue;
    summary.usersScanned++;

    const allOffsets = Object.values(settings.reminderDefaults).flat();
    const maxLookahead = (Math.max(60, ...allOffsets) + windowMinutes) * MIN;
    const upper = new Date(now.getTime() + maxLookahead);
    const lower = new Date(now.getTime() - MIN);

    const [assignments, ecs, tasks] = await Promise.all([
      prisma.atomAssignment.findMany({
        where: { userId: user.id, status: { not: "completed" }, dueAt: { gte: lower, lte: upper } },
        include: { class: { select: { name: true } } },
      }),
      prisma.atomECDeadline.findMany({
        where: { userId: user.id, status: { not: "completed" }, dueAt: { gte: lower, lte: upper } },
      }),
      prisma.atomTask.findMany({
        where: { userId: user.id, status: { not: "completed" }, dueAt: { gte: lower, lte: upper } },
      }),
    ]);

    const candidates: Candidate[] = [];
    const pushCandidate = (
      itemType: Candidate["itemType"],
      itemId: string,
      scope: ReminderScope,
      dueAt: Date | null,
      title: string,
      bodyName: string,
    ) => {
      if (settings.categoryMutes[scope]) return;
      const offsets = settings.reminderDefaults[scope] ?? [];
      const instants = reminderInstants(dueAt ? dueAt.toISOString() : null, offsets);
      for (const inst of instants) {
        if (!reminderDueInWindow(inst.at, windowStart, now)) continue;
        candidates.push({
          userId: user.id,
          itemType,
          itemId,
          scope,
          dedupeKey: reminderDedupeKey(itemType, itemId, inst.offsetMinutes),
          title,
          body: `${bodyName} is due ${offsetPhrase(inst.offsetMinutes)}.`,
          url: ATOM_URL,
        });
      }
    };

    for (const a of assignments) {
      const scope = reminderScopeForAssignment(a.type as AssignmentType);
      const label = a.class?.name ? `${a.class.name} ${a.name}` : a.name;
      pushCandidate("assignment", a.id, scope, a.dueAt, a.name, label);
    }
    for (const e of ecs) pushCandidate("ec", e.id, "ec", e.dueAt, e.name, e.name);
    for (const t of tasks) pushCandidate("task", t.id, "task", t.dueAt, t.title, t.title);

    for (const c of candidates) {
      // Dedupe: create only if this reminder was never made for the user.
      const existing = await prisma.atomNotification.findUnique({
        where: { userId_dedupeKey: { userId: c.userId, dedupeKey: c.dedupeKey } },
      });
      if (existing) continue;

      const notif = await prisma.atomNotification.create({
        data: {
          userId: c.userId,
          kind: "reminder",
          title: c.title,
          body: c.body,
          url: c.url,
          itemType: c.itemType,
          itemId: c.itemId,
          dedupeKey: c.dedupeKey,
        },
      });
      summary.created++;

      if (settings.pushEnabled && pushConfigured()) {
        const r = await sendPushToUser(c.userId, { title: c.title, body: c.body, url: c.url, tag: c.dedupeKey });
        if (r.sent > 0) {
          summary.pushSent += r.sent;
          await prisma.atomNotification.update({ where: { id: notif.id }, data: { pushSentAt: new Date() } });
        }
      }
      if (settings.emailEnabled && emailConfigured() && user.email) {
        const sent = await sendEmail(user.email, c.title, emailHtml(c.title, c.body, c.url));
        if (sent) {
          summary.emailSent++;
          await prisma.atomNotification.update({ where: { id: notif.id }, data: { emailSentAt: new Date() } });
        }
      }
    }
  }

  return summary;
}
