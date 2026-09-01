"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { downloadAssignmentPdf } from "@/lib/atom-pdf";
import {
  ATOM_COMPLEXITIES,
  ATOM_DETAIL_LEVELS,
  ATOM_DIAGRAM_PURPOSES,
  ATOM_OPTIONAL_ITEMS,
  ATOM_QUESTION_TYPES,
  DEFAULT_ATOM_REQUEST,
  type AtomAssignmentDocument,
  type AtomAssignmentRequest,
  type AtomDiagramPurpose,
  type AtomOptionalItem,
  type AtomQuestionType,
} from "@/lib/atom-types";

type WizardStep =
  | "className"
  | "studentLevel"
  | "topic"
  | "assignmentTitle"
  | "period"
  | "complexity"
  | "questionTypes"
  | "questionCount"
  | "diagrams"
  | "diagramPurpose"
  | "diagramCount"
  | "detailLevel"
  | "optionalItems"
  | "standards"
  | "extraNotes";

const STEP_COPY: Record<WizardStep, { kicker: string; title: string; helper: string }> = {
  className: {
    kicker: "Class",
    title: "What class is this assignment for?",
    helper: "Use the course name your students will recognize.",
  },
  studentLevel: {
    kicker: "Level",
    title: "What student level should Atom write for?",
    helper: "Grade level, college level, AP, honors, introductory, or anything similar.",
  },
  topic: {
    kicker: "Topic",
    title: "What should the assignment cover?",
    helper: "Give Atom the unit, reading, standard, lecture, or concept.",
  },
  assignmentTitle: {
    kicker: "Title",
    title: "What title should appear on the PDF?",
    helper: "Leave it blank if you want Atom to name it.",
  },
  period: {
    kicker: "Period",
    title: "What period or section should be on the PDF?",
    helper: "This can be Period 2, Section A, Block 4, or left blank.",
  },
  complexity: {
    kicker: "Rigor",
    title: "How complex should the assignment be?",
    helper: "Choose the level of reasoning and difficulty.",
  },
  questionTypes: {
    kicker: "Format",
    title: "What question types should Atom include?",
    helper: "Pick any mix of multiple choice, short FRQ, and long FRQ.",
  },
  questionCount: {
    kicker: "Length",
    title: "How many questions should Atom make?",
    helper: "Keep it short for an exit ticket or longer for a full assignment.",
  },
  diagrams: {
    kicker: "Diagrams",
    title: "Should the assignment include diagrams?",
    helper: "Atom will write diagram prompts and add diagram spaces to the PDF.",
  },
  diagramPurpose: {
    kicker: "Diagram use",
    title: "What are the diagrams for?",
    helper: "They can be visual references, question prompts, or both.",
  },
  diagramCount: {
    kicker: "Diagram count",
    title: "How many diagrams should Atom plan?",
    helper: "Atom will distribute them where they make sense.",
  },
  detailLevel: {
    kicker: "Detail",
    title: "How detailed should the assignment be?",
    helper: "This affects directions, answer key depth, and teacher notes.",
  },
  optionalItems: {
    kicker: "Optional pages",
    title: "What optional items should appear in the PDF?",
    helper: "Student Instructions and the Teacher Answer Key start on. Choose any other sections you want included.",
  },
  standards: {
    kicker: "Standards",
    title: "Any standards or curriculum notes?",
    helper: "Optional, but useful for AP, Common Core, NGSS, IB, or local pacing guides.",
  },
  extraNotes: {
    kicker: "Final notes",
    title: "Anything else Atom should know?",
    helper: "Optional constraints, readings, vocabulary, accommodations, or grading preferences.",
  },
};

function labelFor<T extends string>(value: T, list: readonly { value: T; label: string }[]) {
  return list.find((item) => item.value === value)?.label ?? value;
}

