import { getPublicTalk } from "@/lib/tpt";
import { handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getPublicTalk());
  } catch (err) {
    return handleRouteError(err);
  }
}
