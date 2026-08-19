export const STATUS_LEVELS = [1, 2, 3, 4, 5] as const;

export type StatusLevel = (typeof STATUS_LEVELS)[number];
export type StatusPhase = "investigating" | "identified" | "monitoring" | "resolved" | "";

export type StatusStatePayload = {
  level: StatusLevel;
  phase: StatusPhase;
  maintenanceMode: boolean;
  etaAt: number | null;
  updatedAt: number;
};

export type StatusHistoryPayload = {
  bucketTs: number;
  statusLevel: StatusLevel;
};

export type StatusReportPayload = {
  id: string;
  statusLevel: StatusLevel;
  phase: StatusPhase;
  message: string;
  createdAt: number;
};

export type StatusSnapshotPayload = {
  status: StatusStatePayload;
  history: StatusHistoryPayload[];
  reports24h: StatusReportPayload[];
  olderReports: StatusReportPayload[];
  serverTime: number;
};

export const STATUS_PHASES: Exclude<StatusPhase, "">[] = [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
];

export const STATUS_META: Record<StatusLevel, {
  label: string;
  short: string;
  sentence: string;
  color: string;
  softColor: string;
  textColor: string;
  symbol: string;
}> = {
  1: {
    label: "Operational",
    short: "Clear",
    sentence: "All DocuPeer systems are running normally.",
    color: "#2f8a5f",
    softColor: "#e8f4ec",
    textColor: "#174c33",
    symbol: "OK",
  },
  2: {
    label: "Degraded Performance",
    short: "Slow",
    sentence: "Some requests may be slower than usual while we monitor service health.",
    color: "#9b6b13",
    softColor: "#fff3d8",
    textColor: "#5d3e06",
    symbol: "!",
  },
  3: {
    label: "Partial Outage",
    short: "Limited",
    sentence: "Part of DocuPeer is unavailable while restoration work is underway.",
    color: "#b85f16",
    softColor: "#ffeadb",
    textColor: "#6b3308",
    symbol: "!",
  },
  4: {
    label: "Major Outage",
    short: "Outage",
    sentence: "A major service disruption is affecting a large portion of DocuPeer.",
    color: "#b43d50",
    softColor: "#ffe5e9",
    textColor: "#741d2c",
    symbol: "!",
  },
  5: {
    label: "Full Service Outage",
    short: "Down",
    sentence: "DocuPeer is currently unavailable while full restoration work continues.",
    color: "#503d9f",
    softColor: "#ebe8ff",
    textColor: "#2e226d",
    symbol: "X",
  },
};

export const STATUS_PHASE_LABELS: Record<Exclude<StatusPhase, "">, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export function formatStatusPhase(level: number, phase: string | null | undefined) {
  if (level <= 1) return "Operating Normally";
  return STATUS_PHASE_LABELS[phase as Exclude<StatusPhase, "">] ?? "Investigating";
}

export function formatStatusTime(value: number) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatEta(targetTs: number, nowTs = Date.now()) {
  const remaining = Math.max(0, targetTs - nowTs);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
