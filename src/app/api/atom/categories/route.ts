import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, getUserId, num, ok, str, unauthorized } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const classId = str(b.classId, 40);
  const name = str(b.name, 80);
  if (!classId || !name) return bad("A class and category name are required.");

  const cls = await prisma.atomClass.findFirst({ where: { id: classId, userId: uid } });
  if (!cls) return bad("Class not found.", 404);

  const count = await prisma.atomCategory.count({ where: { classId } });
  const cat = await prisma.atomCategory.create({
    data: {
      classId,
      name,
      weight: num(b.weight) ?? 0,
      dropLowest: Math.max(0, Math.trunc(num(b.dropLowest) ?? 0)),
      sortOrder: count,
    },
  });
  return ok({ category: cat });
}
