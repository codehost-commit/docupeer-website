import { NextRequest } from "next/server";
import { bad, body, getUserId, ok, reqStr, unauthorized } from "@/lib/atom/api";
import { standardizeGradeImage, standardizeGradeReport, standardizeGrades } from "@/lib/atom/import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Step 1-3 of import: upload/paste -> parse/standardize -> show detected rows.
// This NEVER writes to the database. The client reviews and edits before commit.
export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return bad("Choose a PDF, image, CSV, or text file first.");
    if (file.size > 3_500_000) return bad("That file is too large. Please use a file under 3.5 MB.");

    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    if (type === "application/pdf" || name.endsWith(".pdf")) {
      try {
        const { extractText, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
        const extracted = await extractText(pdf, { mergePages: true });
        const text = Array.isArray(extracted.text) ? extracted.text.join("\n") : String(extracted.text || "");
        if (!text.trim()) return bad("That PDF has no readable text. Upload a screenshot/photo of the grade page instead.", 422);
        return ok(await standardizeGradeReport(text));
      } catch {
        return bad("I could not read that PDF. Try exporting it again or upload a clear screenshot.", 422);
      }
    }

    if (type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name)) {
      const mime = type.startsWith("image/") ? type : "image/jpeg";
      const dataUri = `data:${mime};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
      return ok(await standardizeGradeImage(dataUri));
    }

    const text = await file.text();
    if (!text.trim()) return bad("That file is empty.");
    return ok(await standardizeGrades(text));
  }

  const b = await body(req);
  const kind = reqStr(b.kind, 20) || "text";
  const text = reqStr(b.text, 20000);
  if (!text) return bad("Paste your grades or upload a file to import.");
  return ok(kind === "report" ? await standardizeGradeReport(text) : await standardizeGrades(text));
}
