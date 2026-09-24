import { NextRequest } from "next/server";
import { ok } from "@/lib/atom/api";
import { NextResponse } from "next/server";
import { runReminderSweep } from "@/lib/atom/notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Scheduled by Vercel Cron (see vercel.json). Protected by CRON_SECRET, which
// Vercel sends as `Authorization: Bearer <CRON_SECRET>`. Window should match the
// cron interval; default 75m suits an hourly schedule.
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured. Set it to enable reminders." }, { status: 503 });
  }
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-cron-secret") ||
    url.searchParams.get("secret");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const windowMinutes = Number(url.searchParams.get("window") || process.env.ATOM_CRON_WINDOW_MINUTES || 75);
  const summary = await runReminderSweep(new Date(), Number.isFinite(windowMinutes) ? windowMinutes : 75);
  return ok({ ok: true, ...summary });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
