import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, handleRouteError } from "@/lib/http";

// GET /api/reviews/received -> feedback the current user has received on their
// own papers. Reviewer identity is deliberately NOT included. anonymity runs
// in both directions.
export async function GET() {
  try {
    const user = await requireUser();

    const papers = await prisma.paper.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        text: true,
        category: true,
        specialty: true,
        educationLevel: true,
        createdAt: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            comment: true,
            createdAt: true,
            // NOTE: reviewerId intentionally omitted.
            annotations: {
              select: {
                id: true,
                startOffset: true,
                endOffset: true,
                quotedText: true,
                kind: true,
                body: true,
              },
            },
          },
        },
      },
    });

    return json({ papers });
  } catch (err) {
    return handleRouteError(err);
  }
}
