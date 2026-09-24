"use client";

import { useMemo, useState } from "react";
import { api } from "../_lib/api";
import { dueBucket, formatDue, shortDistance, startOfDay } from "@/lib/atom/dates";
import { Badge, Btn, Card, Empty, Segmented, Select, cx } from "../_lib/ui";
import { Icon } from "./icons";
import { TaskForm } from "./TaskForm";
import { CATEGORY_COLOR } from "../_lib/ui";
import { type TaskDTO, type TaskStatus } from "@/lib/atom/types";
import type { SectionProps } from "../AtomApp";

export function Tasks({ state, refresh }: SectionProps) {
  const [ovview, setView] = useState("today");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState<TaskDTO | null>(null);
  const now = new Date();

  const classById = useMemo(() => new Map(state.classes.map((c) => [c.id, c])), [state.classes]);

  const filtered = state.tasks.filter((t) => (category === "all" || t.category === category) && (priority === "all" || t.priority === priority));

  const buckets = useMemo(() => {
    const open = filtered.filter((t) => t.status !== "completed");
    return {
      today: open.filter((t) => dueBucket(t.dueAt, now) === "today"),
      upcoming: open.filter((t) => t.dueAt && new Date(t.dueAt) >= startOfDay(now) && dueBucket(t.dueAt, now) !== "today").concat(open.filter((t) => !t.dueAt)),
      overdue: open.filter((t) => dueBucket(t.dueAt, now) === "overdue"),
      completed: filtered.filter((t) => t.status === "completed"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const list = ((buckets as Record<string, TaskDTO[]>)[ovview] || []).sort((a, b) => (a.dueAt || "9999").localeCompare(b.dueAt || "9999"));

  async function toggle(t: TaskDTO) {
    await api.updateTask(t.id, { status: t.status === "completed" ? "not_started" : "completed" });
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={ovview} onChange={setView} options={[
          { value: "today", label: `Today (${buckets.today.length})` },
          { value: "upcoming", label: `Upcoming (${buckets.upcoming.length})` },
          { value: "overdue", label: `Overdue (${buckets.overdue.length})` },
          { value: "completed", label: "Completed" },
        ]} />
        <Btn size="sm" onClick={() => setAdd(true)}><Icon name="plus" size={14} /> Add task</Btn>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={category} onChange={setCategory} options={[{ value: "all", label: "All categories" }, { value: "academic", label: "Academic" }, { value: "ec", label: "Extracurricular" }, { value: "personal", label: "Personal" }]} className="w-auto" />
        <Select value={priority} onChange={setPriority} options={[{ value: "all", label: "Any priority" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} className="w-auto" />
      </div>

      {list.length === 0 ? (
        <Empty title="Nothing here" subtitle={ovview === "completed" ? "Completed tasks will show up here." : "You're all caught up in this view."} action={ovview !== "completed" ? <Btn onClick={() => setAdd(true)}><Icon name="plus" size={14} /> Add task</Btn> : undefined} />
      ) : (
        <Card className="divide-y divide-deep-border">
          {list.map((t) => {
            const cls = t.classId ? classById.get(t.classId) : null;
            const overdue = t.dueAt && dueBucket(t.dueAt, now) === "overdue";
            return (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <button
                  onClick={() => toggle(t)}
                  className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", t.status === "completed" ? "border-deep-good bg-deep-good text-white" : "border-deep-border-strong hover:border-deep-accent")}
                >
                  {t.status === "completed" && <Icon name="check" size={12} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={cx("truncate text-sm font-medium", t.status === "completed" ? "text-deep-dim line-through" : "text-deep-text")}>{t.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-deep-dim">
                    <Badge color={CATEGORY_COLOR[t.category]}>{t.category}</Badge>
                    {cls && <span>{cls.name}</span>}
                    {t.dueAt && <span className={cx(overdue && "font-medium text-deep-bad")}>{formatDue(t.dueAt, t.hasTime)} · {shortDistance(new Date(t.dueAt), now)}</span>}
                  </div>
                </div>
                <span className="h-2 w-2 rounded-full" style={{ background: t.priority === "high" ? "#b3455e" : t.priority === "medium" ? "#a87717" : "#6a7495" }} title={`${t.priority} priority`} />
                <button onClick={() => setEdit(t)} className="rounded-lg p-1.5 text-deep-dim hover:bg-deep-panel2"><Icon name="edit" size={15} /></button>
                <button onClick={async () => { await api.deleteTask(t.id); refresh(); }} className="rounded-lg p-1.5 text-deep-dim hover:bg-deep-panel2 hover:text-deep-bad"><Icon name="trash" size={15} /></button>
              </div>
            );
          })}
        </Card>
      )}

      {add && <TaskForm classes={state.classes} onClose={() => setAdd(false)} onSaved={refresh} />}
      {edit && <TaskForm existing={edit} classes={state.classes} onClose={() => setEdit(null)} onSaved={refresh} />}
    </div>
  );
}
