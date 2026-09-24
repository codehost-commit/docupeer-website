import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, getUserId, num, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import type { GpaWeight, GradingSystem } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GRADING: GradingSystem[] = ["weighted", "points"];
const GPA_WEIGHTS: GpaWeight[] = ["regular", "honors", "ap"];

const classInclude = { categories: { orderBy: { sortOrder: "asc" as const } } };

export async function GET() {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const classes = await prisma.atomClass.findMany({
    where: { userId: uid },
    orderBy: [{ archived: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: classInclude,
  });
  return ok({ classes });
}

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const name = str(b.name, 120);
  if (!name) return bad("Class name is required.");

  const count = await prisma.atomClass.count({ where: { userId: uid } });

  const cls = await prisma.atomClass.create({
    data: {
      userId: uid,
      name,
      teacher: str(b.teacher, 120),
      period: str(b.period, 60),
      schoolYear: str(b.schoolYear, 40),
      term: str(b.term, 40),
      credits: num(b.credits) ?? 1,
      gradingSystem: oneOf(b.gradingSystem, GRADING, "weighted"),
      color: str(b.color, 20) ?? "#356d97",
      includeInGpa: bool(b.includeInGpa, true),
      gpaWeight: oneOf(b.gpaWeight, GPA_WEIGHTS, "regular"),
      importedGradePercent: num(b.importedGradePercent),
      importedGradeLetter: str(b.importedGradeLetter, 10),
      sortOrder: count,
      categories: Array.isArray(b.categories)
        ? {
            create: (b.categories as Record<string, unknown>[]).slice(0, 20).map((c, i) => ({
              name: str(c.name, 80) ?? `Category ${i + 1}`,
              weight: num(c.weight) ?? 0,
              dropLowest: Math.max(0, Math.trunc(num(c.dropLowest) ?? 0)),
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: classInclude,
  });
  return ok({ class: cls });
}
