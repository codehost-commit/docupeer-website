import "server-only";
import { prisma } from "@/lib/db";
import {
  STATUS_LEVELS,
  STATUS_PHASES,
  type StatusHistoryPayload,
  type StatusLevel,
  type StatusPhase,
  type StatusReportPayload,
  type StatusSnapshotPayload,
  type StatusStatePayload,
} from "@/lib/status-shared";

const STATUS_STATE_ID = "global";
const STATUS_BUCKET_MS = 5 * 60 * 1000;
const STATUS_24H_MS = 24 * 60 * 60 * 1000;
const STATUS_HISTORY_BUCKETS = 288;
const STATUS_HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const REPORT_LIMIT = 500;

function dateMs(value: Date | null | undefined) {
  return value ? value.getTime() : null;
}

function wholeInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export function statusBucket(value = Date.now()) {
  return Math.floor(Number(value || Date.now()) / STATUS_BUCKET_MS) * STATUS_BUCKET_MS;
}

export function normalizeStatusLevel(value: unknown, fallback: StatusLevel = 1): StatusLevel {
  const level = wholeInteger(value, fallback);
  return STATUS_LEVELS.includes(level as StatusLevel) ? (level as StatusLevel) : fallback;
}

export function normalizeStatusPhase(level: StatusLevel, value: unknown): StatusPhase {
  if (level <= 1) return "";
  const phase = String(value || "").trim().toLowerCase();
  return STATUS_PHASES.includes(phase as Exclude<StatusPhase, "">)
    ? (phase as StatusPhase)
    : "investigating";
}

export function normalizeEta(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(Number(value));
  return Number.isFinite(date.getTime()) && date.getTime() > 0 ? date : null;
}

function stateToPayload(state: {
  level: number;
  phase: string | null;
  maintenanceMode: boolean;
  etaAt: Date | null;
  updatedAt: Date;
}): StatusStatePayload {
  const level = normalizeStatusLevel(state.level);
  return {
    level,
    phase: normalizeStatusPhase(level, state.phase),
    maintenanceMode: state.maintenanceMode,
    etaAt: dateMs(state.etaAt),
    updatedAt: state.updatedAt.getTime(),
  };
}

function reportToPayload(report: {
  id: string;
  statusLevel: number;
  phase: string | null;
  message: string;
  createdAt: Date;
}): StatusReportPayload {
  const statusLevel = normalizeStatusLevel(report.statusLevel);
  return {
    id: report.id,
    statusLevel,
    phase: normalizeStatusPhase(statusLevel, report.phase),
    message: report.message,
    createdAt: report.createdAt.getTime(),
  };
}

