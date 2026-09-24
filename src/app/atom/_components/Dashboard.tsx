"use client";

import { useMemo } from "react";
import { dueBucket, relativeDayLabel, shortDistance, startOfDay } from "@/lib/atom/dates";
import { classGpaValue } from "@/lib/atom/grades";
import { Badge, Btn, Card, Empty, cx, fmtPct, letterColor } from "../_lib/ui";
import { Dot, ItemRow, SectionHeading, StatTile } from "./bits";
import { Icon } from "./icons";
import type { SectionProps } from "../AtomApp";
import { dashboardGreeting } from "../_lib/greetings";

export function Dashboard({ state, grades, items, gpa, setView, openClass }: SectionProps & { openClass: (id: string) => void }) {
  const now = new Date();
  const activeClasses = state.classes.filter((c) => !c.archived);

  const undone = useMemo(() => items.filter((i) => i.at && !i.done), [items]);
  const overdue = undone.filter((i) => dueBucket(i.at, now) === "overdue").sort((a, b) => (a.at! < b.at! ? -1 : 1));
  const today = undone.filter((i) => dueBucket(i.at, now) === "today");
  const soon = undone.filter((i) => dueBucket(i.at, now) === "soon");
  const upcoming = undone
    .filter((i) => new Date(i.at!) >= startOfDay(now))
    .sort((a, b) => (a.at! < b.at! ? -1 : 1))
    .slice(0, 12);

  // Weekly overview (Sun-Sat of the current week).
  const weekStart = startOfDay(new Date(now.getTime() - now.getDay() * 86400000));
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart.getTime() + i * 86400000);
    const dayItems = undone.filter((it) => {
      const d = new Date(it.at!);
      return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
    });
    return { day, dayItems };
  });

  const showGpa = state.profile.gpaScale !== "none" && state.profile.gpaScale !== "percent";
  const displayName = state.profile.name.toUpperCase().split(" ")[0] || "THERE";

  return (
    <div className="space-y-6">
      {/* Header + stats */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-deep-border bg-deep-panel2 font-display text-2xl text-deep-dim">
            {state.profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : displayName.charAt(0)}
          </div>
          <div>
          <div className="font-display text-3xl leading-tight text-deep-text">{dashboardGreeting(displayName, now)}</div>
          <div className="text-sm text-deep-dim">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {showGpa && <StatTile label="GPA" value={gpa === null ? "-" : gpa.toFixed(2)} />}
          <StatTile label="Due today" value={today.length} color={today.length ? "#356d97" : undefined} />
          <StatTile label="Overdue" value={overdue.length} color={overdue.length ? "#b3455e" : undefined} />
        </div>
      </div>

      {/* Academic overview */}
      <div>
        <SectionHeading
          title="Academic overview"
          action={<Btn size="sm" variant="soft" onClick={() => setView("academics")}>Open Academics</Btn>}
        />
        {activeClasses.length === 0 ? (
          <Empty
            title="No classes yet"
            subtitle="Add your classes to start tracking grades, assignments, and tests."
            action={<Btn onClick={() => setView("academics")}><Icon name="plus" size={16} /> Add a class</Btn>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeClasses.map((c) => {
              const g = grades.get(c.id);
              const pct = g?.percent ?? null;
              const clsGpa = pct !== null ? classGpaValue(pct, state.profile.gpaScale, c.gpaWeight) : null;
              return (
                <Card key={c.id} onClick={() => openClass(c.id)} className="overflow-hidden">
                  <div className="h-1.5" style={{ background: c.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-deep-text">{c.name}</div>
                        <div className="truncate text-xs text-deep-dim">
                          {[c.period, c.teacher].filter(Boolean).join(" · ") || "-"}
                        </div>
                      </div>
                      {g?.trend !== "flat" && g?.delta != null && (
                        <span className={cx("flex items-center gap-0.5 text-xs", g.trend === "up" ? "text-deep-good" : "text-deep-bad")}>
                          <Icon name={g.trend === "up" ? "trend-up" : "trend-down"} size={13} />
                          {Math.abs(g.delta).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-display text-3xl text-deep-text">{fmtPct(pct)}</span>
                      {g?.letter && (
                        <Badge color={letterColor(g.letter)} className="text-sm">{g.letter}</Badge>
                      )}
                    </div>
                    {showGpa && clsGpa !== null && <div className="mt-1 text-xs text-deep-dim">{clsGpa.toFixed(1)} GPA</div>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's priorities */}
        <div>
          <SectionHeading title="Today's priorities" />
          <Card className="p-3">
            {overdue.length + today.length + soon.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-deep-dim">Nothing due right now. Nice.</div>
            ) : (
              <div className="space-y-4">
                {overdue.length > 0 && (
                  <PriorityGroup label="Overdue" color="#b3455e" items={overdue.map((i) => <ItemRow key={i.kind + i.id} item={i} onClick={() => setView(i.href.replace("#/", ""))} />)} />
                )}
                {today.length > 0 && (
                  <PriorityGroup label="Due today" color="#356d97" items={today.map((i) => <ItemRow key={i.kind + i.id} item={i} onClick={() => setView(i.href.replace("#/", ""))} />)} />
                )}
                {soon.length > 0 && (
                  <PriorityGroup label="Next few days" color="#a87717" items={soon.map((i) => <ItemRow key={i.kind + i.id} item={i} onClick={() => setView(i.href.replace("#/", ""))} />)} />
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Upcoming */}
        <div>
          <SectionHeading title="Upcoming" action={<Btn size="sm" variant="ghost" onClick={() => setView("calendar")}>Calendar</Btn>} />
          <Card className="p-3">
            {upcoming.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-deep-dim">No upcoming deadlines.</div>
            ) : (
              <div className="space-y-1">
                {groupByDay(upcoming, now).map(({ label, list }) => (
                  <div key={label}>
                    <div className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-deep-dim">{label}</div>
                    {list.map((i) => (
                      <ItemRow key={i.kind + i.id} item={i} onClick={() => setView(i.href.replace("#/", ""))} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Weekly overview */}
      <div>
        <SectionHeading title="This week" />
        <Card className="grid grid-cols-7 divide-x divide-deep-border">
          {week.map(({ day, dayItems }, i) => {
            const isToday = day.toDateString() === now.toDateString();
            return (
              <div key={i} className={cx("min-h-[84px] p-2", isToday && "bg-deep-accent-soft/40")}>
                <div className="text-center text-[10px] font-medium uppercase text-deep-dim">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div className={cx("text-center text-sm font-medium", isToday ? "text-deep-accent" : "text-deep-text")}>
                  {day.getDate()}
                </div>
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  {dayItems.slice(0, 4).map((it) => (
                    <Dot key={it.kind + it.id} color={it.color} size={6} />
                  ))}
                  {dayItems.length > 4 && <span className="text-[9px] text-deep-dim">+{dayItems.length - 4}</span>}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

function PriorityGroup({ label, color, items }: { label: string; color: string; items: React.ReactNode[] }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 px-2">
        <Dot color={color} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
      </div>
      <div>{items}</div>
    </div>
  );
}

function groupByDay(items: { at: string | null }[] & any[], now: Date) {
  const groups: { label: string; list: any[] }[] = [];
  for (const it of items) {
    const label = relativeDayLabel(new Date(it.at), now);
    const g = groups.find((x) => x.label === label);
    if (g) g.list.push(it);
    else groups.push({ label, list: [it] });
  }
  return groups;
}
