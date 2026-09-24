import { prisma } from "@/lib/db";
import { getUserId, ok, unauthorized } from "@/lib/atom/api";
import { emailConfigured, pushConfigured, sendEmail, sendPushToUser } from "@/lib/atom/notify";
import { getSettings } from "@/lib/atom/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Test-notification button: sends a sample through whatever channels are on.
export async function POST() {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const settings = await getSettings(uid);
  const title = "Atom test notification";
  const bodyText = "Nice — reminders are working. You'll get notices like this before your deadlines.";

  const result: { push: { sent: number; removed: number }; email: boolean; pushConfigured: boolean; emailConfigured: boolean } = {
    push: { sent: 0, removed: 0 },
    email: false,
    pushConfigured: pushConfigured(),
    emailConfigured: emailConfigured(),
  };

  if (settings.pushEnabled) {
    result.push = await sendPushToUser(uid, { title, body: bodyText, url: process.env.ATOM_PUBLIC_URL || "https://atom.docupeer.org" });
  }
  if (settings.emailEnabled) {
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { email: true } });
    if (user?.email) result.email = await sendEmail(user.email, title, `<p>${bodyText}</p>`);
  }
  return ok(result);
}
