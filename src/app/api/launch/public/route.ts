import { getLaunchSnapshot } from "@/lib/launch";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const launch = await getLaunchSnapshot();
  return NextResponse.json(
    { launch },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
