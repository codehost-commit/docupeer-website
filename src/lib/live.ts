import "server-only";
import { prisma } from "@/lib/db";
import {
  DEFAULT_LIVE_DESCRIPTION,
  DEFAULT_LIVE_TITLE,
  type LiveSnapshotPayload,
  type LiveStatePayload,
} from "@/lib/live-shared";

const LIVE_STATE_ID = "global";
const LIVE_PEER_TTL_MS = 2 * 60 * 1000;

function defaultRoomName() {
  return `DocuPeerLive-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-main`;
}

function dateMs(value: Date | null | undefined) {
  return value ? value.getTime() : null;
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return (text || fallback).slice(0, maxLength);
}

function cleanRoomName(value: unknown, fallback = defaultRoomName()) {
  const room = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
  return room || fallback;
}

function cleanViewerCount(value: unknown) {
  const count = Math.round(Number(value || 0));
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(999999, count));
}

function liveToPayload(state: {
  isLive: boolean;
  title: string;
  description: string;
  roomName: string;
  viewerCount: number;
  startedAt: Date | null;
  endedAt: Date | null;
  updatedAt: Date;
}): LiveStatePayload {
  return {
    isLive: state.isLive,
    title: state.title,
    description: state.description,
    roomName: state.roomName,
    viewerCount: state.viewerCount,
    startedAt: dateMs(state.startedAt),
    endedAt: dateMs(state.endedAt),
    updatedAt: state.updatedAt.getTime(),
  };
}

export async function ensureLiveState() {
  const now = new Date();
  let state = await prisma.siteLiveState.findUnique({
    where: { id: LIVE_STATE_ID },
  });

  if (!state) {
    try {
      state = await prisma.siteLiveState.create({
        data: {
          id: LIVE_STATE_ID,
          isLive: false,
          title: DEFAULT_LIVE_TITLE,
          description: DEFAULT_LIVE_DESCRIPTION,
          roomName: defaultRoomName(),
          viewerCount: 0,
          updatedAt: now,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
      state = await prisma.siteLiveState.findUnique({
        where: { id: LIVE_STATE_ID },
      });
      if (!state) throw err;
    }
  }

  return state;
}

export async function getLiveSnapshot(): Promise<LiveSnapshotPayload> {
  const state = await ensureLiveState();
  return {
    live: liveToPayload(state),
    serverTime: Date.now(),
  };
}

export async function saveLiveState(input: {
  isLive?: unknown;
  title?: unknown;
  description?: unknown;
  roomName?: unknown;
  viewerCount?: unknown;
}) {
  const current = liveToPayload(await ensureLiveState());
  const nextIsLive = !!input.isLive;
  const now = new Date();
  const startedAt = nextIsLive && !current.isLive ? now : current.startedAt ? new Date(current.startedAt) : null;
  const endedAt = !nextIsLive && current.isLive ? now : current.endedAt ? new Date(current.endedAt) : null;

  await prisma.siteLiveState.update({
    where: { id: LIVE_STATE_ID },
    data: {
      isLive: nextIsLive,
      title: cleanText(input.title, DEFAULT_LIVE_TITLE, 120),
      description: cleanText(input.description, DEFAULT_LIVE_DESCRIPTION, 800),
      roomName: cleanRoomName(input.roomName, current.roomName),
      viewerCount: cleanViewerCount(input.viewerCount ?? current.viewerCount),
      startedAt,
      endedAt,
      updatedAt: now,
    },
  });

  if (!nextIsLive) {
    await prisma.siteLivePeer.deleteMany({});
    await prisma.siteLiveCandidate.deleteMany({});
  }
}

export async function saveLiveViewerCount(input: { viewerCount?: unknown }) {
  await ensureLiveState();
  await prisma.siteLiveState.update({
    where: { id: LIVE_STATE_ID },
    data: {
      viewerCount: cleanViewerCount(input.viewerCount),
    },
  });
}

export function hasLiveManageAccess(req: Request) {
  return req.headers.get("x-docupeer-live-admin") === "browser-managed";
}

async function pruneLivePeers() {
  const cutoff = new Date(Date.now() - LIVE_PEER_TTL_MS);
  await prisma.siteLiveCandidate.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  await prisma.siteLivePeer.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  });
}

function cleanViewerId(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
}

function cleanSdp(value: unknown) {
  return String(value || "").trim().slice(0, 200000);
}

function cleanCandidate(value: unknown) {
  return String(value || "").trim().slice(0, 50000);
}

export async function registerLiveOffer(input: { viewerId?: unknown; offerSdp?: unknown }) {
  const state = liveToPayload(await ensureLiveState());
  if (!state.isLive) {
    const err = new Error("DocuPeer Live is offline.") as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  const viewerId = cleanViewerId(input.viewerId);
  const offerSdp = cleanSdp(input.offerSdp);
  if (!viewerId || !offerSdp) {
    const err = new Error("A viewer id and offer are required.") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  await pruneLivePeers();
  await prisma.siteLivePeer.upsert({
    where: { viewerId },
    update: {
      offerSdp,
      answerSdp: null,
      status: "pending",
    },
    create: {
      viewerId,
      offerSdp,
      status: "pending",
    },
  });

  await prisma.siteLiveCandidate.deleteMany({
    where: { viewerId },
  });
}

export async function getLiveAnswer(viewerIdInput: unknown) {
  const viewerId = cleanViewerId(viewerIdInput);
  if (!viewerId) return null;
  await pruneLivePeers();
  return prisma.siteLivePeer.findUnique({
    where: { viewerId },
    select: {
      answerSdp: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function addLiveCandidate(input: {
  viewerId?: unknown;
  candidate?: unknown;
  side: "viewer" | "host";
}) {
  const viewerId = cleanViewerId(input.viewerId);
  const candidate = cleanCandidate(input.candidate);
  if (!viewerId || !candidate) return;
  await pruneLivePeers();
  await prisma.siteLiveCandidate.create({
    data: {
      viewerId,
      side: input.side,
      candidate,
    },
  });
}

export async function liveCandidates(input: {
  viewerId?: unknown;
  side: "viewer" | "host";
  after?: unknown;
}) {
  const viewerId = cleanViewerId(input.viewerId);
  if (!viewerId) return [];
  const after = Math.max(0, Math.floor(Number(input.after || 0)));
  await pruneLivePeers();
  const rows = await prisma.siteLiveCandidate.findMany({
    where: {
      viewerId,
      side: input.side,
      createdAt: after ? { gt: new Date(after) } : undefined,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    candidate: row.candidate,
    createdAt: row.createdAt.getTime(),
  }));
}

export async function pendingLivePeers() {
  await pruneLivePeers();
  return prisma.siteLivePeer.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 25,
    select: {
      viewerId: true,
      offerSdp: true,
      createdAt: true,
    },
  });
}

export async function failLivePeer(viewerIdInput: unknown) {
  const viewerId = cleanViewerId(viewerIdInput);
  if (!viewerId) return;
  await prisma.siteLivePeer.updateMany({
    where: { viewerId },
    data: { status: "failed" },
  });
  await prisma.siteLiveCandidate.deleteMany({
    where: { viewerId },
  });
}

export async function answerLivePeer(input: { viewerId?: unknown; answerSdp?: unknown }) {
  const viewerId = cleanViewerId(input.viewerId);
  const answerSdp = cleanSdp(input.answerSdp);
  if (!viewerId || !answerSdp) {
    const err = new Error("A viewer id and answer are required.") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  await prisma.siteLivePeer.update({
    where: { viewerId },
    data: {
      answerSdp,
      status: "answered",
    },
  });
}
