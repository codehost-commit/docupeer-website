import "server-only";
import { prisma } from "@/lib/db";
import {
  DEFAULT_LIVE_DESCRIPTION,
  DEFAULT_LIVE_TITLE,
  type LiveSnapshotPayload,
  type LiveStatePayload,
} from "@/lib/live-shared";

const LIVE_STATE_ID = "global";

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

function liveToPayload(state: {
  isLive: boolean;
  title: string;
  description: string;
  roomName: string;
  startedAt: Date | null;
  endedAt: Date | null;
  updatedAt: Date;
}): LiveStatePayload {
  return {
    isLive: state.isLive,
    title: state.title,
    description: state.description,
    roomName: state.roomName,
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
      startedAt,
      endedAt,
      updatedAt: now,
    },
  });
}

export function hasLiveManageAccess(req: Request) {
  return req.headers.get("x-docupeer-live-admin") === "browser-managed";
}
