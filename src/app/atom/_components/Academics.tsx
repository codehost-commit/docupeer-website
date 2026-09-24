"use client";

import { useEffect, useState } from "react";
import { Btn, Empty, cx } from "../_lib/ui";
import { Icon } from "./icons";
import { ClassDetail } from "./ClassDetail";
import { ClassForm } from "./ClassForm";
import { ImportWizard } from "./ImportWizard";
import { fmtPct, letterColor } from "../_lib/ui";
import type { SectionProps } from "../AtomApp";

export function Academics({
  state,
  grades,
  refresh,
  focusClassId,
  clearFocus,
}: SectionProps & { focusClassId: string | null; clearFocus: () => void }) {
  const active = state.classes.filter((c) => !c.archived);
  const [selectedId, setSelectedId] = useState<string | null>(focusClassId || active[0]?.id || null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (focusClassId) {
      setSelectedId(focusClassId);
      clearFocus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusClassId]);

  useEffect(() => {
    if (!selectedId || !state.classes.find((c) => c.id === selectedId)) {
      setSelectedId(active[0]?.id || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.classes]);

  const selected = state.classes.find((c) => c.id === selectedId) || active[0] || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-deep-dim">{active.length} {active.length === 1 ? "class" : "classes"}</div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm" onClick={() => setShowImport(true)} disabled={active.length === 0}>
            <Icon name="upload" size={14} /> Import grades
          </Btn>
          <Btn size="sm" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={14} /> Add class
          </Btn>
        </div>
      </div>

      {active.length === 0 ? (
        <Empty
          title="No classes yet"
          subtitle="Add your classes to start tracking grades, assignments, and tests — or import a gradebook."
          action={<Btn onClick={() => setShowAdd(true)}><Icon name="plus" size={14} /> Add your first class</Btn>}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {active.map((c) => {
              const g = grades.get(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cx(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                    selected?.id === c.id ? "border-deep-accent bg-deep-panel shadow-sm" : "border-deep-border bg-deep-panel/60 hover:bg-deep-panel",
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="font-medium text-deep-text">{c.name}</span>
                  <span className="text-xs" style={{ color: letterColor(g?.letter ?? null) }}>{fmtPct(g?.percent ?? null)}</span>
                </button>
              );
            })}
          </div>

          {selected && (
            <ClassDetail
              key={selected.id}
              cls={selected}
              grade={grades.get(selected.id)}
              assignments={state.assignments}
              classes={state.classes}
              gpaScale={state.profile.gpaScale}
              refresh={refresh}
            />
          )}
        </>
      )}

      {showAdd && <ClassForm onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {showImport && <ImportWizard classes={active} defaultClassId={selected?.id ?? null} onClose={() => setShowImport(false)} onSaved={refresh} />}
    </div>
  );
}
