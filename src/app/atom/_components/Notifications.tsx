"use client";

import { api, type NotificationRow } from "../_lib/api";
import { Btn, Card, Empty, cx } from "../_lib/ui";
import { Icon } from "./icons";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const ROUTE: Record<string, string> = { assignment: "academics", test: "academics", project: "academics", ec: "ec", task: "tasks", event: "calendar" };

export function NotificationsView({
  notifications,
  unread,
  reload,
  setView,
}: {
  notifications: NotificationRow[];
  unread: number;
  reload: () => Promise<void>;
  setView: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-deep-dim">{unread > 0 ? `${unread} unread` : "You're all caught up."}</p>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={async () => { await api.markNotifications({ all: true }); reload(); }} disabled={unread === 0}>Mark all read</Btn>
          <Btn size="sm" variant="ghost" onClick={async () => { await api.clearNotifications(); reload(); }} disabled={notifications.length === 0}>Clear</Btn>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Empty title="No notifications yet" subtitle="Reminders about upcoming assignments, tests, and deadlines will appear here." />
      ) : (
        <Card className="divide-y divide-deep-border">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.readAt) { await api.markNotifications({ id: n.id }); reload(); }
                if (n.itemType && ROUTE[n.itemType]) setView(ROUTE[n.itemType]);
              }}
              className="flex w-full items-start gap-3 p-4 text-left hover:bg-deep-panel2"
            >
              <span className={cx("mt-1 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-deep-accent")} />
              <div className="min-w-0 flex-1">
                <div className={cx("text-sm", n.readAt ? "text-deep-text-soft" : "font-medium text-deep-text")}>{n.title}</div>
                <div className="text-xs text-deep-dim">{n.body}</div>
              </div>
              <span className="shrink-0 text-xs text-deep-dim">{timeAgo(n.createdAt)}</span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
