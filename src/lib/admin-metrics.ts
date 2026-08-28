import "server-only";
import { prisma } from "@/lib/db";

const ADMIN_METRICS_ID = "global";

export type AdminMetricsPayload = {
  pageViews: number;
  users: number;
  papersUploaded: number;
  updatedAt: number;
};

export async function ensureAdminMetrics() {
  const now = new Date();
  let metrics = await prisma.adminMetrics.findUnique({
    where: { id: ADMIN_METRICS_ID },
  });

  if (!metrics) {
    try {
      metrics = await prisma.adminMetrics.create({
        data: {
          id: ADMIN_METRICS_ID,
          pageViews: 0,
          updatedAt: now,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
      metrics = await prisma.adminMetrics.findUnique({
        where: { id: ADMIN_METRICS_ID },
      });
      if (!metrics) throw err;
    }
  }

  return metrics;
}

// Count a unique page view. `visitorId` should be a stable per-visitor id
// (a long-lived, http-only cookie) so refreshes and re-navigations by the
// same browser are counted at most once.
export async function recordUniquePageView(visitorId: string) {
  if (!visitorId) return;
  await ensureAdminMetrics();
  try {
    await prisma.pageViewVisitor.create({
      data: { visitorId },
    });
  } catch (err) {
    // Unique constraint violation — this visitor is already counted.
    if ((err as { code?: string }).code === "P2002") return;
    throw err;
  }
  await prisma.adminMetrics.update({
    where: { id: ADMIN_METRICS_ID },
    data: {
      pageViews: { increment: 1 },
    },
  });
}

export async function getAdminMetrics(): Promise<AdminMetricsPayload> {
  const [metrics, users, papersUploaded] = await Promise.all([
    ensureAdminMetrics(),
    prisma.user.count(),
    prisma.paper.count(),
  ]);

  return {
    pageViews: metrics.pageViews,
    users,
    papersUploaded,
    updatedAt: metrics.updatedAt.getTime(),
  };
}
