import { getLiveSnapshot } from "@/lib/live";
import { json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getLiveSnapshot());
  } catch (err) {
    return handleRouteError(err);
  }
}
