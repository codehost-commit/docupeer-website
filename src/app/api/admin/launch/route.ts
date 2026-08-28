import { requireAdminSession } from "@/lib/admin-auth";
import { getLaunchSnapshot, launchFeature } from "@/lib/launch";
import { handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return json({ launch: await getLaunchSnapshot() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST() {
  try {
    await requireAdminSession();
    return json({ launch: await launchFeature() });
  } catch (error) {
    return handleRouteError(error);
  }
}
