import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, getUserId, notFound, num, ok, str, unauthorized } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ownedCategory(uid: string, id: string) {
  return prisma.atomCategory.findFirst({ where: { id, class: { userId: uid } } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const cat = await ownedCategory(uid, params.id);
  if (!cat) return notFound();

  const b = await body(req);
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) {
    const n = str(b.name, 80);
    if (!n) return bad("Category name is required.");
    data.name = n;
  }
  if (b.weight !== undefined) data.weight = num(b.weight) ?? 0;
  if (b.dropLowest !== undefined) data.dropLowest = Math.max(0, Math.trunc(num(b.dropLowest) ?? 0));
  if (b.sortOrder !== undefined) data.sortOrder = Math.trunc(num(b.sortOrder) ?? 0);

  const updated = await prisma.atomCategory.update({ where: { id: params.id }, data });
  return ok({ category: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const cat = await ownedCategory(uid, params.id);
  if (!cat) return notFound();
  await prisma.atomCategory.delete({ where: { id: params.id } });
  return ok({ ok: true });
}