export async function ensureStatusState() {
  const now = new Date();
  let state = await prisma.siteStatusState.findUnique({
    where: { id: STATUS_STATE_ID },
  });

  if (!state) {
    try {
      state = await prisma.siteStatusState.create({
        data: {
          id: STATUS_STATE_ID,
          level: 1,
          phase: null,
          maintenanceMode: false,
          etaAt: null,
          updatedAt: now,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
      state = await prisma.siteStatusState.findUnique({
        where: { id: STATUS_STATE_ID },
      });
      if (!state) throw err;
    }
  }

  try {
    await prisma.siteStatusHistory.upsert({
      where: { bucketTs: new Date(statusBucket(now.getTime())) },
      update: {},
      create: {
        bucketTs: new Date(statusBucket(now.getTime())),
        statusLevel: normalizeStatusLevel(state.level),
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code !== "P2002") throw err;
  }

  return state;
}

async function pruneStatusHistory(now = Date.now()) {
  await prisma.siteStatusHistory.deleteMany({
    where: {
      bucketTs: {
        lt: new Date(statusBucket(now - STATUS_HISTORY_RETENTION_MS)),
      },
    },
  });
}

async function backfillStatusHistory(now = Date.now(), currentLevel?: StatusLevel) {
  const level = currentLevel ?? normalizeStatusLevel((await ensureStatusState()).level);
  const currentBucket = statusBucket(now);
  const latest = await prisma.siteStatusHistory.findFirst({
    orderBy: { bucketTs: "desc" },
  });

  if (!latest) {
    await prisma.siteStatusHistory.create({
      data: { bucketTs: new Date(currentBucket), statusLevel: level },
    });
    await pruneStatusHistory(now);
    return;
  }

  const writes: { bucketTs: Date; statusLevel: StatusLevel }[] = [];
  for (
    let bucket = statusBucket(latest.bucketTs.getTime()) + STATUS_BUCKET_MS;
    bucket <= currentBucket;
    bucket += STATUS_BUCKET_MS
  ) {
    writes.push({ bucketTs: new Date(bucket), statusLevel: level });
  }

  if (writes.length) {
    await prisma.siteStatusHistory.createMany({
      data: writes,
      skipDuplicates: true,
    });
  }
  await pruneStatusHistory(now);
}

async function statusHistory24h(now = Date.now(), currentLevel: StatusLevel) {
  await backfillStatusHistory(now, currentLevel);
  const currentBucket = statusBucket(now);
  const firstBucket = currentBucket - (STATUS_HISTORY_BUCKETS - 1) * STATUS_BUCKET_MS;
  const [rows, previous] = await Promise.all([
    prisma.siteStatusHistory.findMany({
      where: {
        bucketTs: {
          gte: new Date(firstBucket),
          lte: new Date(currentBucket),
        },
      },
      orderBy: { bucketTs: "asc" },
    }),
    prisma.siteStatusHistory.findFirst({
      where: { bucketTs: { lt: new Date(firstBucket) } },
      orderBy: { bucketTs: "desc" },
    }),
  ]);

  const rowMap = new Map(rows.map((row) => [
    statusBucket(row.bucketTs.getTime()),
    normalizeStatusLevel(row.statusLevel, currentLevel),
  ]));
  let carry = normalizeStatusLevel(previous?.statusLevel, currentLevel);
  const out: StatusHistoryPayload[] = [];

  for (let bucket = firstBucket; bucket <= currentBucket; bucket += STATUS_BUCKET_MS) {
    if (rowMap.has(bucket)) carry = rowMap.get(bucket) ?? carry;
    out.push({ bucketTs: bucket, statusLevel: carry });
  }

  return out;
}

export async function getStatusSnapshot(options: { includeOlderReports?: boolean } = {}): Promise<StatusSnapshotPayload> {
  const now = Date.now();
  const state = await ensureStatusState();
  const status = stateToPayload(state);
  const since = new Date(now - STATUS_24H_MS);
  const [history, recentReports, olderReports] = await Promise.all([
    statusHistory24h(now, status.level),
    prisma.siteStatusReport.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: REPORT_LIMIT,
    }),
    options.includeOlderReports
      ? prisma.siteStatusReport.findMany({
          where: { createdAt: { lt: since } },
          orderBy: { createdAt: "desc" },
          take: REPORT_LIMIT,
        })
      : Promise.resolve([]),
  ]);

  return {
    status,
    history,
    reports24h: recentReports.map(reportToPayload),
    olderReports: olderReports.map(reportToPayload),
    serverTime: now,
  };
}

export async function saveStatusState(input: {
  level?: unknown;
  phase?: unknown;
  maintenanceMode?: unknown;
  etaAt?: unknown;
}) {
  const current = await ensureStatusState();
  const currentLevel = normalizeStatusLevel(current.level);
  const now = Date.now();
  await backfillStatusHistory(now, currentLevel);

  const level = normalizeStatusLevel(input.level, currentLevel);
  const phase = normalizeStatusPhase(level, input.phase);
  const updated = await prisma.siteStatusState.update({
    where: { id: STATUS_STATE_ID },
    data: {
      level,
      phase: phase || null,
      maintenanceMode: !!input.maintenanceMode,
      etaAt: normalizeEta(input.etaAt),
      updatedAt: new Date(now),
    },
  });

  await prisma.siteStatusHistory.upsert({
    where: { bucketTs: new Date(statusBucket(now)) },
    update: { statusLevel: level },
    create: { bucketTs: new Date(statusBucket(now)), statusLevel: level },
  });

  return stateToPayload(updated);
}

export async function addStatusReport(messageInput: unknown) {
  const message = String(messageInput || "").trim().slice(0, 4000);
  if (!message) {
    const err = new Error("A status report message is required.") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const state = stateToPayload(await ensureStatusState());
  await prisma.siteStatusReport.create({
    data: {
      statusLevel: state.level,
      phase: state.phase || null,
      message,
    },
  });
}

export function hasStatusManageAccess(req: Request) {
  return req.headers.get("x-docupeer-status-admin") === "browser-managed";
}
