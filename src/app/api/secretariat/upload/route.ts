import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractPaperText, getTokenStatus } from "@/lib/secretariat";
import { sanitizeLine } from "@/lib/sanitize";
import { json, error, handleRouteError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/secretariat/upload  (multipart form-data, field "file")
// Accepts a PDF or DOCX, extracts its text, and opens a new chat around it.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const rl = rateLimit(`ai-upload:${user.id}`, 20, 60 * 60 * 1000);
    if (!rl.ok) return error("Too many uploads too quickly. Slow down.", 429);

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return error("No file uploaded.", 400);

    const name = sanitizeLine(file.name || "paper", 200);
    const lower = name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx"))
      return error("Only PDF and DOCX files are accepted.", 415);

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) return error("That file is empty.", 400);

    const { text, wordCount } = await extractPaperText(name, buf);
    if (!text || text.trim().length < 20)
      return error(
        "Could not read any text from that file. If it's a scanned PDF, export a text-based version and try again.",
        422
      );

    const chat = await prisma.aiChat.create({
      data: { userId: user.id, paperName: name, paperText: text, wordCount },
      select: { id: true, title: true, paperName: true, wordCount: true, updatedAt: true },
    });
    const tokens = await getTokenStatus(user.id);
    return json({ chat, tokens }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
