"use client";

import { useState } from "react";
import { api } from "../_lib/api";
import { dueBucket, formatDue, shortDistance } from "@/lib/atom/dates";
import { Badge, Btn, Card, Empty, Select, cx } from "../_lib/ui";
import { Icon } from "./icons";
import { EcForm } from "./EcForm";
import { EC_TYPE_LABEL, type EcDeadlineDTO, type TaskStatus } from "@/lib/atom/types";
import type { SectionProps } from "../AtomApp";

const STATUS_OPTS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export function EcDeadlines({ state, refresh }: SectionProps) {
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState<EcDeadlineDTO | null>(null);
  const [showDone, setShowDone] = useState(false);

  const now = new Date();
  const list = [...state.ec].sort((a, b) => (a.dueAt || "9999").localeCompare(b.dueAt || "9999"));
  const open = list.filter((e) => e.status !== "completed");
  const done = list.filter((e) => e.status === "completed");
  const shown = showDone ? done : open;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="max-w-xl text-sm text-deep-dim">Deadlines for competitions, applications, programs, scholarships, and tryouts - so nothing slips.</p>
        <Btn size="sm" onClick={() => setAdd(true)}><Icon name="plus" size={14} /> Add deadline</Btn>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowDone(false)} className={cx("rounded-full px-3 py-1 text-sm", !showDone ? "bg-deep-accent-soft text-deep-accent" : "text-deep-dim hover:bg-deep-panel2")}>Open ({open.length})</button>
        <button onClick={() => setShowDone(true)} className={cx("rounded-full px-3 py-1 text-sm", showDone ? "bg-deep-accent-soft text-deep-accent" : "text-deep-dim hover:bg-deep-panel2")}>Completed ({done.length})</button>
      </div>

      {shown.length === 0 ? (
        <Empty title={showDone ? "Nothing completed yet" : "No deadlines tracked"} subtitle={showDone ? undefined : "Add the application and registration deadlines you're watching."} action={showDone ? undefined : <Btn onClick={() => setAdd(true)}><Icon name="plus" size={14} /> Add deadline</Btn>} />
      ) : (
        <div className="space-y-2">
          {shown.map((e) => {
            const bucket = dueBucket(e.dueAt, now);
            return (
              <Card key={e.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.priority === "high" ? "#b3455e" : "#7c5cbf" }} />
                      <span className="font-medium text-deep-text">{e.name}</span>
                      {e.priority === "high" && <Badge color="#b3455e">High</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-deep-dim">{[e.organization, EC_TYPE_LABEL[e.type]].filter(Boolean).join(" · ")}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      {e.dueAt && (
                        <span className={cx("font-medium", bucket === "overdue" ? "text-deep-bad" : bucket === "today" || bucket === "soon" ? "text-deep-warn" : "text-deep-text-soft")}>
                          {formatDue(e.dueAt, e.hasTime)} · {shortDistance(new Date(e.dueAt), now)}
                        </span>
                      )}
                      {e.link && (
                        <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-deep-accent hover:underline">
                          <Icon name="link" size={13} /> Application
                        </a>
                      )}
                    </div>
                    {e.notes && <div className="mt-2 text-xs text-deep-dim">{e.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={e.status} onChange={async (v) => { await api.updateEc(e.id, { status: v as TaskStatus }); refresh(); }} options={STATUS_OPTS} className="w-32 px-2 py-1 text-xs" />
                    <button onClick={() => setEdit(e)} className="rounded-lg p-1.5 text-deep-dim hover:bg-deep-panel2"><Icon name="edit" size={15} /></button>
                    <button onClick={async () => { await api.deleteEc(e.id); refresh(); }} className="rounded-lg p-1.5 text-deep-dim hover:bg-deep-panel2 hover:text-deep-bad"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {add && <EcForm onClose={() => setAdd(false)} onSaved={refresh} />}
      {edit && <EcForm existing={edit} onClose={() => setEdit(null)} onSaved={refresh} />}
    </div>
  );
}
