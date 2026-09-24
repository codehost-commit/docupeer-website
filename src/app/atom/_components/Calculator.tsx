"use client";

import { useMemo, useState } from "react";
import { requiredScore } from "@/lib/atom/grades";
import { Field, Input, Select, cx } from "../_lib/ui";
import type { AssignmentDTO, ClassDTO, GradingSystem } from "@/lib/atom/types";

const TARGETS = [
  { label: "A (93%)", pct: 93 },
  { label: "A- (90%)", pct: 90 },
  { label: "B+ (87%)", pct: 87 },
  { label: "B (83%)", pct: 83 },
];

export function Calculator({ cls, assignments }: { cls: ClassDTO; assignments: AssignmentDTO[] }) {
  const [target, setTarget] = useState(90);
  const [points, setPoints] = useState("100");
  const [categoryId, setCategoryId] = useState(cls.categories[0]?.id ?? "");

  const items = useMemo(
    () =>
      assignments
        .filter((a) => a.classId === cls.id)
        .map((a) => ({ categoryId: a.categoryId, pointsEarned: a.pointsEarned, pointsPossible: a.pointsPossible })),
    [assignments, cls.id],
  );

  const result = useMemo(
    () =>
      requiredScore({
        gradingSystem: cls.gradingSystem as GradingSystem,
        categories: cls.categories.map((c) => ({ id: c.id, name: c.name, weight: c.weight, dropLowest: c.dropLowest })),
        items,
        targetPercent: target,
        assessmentCategoryId: cls.gradingSystem === "weighted" ? categoryId || null : null,
        assessmentPoints: Number(points) || 0,
      }),
    [cls, items, target, categoryId, points],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-deep-dim">
        Work out the score you need on an upcoming assignment or test to reach a target grade.
      </p>
      <div className="flex flex-wrap gap-2">
        {TARGETS.map((t) => (
          <button
            key={t.pct}
            onClick={() => setTarget(t.pct)}
            className={cx("rounded-full border px-3 py-1 text-sm", target === t.pct ? "border-deep-accent bg-deep-accent-soft text-deep-accent" : "border-deep-border text-deep-text-soft hover:bg-deep-panel2")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Target overall %"><Input type="number" value={String(target)} onChange={(e) => setTarget(Number(e.target.value) || 0)} /></Field>
        <Field label="Assessment points"><Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
        {cls.gradingSystem === "weighted" && (
          <Field label="Counts toward">
            <Select value={categoryId} onChange={setCategoryId} options={cls.categories.map((c) => ({ value: c.id, label: `${c.name} (${c.weight}%)` }))} />
          </Field>
        )}
      </div>

      <div className="rounded-2xl border border-deep-border bg-deep-panel2 p-4">
        {result.alreadyMet ? (
          <div className="text-sm text-deep-good">
            You&apos;re already on track — even a 0 keeps you at or above {target}% (you&apos;d need {result.requiredPercent.toFixed(1)}%).
          </div>
        ) : result.impossible ? (
          <div className="text-sm text-deep-bad">
            {target}% isn&apos;t reachable with this single assessment — you&apos;d need {result.requiredPercent.toFixed(1)}%. A perfect score gets you to {result.projectedIfPerfect.toFixed(1)}%.
          </div>
        ) : (
          <div>
            <div className="font-display text-3xl text-deep-accent">
              {Math.max(0, result.requiredPoints).toFixed(1)} / {points}
              <span className="ml-2 text-lg text-deep-text-soft">({result.requiredPercent.toFixed(1)}%)</span>
            </div>
            <div className="mt-1 text-sm text-deep-text-soft">is the score you need to reach {target}%.</div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-deep-dim">
          <div className="rounded-lg bg-deep-panel px-3 py-2">If you ace it: <span className="font-medium text-deep-text">{result.projectedIfPerfect.toFixed(1)}%</span></div>
          <div className="rounded-lg bg-deep-panel px-3 py-2">If you skip it: <span className="font-medium text-deep-text">{result.projectedIfZero.toFixed(1)}%</span></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-deep-dim">{result.explanation}</p>
      </div>
    </div>
  );
}
