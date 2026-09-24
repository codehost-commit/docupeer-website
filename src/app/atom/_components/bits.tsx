"use client";

import { ReactNode } from "react";
import { formatDue, shortDistance } from "@/lib/atom/dates";
import { Badge, cx } from "../_lib/ui";
import type { CalItem } from "../_lib/items";

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ background: color, width: size, height: size }} />;
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg text-deep-text">{title}</h2>
      {action}
    </div>
  );
}

export function StatTile({ label, value, sub, color }: { label: string; value: ReactNode; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-deep-border bg-deep-panel px-4 py-3 shadow-panel">
      <div className="text-xs font-medium uppercase tracking-wide text-deep-dim">{label}</div>
      <div className="mt-1 font-display text-2xl" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs text-deep-dim">{sub}</div>}
    </div>
  );
}

// A single deadline/work row used by the dashboard, tasks, EC, and calendar day view.
export function ItemRow({
  item,
  onToggle,
  onClick,
  now = new Date(),
}: {
  item: CalItem;
  onToggle?: () => void;
  onClick?: () => void;
  now?: Date;
}) {
  const overdue = item.at && !item.done && new Date(item.at) < now;
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-deep-panel2">
      {onToggle && (
        <button
          onClick={onToggle}
          className={cx(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            item.done ? "border-deep-good bg-deep-good text-white" : "border-deep-border-strong hover:border-deep-accent",
          )}
          aria-label="Toggle complete"
        >
          {item.done && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>
      )}
      <Dot color={item.color} />
      <button onClick={onClick} className="min-w-0 flex-1 text-left">
        <div className={cx("truncate text-sm font-medium text-deep-text", item.done && "text-deep-dim line-through")}>
          {item.title}
        </div>
        {item.subtitle && <div className="truncate text-xs text-deep-dim">{item.subtitle}</div>}
      </button>
      <div className="flex shrink-0 items-center gap-2">
        <Badge color={item.color}>{item.kindLabel}</Badge>
        {item.at && (
          <span className={cx("whitespace-nowrap text-xs", overdue ? "font-medium text-deep-bad" : "text-deep-dim")}>
            {item.hasTime ? formatDue(item.at, true).split(" · ")[1] || shortDistance(new Date(item.at), now) : shortDistance(new Date(item.at), now)}
          </span>
        )}
      </div>
    </div>
  );
}
