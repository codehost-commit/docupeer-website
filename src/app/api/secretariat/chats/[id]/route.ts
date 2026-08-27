import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTokenStatus } from "@/lib/secretariat";
import { json, error, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/secretariat/chats/:id -> one chat with its messages.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const chat = await prisma.aiChat.findFirst({
      where: { id: params.id, userId: user.id },
      select: {
        id: true,
        title: true,
        paperName: true,
        wordCount: true,
        createdAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });
    if (!chat) return error("Chat not found.", 404);
    const tokens = await getTokenStatus(user.id);
    return json({ chat, tokens });
  } catch (err) {
    return handleRouteError(err);
  }
}

// DELETE /api/secretariat/chats/:id -> remove a chat (and its messages).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const existing = await prisma.aiChat.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return error("Chat not found.", 404);
    await prisma.aiChat.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
