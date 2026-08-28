import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sanitizeText } from "@/lib/sanitize";
import { json, error, handleRouteError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { MIN_PROMPT_CHARS, MAX_PROMPT_WORDS, countWords } from "@/lib/constants";
import {
  getTokenStatus,
  consumeToken,
  optimizePrompt,
  nameChat,
  answerAboutPaper,
} from "@/lib/secretariat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/secretariat/chats/:id/message  { content }
// Flow: validate -> gate on tokens -> optimize the prompt ->
// answer -> persist user+assistant turns, name the
// chat on the first message, and charge exactly one token on success.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    const rl = rateLimit(`ai-msg:${user.id}`, 60, 60 * 60 * 1000);
    if (!rl.ok) return error("Too many messages too quickly. Slow down.", 429);

    const body = await req.json().catch(() => ({}));
    const content = sanitizeText(body.content ?? "", 5000).trim();
    if (content.length < MIN_PROMPT_CHARS)
      return error(
        `Your prompt must be at least ${MIN_PROMPT_CHARS} characters.`,
        422,
        { code: "TOO_SHORT" }
      );
    if (countWords(content) > MAX_PROMPT_WORDS)
      return error(`Your prompt must be ${MAX_PROMPT_WORDS} words or fewer.`, 422, {
        code: "TOO_LONG",
      });

    const chat = await prisma.aiChat.findFirst({
      where: { id: params.id, userId: user.id },
      select: {
        id: true,
        title: true,
        paperName: true,
        paperText: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        },
      },
    });
    if (!chat) return error("Chat not found.", 404);

    // Gate on credits BEFORE any paid model work.
    const pre = await getTokenStatus(user.id);
    if (pre.totalAvailable <= 0)
      return error(
        "You're out of Secretariat tokens. Complete a peer review to unlock 2 more, or wait for your free daily prompt.",
        402,
        { code: "NO_CREDITS", tokens: pre }
      );

    // Compress the question to save context for the answer.
    const optimized = await optimizePrompt(content);

    const answer = await answerAboutPaper({
      paperName: chat.paperName,
      paperText: chat.paperText,
      history: chat.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      question: optimized,
    });

    // Only on a successful answer do we persist + charge.
    const isFirst = chat.messages.length === 0;
    const title = isFirst ? await nameChat(content) : chat.title;

    await prisma.$transaction([
      prisma.aiMessage.create({
        data: { chatId: chat.id, role: "user", content },
      }),
      prisma.aiMessage.create({
        data: { chatId: chat.id, role: "assistant", content: answer },
      }),
      prisma.aiChat.update({
        where: { id: chat.id },
        data: isFirst ? { title, titled: true } : { updatedAt: new Date() },
      }),
    ]);

    const tokens = await consumeToken(user.id);
    return json({ answer, title, tokens }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
