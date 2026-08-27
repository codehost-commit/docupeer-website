import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTokenStatus } from "@/lib/secretariat";
import { json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/secretariat/chats -> the user's chats (newest first) + token pool.
export async function GET() {
  try {
    const user = await requireUser();
    const [chats, tokens] = await Promise.all([
      prisma.aiChat.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          paperName: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      }),
      getTokenStatus(user.id),
    ]);
    return json({ chats, tokens });
  } catch (err) {
    return handleRouteError(err);
  }
}
