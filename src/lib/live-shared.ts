export type LiveStatePayload = {
  isLive: boolean;
  title: string;
  description: string;
  roomName: string;
  startedAt: number | null;
  endedAt: number | null;
  updatedAt: number;
};

export type LiveSnapshotPayload = {
  live: LiveStatePayload;
  serverTime: number;
};

export const DEFAULT_LIVE_TITLE = "DocuPeer Live";
export const DEFAULT_LIVE_DESCRIPTION =
  "Live conversations, walkthroughs, and work sessions from the DocuPeer team.";

export function formatLiveTime(value: number | null) {
  if (!value) return "Not started";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function createLiveRoomName() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 10);
  return `DocuPeerLive-${stamp}-${suffix}`;
}