function totalQuestions(assignment: AtomAssignmentDocument) {
  return assignment.sections.reduce((sum, section) => sum + section.questions.length, 0);
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition ${
        active
          ? "border-[#1f3447] bg-[#f2f5f7] shadow-[inset_0_0_0_1px_#1f3447]"
          : "border-[#ded8cc] bg-[#fbfaf7] hover:border-[#9aaabd]"
      }`}
    >
      {children}
    </button>
  );
}

export function AtomForDocuPeer() {
  const [form, setForm] = useState<AtomAssignmentRequest>(DEFAULT_ATOM_REQUEST);
  const [stepIndex, setStepIndex] = useState(0);
  const [assignment, setAssignment] = useState<AtomAssignmentDocument | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [topicSummary, setTopicSummary] = useState("");

  const steps = useMemo<WizardStep[]>(() => {
    const base: WizardStep[] = [
      "className",
      "studentLevel",
      "topic",
      "assignmentTitle",
      "period",
      "complexity",
      "questionTypes",
      "questionCount",
      "diagrams",
    ];
    if (form.diagrams) base.push("diagramPurpose", "diagramCount");
    return [...base, "detailLevel", "optionalItems", "standards", "extraNotes"];
  }, [form.diagrams]);

  const activeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[activeIndex];
  const copy = STEP_COPY[step];
  const progress = Math.round(((activeIndex + 1) / steps.length) * 100);

  function update(partial: Partial<AtomAssignmentRequest>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function normalizeField(kind: "topic" | "title" | "period", value: string) {
    const response = await fetch("/api/atom/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, value }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Atom could not refine that label.");
    return String(payload.value || value).trim();
  }

  function compactFallback(value: string, maxWords: number) {
    return value
      .replace(/\s+/g, " ")
      .replace(/[.!?]+$/g, "")
      .trim()
      .split(" ")
      .slice(0, maxWords)
      .join(" ");
  }

  async function leaveStep(direction: "next" | "back") {
    const currentStep = step;
    const value = currentStep === "topic" ? form.topic : currentStep === "assignmentTitle" ? (form.assignmentTitle || topicSummary || form.topic) : form.period;
    const shouldNormalize = currentStep === "topic" || currentStep === "assignmentTitle" || currentStep === "period";
    const move = () => setStepIndex((current) => direction === "next" ? Math.min(current + 1, steps.length - 1) : Math.max(0, current - 1));

    if (!shouldNormalize || !value.trim() || (currentStep === "period" && !form.period.trim())) {
      move();
      return;
    }

    setNormalizing(true);
    setMessage(currentStep === "topic" ? "Atom is refining the topic label..." : currentStep === "assignmentTitle" ? "Atom is naming the assignment..." : "Atom is cleaning the period label...");
    try {
      const kind = currentStep === "topic" ? "topic" : currentStep === "assignmentTitle" ? "title" : "period";
      const normalized = await normalizeField(kind, value);
      if (currentStep === "topic") {
        const nextTopic = normalized || compactFallback(value, 10);
        setTopicSummary(nextTopic);
        update({ topicSummary: nextTopic });
      } else if (currentStep === "assignmentTitle") {
        update({ assignmentTitle: normalized || `${topicSummary || form.topic} Assignment` });
      } else {
        update({ period: normalized });
      }
    } catch {
      if (currentStep === "topic") {
        const nextTopic = compactFallback(value, 10);
        setTopicSummary(nextTopic);
        update({ topicSummary: nextTopic });
      } else if (currentStep === "assignmentTitle") {
        update({ assignmentTitle: `${topicSummary || form.topic} Assignment` });
      }
    } finally {
      setNormalizing(false);
      setMessage("");
      move();
    }
  }

  function canContinue() {
    if (step === "className") return form.className.trim().length >= 2;
    if (step === "studentLevel") return form.studentLevel.trim().length >= 2;
    if (step === "topic") return form.topic.trim().length >= 4;
    if (step === "questionTypes") return form.questionTypes.length > 0;
    if (step === "questionCount") return form.questionCount >= 3 && form.questionCount <= 20;
    if (step === "diagramCount") return form.diagramCount >= 1 && form.diagramCount <= 3;
    return true;
  }

  function toggleQuestionType(value: AtomQuestionType) {
    setForm((current) => {
      const exists = current.questionTypes.includes(value);
      const questionTypes = exists
        ? current.questionTypes.filter((item) => item !== value)
        : [...current.questionTypes, value];
      return { ...current, questionTypes };
    });
  }

  async function generate() {
    if (!canContinue()) return;
    setBusy(true);
    setMessage("Atom is building the assignment.");
    setAssignment(null);
    try {
      const response = await fetch("/api/atom/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, topicSummary: topicSummary || form.topicSummary }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Atom could not generate the assignment.");
      setAssignment(payload.assignment);
      setMessage("Assignment ready.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Atom could not generate the assignment.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue()) return;
    if (activeIndex >= steps.length - 1) {
      generate();
      return;
    }
    leaveStep("next");
  }

  function renderStep() {
    if (step === "className") {
      return (
        <input
          autoFocus
          value={form.className}
          onChange={(event) => update({ className: event.target.value })}
          placeholder="AP Biology, English 10, Intro to Psychology..."
          className="w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-lg outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
        />
      );
    }

    if (step === "studentLevel") {
      return (
        <input
          autoFocus
          value={form.studentLevel}
          onChange={(event) => update({ studentLevel: event.target.value })}
          placeholder="9th grade, college freshmen, AP students..."
          className="w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-lg outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
        />
      );
    }

    if (step === "topic") {
      return (
        <textarea
          autoFocus
          value={form.topic}
          onChange={(event) => update({ topic: event.target.value })}
          placeholder="Cellular respiration, rhetorical analysis, derivatives, the causes of WWI..."
          rows={5}
          className="w-full resize-none rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-base leading-7 outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
        />
      );
    }

    if (step === "assignmentTitle") {
      return (
        <input
          autoFocus
          value={form.assignmentTitle}
          onChange={(event) => update({ assignmentTitle: event.target.value })}
          placeholder="Photosynthesis Practice, Unit 4 Checkpoint..."
          className="w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-lg outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
        />
      );
    }

    if (step === "period") {
      return (
        <input
          autoFocus
          value={form.period}
          onChange={(event) => update({ period: event.target.value })}
          placeholder="Period 3, Section B, Block 1..."
          className="w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-lg outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
        />
      );
    }

    if (step === "complexity") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {ATOM_COMPLEXITIES.map((item) => (
            <OptionButton
              key={item.value}
              active={form.complexity === item.value}
              onClick={() => update({ complexity: item.value })}
            >
              <span className="block font-semibold text-[#171b24]">{item.label}</span>
              <span className="mt-1 block text-sm leading-6 text-[#606978]">{item.description}</span>
            </OptionButton>
          ))}
        </div>
      );
    }

    if (step === "questionTypes") {
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {ATOM_QUESTION_TYPES.map((item) => (
            <OptionButton
              key={item.value}
              active={form.questionTypes.includes(item.value)}
              onClick={() => toggleQuestionType(item.value)}
            >
              <span className="block font-semibold text-[#171b24]">{item.label}</span>
            </OptionButton>
          ))}
        </div>
      );
    }

    if (step === "questionCount") {
      return (
        <input
          autoFocus
          type="number"
          min={3}
          max={20}
          value={form.questionCount}
          onChange={(event) => update({ questionCount: Number(event.target.value) })}
          className="w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-lg outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
        />
      );
    }

    if (step === "diagrams") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionButton active={form.diagrams} onClick={() => update({ diagrams: true })}>
            <span className="block font-semibold text-[#171b24]">Include diagrams</span>
            <span className="mt-1 block text-sm leading-6 text-[#606978]">Add visual prompts and diagram boxes.</span>
          </OptionButton>
          <OptionButton active={!form.diagrams} onClick={() => update({ diagrams: false })}>
            <span className="block font-semibold text-[#171b24]">No diagrams</span>
            <span className="mt-1 block text-sm leading-6 text-[#606978]">Keep the PDF text-first.</span>
          </OptionButton>
        </div>
      );
    }

    if (step === "diagramPurpose") {
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {ATOM_DIAGRAM_PURPOSES.map((item) => (
            <OptionButton
              key={item.value}
              active={form.diagramPurpose === item.value}
              onClick={() => update({ diagramPurpose: item.value as AtomDiagramPurpose })}
            >
              <span className="block font-semibold text-[#171b24]">{item.label}</span>
            </OptionButton>
          ))}
        </div>
      );
    }

    if (step === "diagramCount") {
      return (
        <input
          autoFocus
          type="number"
          min={1}
          max={3}
          value={form.diagramCount}
          onChange={(event) => update({ diagramCount: Number(event.target.value) })}
          className="w-full rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-lg outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
        />
      );
    }

    if (step === "detailLevel") {
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {ATOM_DETAIL_LEVELS.map((item) => (
            <OptionButton
              key={item.value}
              active={form.detailLevel === item.value}
              onClick={() => update({ detailLevel: item.value })}
            >
              <span className="block font-semibold text-[#171b24]">{item.label}</span>
            </OptionButton>
          ))}
        </div>
      );
    }

    if (step === "optionalItems") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {ATOM_OPTIONAL_ITEMS.map((item) => {
            const active = form.optionalItems.includes(item.value);
            return (
              <OptionButton
                key={item.value}
                active={active}
                onClick={() => {
                  const optionalItems = active
                    ? form.optionalItems.filter((value) => value !== item.value)
                    : [...form.optionalItems, item.value as AtomOptionalItem];
                  update({ optionalItems });
                }}
              >
                <span className="flex items-center gap-3 font-semibold text-[#171b24]">
                  <span className={`grid h-5 w-5 place-items-center rounded border text-xs ${active ? "border-[#1f3447] bg-[#1f3447] text-white" : "border-[#c7c0b4] bg-white text-transparent"}`}>✓</span>
                  {item.label}
                </span>
                <span className="mt-1 block text-sm leading-6 text-[#606978]">{item.description}</span>
              </OptionButton>
            );
          })}
        </div>
      );
    }

    if (step === "standards") {
      return (
        <textarea
          autoFocus
          value={form.standards}
          onChange={(event) => update({ standards: event.target.value })}
          placeholder="NGSS MS-LS1-2, AP Bio Unit 3, Common Core RI.9-10.1..."
          rows={4}
          className="w-full resize-none rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-base leading-7 outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
        />
      );
    }

    return (
      <textarea
        autoFocus
        value={form.extraNotes}
        onChange={(event) => update({ extraNotes: event.target.value })}
        placeholder="Include vocab, avoid calculators, make it collaborative, add challenge questions..."
        rows={4}
        className="w-full resize-none rounded-md border border-[#d6d0c5] bg-[#fbfaf7] px-4 py-4 text-base leading-7 outline-none transition focus:border-[#1f3447] focus:ring-2 focus:ring-[#1f3447]/15"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#171b24]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#ded8cc] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="https://docupeer.org" className="flex items-center gap-3">
            <span className="relative grid h-12 w-12 overflow-hidden rounded-lg bg-[#f0ede5]">
              <Image
                src="/atom/atom-for-docupeer-logo.png"
                alt=""
                fill
                sizes="48px"
                className="object-contain"
              />
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#596272]">
                Atom for DocuPeer
              </span>
              <span className="block text-2xl font-semibold tracking-normal">
                Assignment Console
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-md border border-[#ded8cc] bg-white px-3 py-2 font-medium text-[#596272]">
              100% free for educators
            </span>
            <Link
              href="https://docupeer.org"
              className="rounded-md bg-[#1f3447] px-4 py-2 font-semibold text-white transition hover:bg-[#162635]"
            >
              Back to DocuPeer
            </Link>
          </div>
        </header>

        <main className="grid flex-1 gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <form
            onSubmit={onSubmit}
            className="rounded-lg border border-[#ddd7cd] bg-white p-6 shadow-[0_24px_70px_rgba(30,33,42,0.08)] sm:p-8"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#687180]">
                  {copy.kicker} / Step {activeIndex + 1} of {steps.length}
                </p>
                <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-[#171b24] sm:text-5xl">
                  {copy.title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#3a4250]">
                  {copy.helper}
                </p>
              </div>
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#f0ede5]">
                <Image
                  src="/atom/atom-for-docupeer-logo.png"
                  alt="Atom logo"
                  fill
                  sizes="96px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div className="mt-8 h-2 overflow-hidden rounded-full bg-[#ebe6dd]">
              <div
                className="h-full rounded-full bg-[#1f3447] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-8">{renderStep()}</div>

            {message ? (
              <div className="mt-6 rounded-lg border border-[#d9d2c6] bg-[#fbfaf7] px-4 py-3 text-sm font-medium text-[#3d4553]">
                {message}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => leaveStep("back")}
                disabled={activeIndex === 0 || busy || normalizing}
                className="rounded-md border border-[#d6d0c5] bg-white px-5 py-3 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!canContinue() || busy || normalizing}
                className="rounded-md bg-[#1f3447] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#162635] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Generating..." : normalizing ? "Refining..." : activeIndex >= steps.length - 1 ? "Generate PDF" : "Next"}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <section className="rounded-lg border border-[#dcd6cb] bg-[#1f3447] p-6 text-white shadow-[0_24px_70px_rgba(30,33,42,0.10)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b7c7d6]">
                Assignment setup
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="text-sm text-[#c8d3df]">Class</div>
                  <div className="mt-1 text-xl font-semibold">{form.className || "Not set"}</div>
                </div>
                <div className="h-px bg-white/15" />
                <div>
                  <div className="text-sm text-[#c8d3df]">Topic</div>
                  <div className="mt-1 text-xl font-semibold">{topicSummary || "Not set"}</div>
                </div>
                <div className="h-px bg-white/15" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-[#c8d3df]">Questions</div>
                    <div className="mt-1 text-xl font-semibold">{form.questionCount}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#c8d3df]">Diagrams</div>
                    <div className="mt-1 text-xl font-semibold">
                      {form.diagrams ? form.diagramCount : "No"}
                    </div>
                  </div>
                </div>
                <div className="h-px bg-white/15" />
                <div>
                  <div className="text-sm text-[#c8d3df]">Formats</div>
                  <div className="mt-1 text-base font-semibold">
                    {form.questionTypes.map((type) => labelFor(type, ATOM_QUESTION_TYPES)).join(", ")}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#dcd6cb] bg-white p-6 shadow-[0_18px_50px_rgba(29,33,42,0.07)]">
              {assignment ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">
                    Ready
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#171b24]">
                    {assignment.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#606978]">
                    {totalQuestions(assignment)} questions across {assignment.sections.length} section
                    {assignment.sections.length === 1 ? "" : "s"}, with a teacher answer key included.
                  </p>
                  <div className="mt-5 grid gap-3">
                    <button
                      type="button"
                      onClick={() => downloadAssignmentPdf(assignment)}
                      className="rounded-md bg-[#1f3447] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162635]"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignment(null);
                        setMessage("");
                        setStepIndex(0);
                      }}
                      className="rounded-md border border-[#d6d0c5] bg-white px-5 py-3 text-sm font-semibold text-[#2d3342] transition hover:border-[#1f3447]"
                    >
                      Start another
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#707887]">
                    Output
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#171b24]">
                    PDF package
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#606978]">
                    Atom will generate a student assignment, diagram spaces when requested, and a teacher answer key.
                  </p>
                </>
              )}
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
