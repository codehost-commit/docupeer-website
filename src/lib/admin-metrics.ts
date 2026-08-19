import "server-only";
import { prisma } from "@/lib/db";

const ADMIN_METRICS_ID = "global";
const MAX_METRIC_VALUE = 999_999_999;

export type AdminMetricsPayload = {
  pageViews: number;
  signedUpUsers: number;
  papersUploaded: number;
  realSignedUpUsers: number;
  realPapersUploaded: number;
  overrides: {
    signedUpUsers: number | null;
    papersUploaded: number | null;
  };
  updatedAt: number;
};

function cleanMetricValue(value: unknown) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(MAX_METRIC_VALUE, parsed));
}

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
    signedUpUsers: metrics.signedUpUsersOverride ?? realSignedUpUsers,
    papersUploaded: metrics.papersUploadedOverride ?? realPapersUploaded,
    realSignedUpUsers,
    realPapersUploaded,
    overrides: {
      signedUpUsers: metrics.signedUpUsersOverride,
      papersUploaded: metrics.papersUploadedOverride,
    },
    updatedAt: metrics.updatedAt.getTime(),
  };
}

export async function saveAdminMetrics(input: {
  pageViews?: unknown;
  signedUpUsers?: unknown;
  papersUploaded?: unknown;
}) {
  await ensureAdminMetrics();
  await prisma.adminMetrics.update({
    where: { id: ADMIN_METRICS_ID },
    data: {
      pageViews: cleanMetricValue(input.pageViews),
      signedUpUsersOverride: cleanMetricValue(input.signedUpUsers),
      papersUploadedOverride: cleanMetricValue(input.papersUploaded),
    },
  });
  return getAdminMetrics();
}
