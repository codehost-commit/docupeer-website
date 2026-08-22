import "server-only";
import { prisma } from "@/lib/db";

const ADMIN_METRICS_ID = "global";

export type AdminMetricsPayload = {
  pageViews: number;
  signedUpUsers: number;
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

export async function incrementPageView() {
  await ensureAdminMetrics();
  await prisma.adminMetrics.update({
    where: { id: ADMIN_METRICS_ID },
    data: {
      pageViews: { increment: 1 },
    },
  });
}

export async function getAdminMetrics(): Promise<AdminMetricsPayload> {
  const [metrics, realSignedUpUsers, realPapersUploaded] = await Promise.all([
    ensureAdminMetrics(),
    prisma.user.count(),
    prisma.paper.count(),
  ]);

  return {
    pageViews: metrics.pageViews,
    signedUpUsers: realSignedUpUsers,
    papersUploaded: realPapersUploaded,
    updatedAt: metrics.updatedAt.getTime(),
  };
}
