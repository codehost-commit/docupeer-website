import { NextRequest } from "next/server";
import { bad, body, getUserId, ok, reqStr, unauthorized } from "@/lib/atom/api";
import { standardizeGrades } from "@/lib/atom/import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Step 1-3 of import: upload/paste -> parse/standardize -> show detected rows.
// This NEVER writes to the database. The client reviews and edits before commit.
export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const kind = reqStr(b.kind, 20) || "text"; // "text" | "csv" | "image"

  if (kind === "image") {
    // Screenshot/PDF OCR is a pluggable step (see ATOM-CONNECT.md). Not wired yet:
    // extract text first, then pass it here as kind "text".
    return bad(
      "Screenshot & PDF import needs an OCR/vision step that isn't connected yet. Paste the grades as text or upload a CSV for now.",
      501,
    );
  }

  const text = reqStr(b.text, 20000);
  if (!text) return bad("Paste your grades or upload a CSV to import.");

  const result = await standardizeGrades(text);
  return ok(result);
}
