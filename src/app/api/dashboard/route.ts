import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { json, handleRouteError } from "@/lib/http";
import { REVIEWS_PER_CREDIT } from "@/lib/constants";

// GET /api/dashboard -> all the numbers the dashboard shows, computed
// server-side from authoritative counts.
export async function GET() {
  try {
    const user = await requireUser();
    const status = await getCreditStatus(user.id);

    return json({
      profile: {
        name: user.name,
        expertiseCategory: user.expertiseCategory,
        specialty: user.specialty,
        educationLevel: user.educationLevel,
        gradeYear: user.gradeYear,
        strength: user.strength,
      },
      stats: {
        ...status,
        reviewsPerCredit: REVIEWS_PER_CREDIT,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
