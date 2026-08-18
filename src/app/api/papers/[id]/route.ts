import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json, error, handleRouteError } from "@/lib/http";

// GET /api/papers/:id -> anonymous paper for reviewing.
// The author's name, email, and identity are NEVER included in the response.
// Reviewing is open to logged-out visitors, but a user may not fetch their own
// paper through this anonymous endpoint (they can't review their own work).
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paper = await prisma.paper.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorId: true,
        title: true,
        category: true,
        specialty: true,
        educationLevel: true,
        paperType: true,
        feedbackWanted: true,
        text: true,
        wordCount: true,
        createdAt: true,
      },
    });

    if (!paper) return error("Paper not found.", 404);

    const user = await getCurrentUser();
    if (user && user.id === paper.authorId) {
      return error("You cannot review your own paper.", 403, {
        code: "OWN_PAPER",
      });
    }

    // Strip authorId before returning. anonymity guarantee.
    const { authorId, ...anonymous } = paper;
    void authorId;
    return json({ paper: anonymous });
  } catch (err) {
    return handleRouteError(err);
  }
}
