"use client";

import { useState } from "react";
import { api, type ClassGrade } from "../_lib/api";
import { classGpaValue } from "@/lib/atom/grades";
import { formatDue } from "@/lib/atom/dates";
import { Badge, Btn, Card, Empty, Field, Input, Modal, Segmented, Select, cx, fmtPct, letterColor } from "../_lib/ui";
import { Icon } from "./icons";
import { AssignmentForm } from "./AssignmentForm";
import { ClassForm } from "./ClassForm";
import { Calculator } from "./Calculator";
import {
  ASSIGNMENT_TYPE_LABEL,
  WORK_STATUSES,
  WORK_STATUS_LABEL,
  type AssignmentDTO,
  type ClassDTO,
  type GpaScale,
  type WorkStatus,
} from "@/lib/atom/types";

export function ClassDetail({
  cls,
  grade,
  assignments,
  classes,
  gpaScale,
  refresh,
}: {
  cls: ClassDTO;
  grade: ClassGrade | undefined;
  assignments: AssignmentDTO[];
  classes: ClassDTO[];
  gpaScale: GpaScale;
  refresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState("grades");
  const [addAssignment, setAddAssignment] = useState(false);
  const [editAssignment, setEditAssignment] = useState<AssignmentDTO | null>(null);
  const [editClass, setEditClass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const classAssignments = assignments
    .filter((a) => a.classId === cls.id)
    .sort((a, b) => (a.dueAt || "9999").localeCompare(b.dueAt || "9999"));
  const catName = (id: string | null) => cls.categories.find((c) => c.id === id)?.name ?? null;
  const showGpa = gpaScale !== "none" && gpaScale !== "percent";
  const clsGpa = grade?.percent != null ? classGpaValue(grade.percent, gpaScale, cls.gpaWeight) : null;

  return (
    <div>
      <Card className="mb-4 overflow-hidden">
        <div className="h-1.5" style={{ background: cls.color }} />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="font-display text-xl text-deep-text">{cls.name}</div>
            <div className="text-sm text-deep-dim">{[cls.period, cls.teacher, cls.term].filter(Boolean).join(" · ") || "—"}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-display text-3xl text-deep-text">{fmtPct(grade?.percent ?? null)}</div>
              {showGpa && clsGpa != null && <div className="text-xs text-deep-dim">{clsGpa.toFixed(1)} GPA</div>}
            </div>
            {grade?.letter && <Badge color={letterColor(grade.letter)} className="text-base">{grade.letter}</Badge>}
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "grades", label: "Grades" },
            { value: "assignments", label: "Assignments" },
            { value: "calculator", label: "What do I need?" },
            { value: "setup", label: "Setup" },
          ]}
        />
      </div>

      {tab === "grades" && (
        <div className="space-y-4">
          {cls.gradingSystem === "weighted" ? (
            grade && grade.breakdown.length > 0 ? (
              <Card className="p-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-deep-dim">Category breakdown</div>
                <div className="divide-y divide-deep-border">
                  {grade.breakdown.map((b) => (
                    <div key={b.categoryId ?? "uncat"} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-deep-text">{b.name}</span>
                        <span className="text-xs text-deep-dim">{b.weight}%{b.count ? ` · ${b.count} graded` : ""}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-deep-text">{b.percent === null ? "—" : `${b.percent.toFixed(1)}%`}</span>
                        {b.possible > 0 && <span className="ml-2 text-xs text-deep-dim">{b.earned}/{b.possible}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {grade.uncategorizedGradedCount > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-deep-warn">
                    <Icon name="warn" size={13} /> {grade.uncategorizedGradedCount} graded item(s) have no category and may not count correctly.
                  </div>
                )}
              </Card>
            ) : (
              <Empty title="No grades yet" subtitle="Add graded assignments to see your category breakdown." />
            )
          ) : (
            <Card className="p-4 text-sm text-deep-text-soft">This class uses total points. Your grade is the sum of all points earned over points possible.</Card>
          )}

          <Card className="p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-deep-dim">Grade history</div>
            {grade && grade.history.length >= 2 ? (
              <History history={grade.history} color={cls.color} />
            ) : (
              <div className="text-sm text-deep-dim">History will appear here as your grade changes.</div>
            )}
          </Card>
        </div>
      )}

      {tab === "assignments" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Btn size="sm" onClick={() => setAddAssignment(true)}><Icon name="plus" size={14} /> Add assignment</Btn>
          </div>
          {classAssignments.length === 0 ? (
            <Empty title="No assignments yet" subtitle="Add assignments and tests, or import them." action={<Btn onClick={() => setAddAssignment(true)}><Icon name="plus" size={14} /> Add assignment</Btn>} />
          ) : (
            <Card className="divide-y divide-deep-border">
              {classAssignments.map((a) => {
                const pct = a.pointsEarned != null && a.pointsPossible ? (a.pointsEarned / a.pointsPossible) * 100 : null;
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-deep-text">{a.name}</span>
                        <Badge color={cls.color}>{ASSIGNMENT_TYPE_LABEL[a.type]}</Badge>
                      </div>
                      <div className="text-xs text-deep-dim">
                        {[catName(a.categoryId), a.dueAt ? formatDue(a.dueAt, a.hasTime) : null].filter(Boolean).join(" · ") || "No due date"}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {a.pointsPossible != null ? (
                        <>
                          <span className="font-medium text-deep-text">{a.pointsEarned ?? "—"}/{a.pointsPossible}</span>
                          {pct !== null && <span className="ml-1 text-xs text-deep-dim">{pct.toFixed(0)}%</span>}
                        </>
                      ) : (
                        <span className="text-xs text-deep-dim">Ungraded</span>
                      )}
                    </div>
                    <Select
                      value={a.status}
                      onChange={async (v) => { await api.updateAssignment(a.id, { status: v as WorkStatus }); refresh(); }}
                      options={WORK_STATUSES.map((s) => ({ value: s, label: WORK_STATUS_LABEL[s] }))}
                      className="w-32 px-2 py-1 text-xs"
                    />
                    <button onClick={() => setEditAssignment(a)} className="rounded-lg p-1.5 text-deep-dim hover:bg-deep-panel2"><Icon name="edit" size={15} /></button>
                    <button onClick={async () => { await api.deleteAssignment(a.id); refresh(); }} className="rounded-lg p-1.5 text-deep-dim hover:bg-deep-panel2 hover:text-deep-bad"><Icon name="trash" size={15} /></button>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}

      {tab === "calculator" && (
        <Card className="p-4"><Calculator cls={cls} assignments={assignments} /></Card>
      )}

      {tab === "setup" && (
        <div className="space-y-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium text-deep-text">Class details</div>
              <div className="text-xs text-deep-dim">Name, teacher, grading system, GPA weight, color.</div>
            </div>
            <Btn variant="outline" size="sm" onClick={() => setEditClass(true)}><Icon name="edit" size={14} /> Edit</Btn>
          </Card>
          {cls.gradingSystem === "weighted" && <CategoryEditor cls={cls} refresh={refresh} />}
          <Card className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium text-deep-bad">Delete class</div>
              <div className="text-xs text-deep-dim">Removes the class and its assignments. This can&apos;t be undone.</div>
            </div>
            <Btn variant="danger" size="sm" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={14} /> Delete</Btn>
          </Card>
        </div>
      )}

      {addAssignment && <AssignmentForm classes={classes} defaultClassId={cls.id} onClose={() => setAddAssignment(false)} onSaved={refresh} />}
      {editAssignment && <AssignmentForm existing={editAssignment} classes={classes} onClose={() => setEditAssignment(null)} onSaved={refresh} />}
      {editClass && <ClassForm existing={cls} onClose={() => setEditClass(false)} onSaved={refresh} />}
      {confirmDelete && (
        <Modal
          title="Delete this class?"
          onClose={() => setConfirmDelete(false)}
          size="sm"
          footer={
            <>
              <Btn variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={async () => { await api.deleteClass(cls.id); setConfirmDelete(false); refresh(); }}>Delete class</Btn>
            </>
          }
        >
          <p className="text-sm text-deep-text-soft">
            <span className="font-medium text-deep-text">{cls.name}</span> and its {classAssignments.length} assignment(s) will be permanently removed.
          </p>
        </Modal>
      )}
    </div>
  );
}

function History({ history, color }: { history: { at: string; percent: number }[]; color: string }) {
  const pts = history.slice(-20);
  const min = Math.min(...pts.map((p) => p.percent)) - 2;
  const max = Math.max(...pts.map((p) => p.percent)) + 2;
  const W = 100;
  const H = 32;
  const path = pts
    .map((p, i) => {
      const x = (i / Math.max(1, pts.length - 1)) * W;
      const y = H - ((p.percent - min) / Math.max(0.01, max - min)) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const latest = pts[pts.length - 1];
  const first = pts[0];
  const delta = latest.percent - first.percent;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-10 flex-1" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="text-right text-xs">
        <div className="font-medium text-deep-text">{latest.percent.toFixed(1)}%</div>
        <div className={cx(delta >= 0 ? "text-deep-good" : "text-deep-bad")}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)} over {pts.length}</div>
      </div>
    </div>
  );
}

function CategoryEditor({ cls, refresh }: { cls: ClassDTO; refresh: () => Promise<void> }) {
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const sum = cls.categories.reduce((s, c) => s + c.weight, 0);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-deep-dim">Category weights</div>
        <span className={cx("text-xs", Math.abs(sum - 100) < 0.01 ? "text-deep-good" : "text-deep-warn")}>Total: {sum}%</span>
      </div>
      <div className="space-y-2">
        {cls.categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <Input defaultValue={c.name} onBlur={async (e) => { if (e.target.value !== c.name) { await api.updateCategory(c.id, { name: e.target.value }); refresh(); } }} className="flex-1" />
            <Input type="number" defaultValue={String(c.weight)} onBlur={async (e) => { if (Number(e.target.value) !== c.weight) { await api.updateCategory(c.id, { weight: Number(e.target.value) }); refresh(); } }} className="w-20" />
            <span className="text-xs text-deep-dim">drop</span>
            <Input type="number" defaultValue={String(c.dropLowest)} onBlur={async (e) => { if (Number(e.target.value) !== c.dropLowest) { await api.updateCategory(c.id, { dropLowest: Number(e.target.value) }); refresh(); } }} className="w-14" />
            <button onClick={async () => { await api.deleteCategory(c.id); refresh(); }} className="rounded-lg p-2 text-deep-dim hover:bg-deep-panel2 hover:text-deep-bad"><Icon name="trash" size={15} /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category" className="flex-1" />
        <Input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="%" className="w-20" />
        <Btn size="sm" variant="soft" onClick={async () => { if (!newName.trim()) return; await api.createCategory({ classId: cls.id, name: newName.trim(), weight: Number(newWeight) || 0 }); setNewName(""); setNewWeight(""); refresh(); }}>Add</Btn>
      </div>
    </Card>
  );
}
