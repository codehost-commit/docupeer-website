"use client";

import Image from "next/image";
import { useState } from "react";
import { downloadAssignmentPdf } from "@/lib/atom-pdf";
import type { AtomAssignmentDocument } from "@/lib/atom-types";

const TEST_REQUEST = {
  className: "Calculus III",
  period: "Calculus III",
  assignmentTitle: "Calculus III Comprehensive Practice",
  topic:
    "Multivariable and vector calculus: partial derivatives, multiple integrals, vector fields, line integrals, surface integrals, Green's Theorem, Stokes' Theorem, and the Divergence Theorem",
  topicSummary: "Calculus III",
  studentLevel: "University Calculus III",
  complexity: "advanced",
  questionTypes: ["mcq", "short_frq", "long_frq"],
  questionCount: 20,
  diagrams: true,
  diagramPurpose: "both",
  diagramCount: 2,
  detailLevel: "detailed",
  standards:
    "Calculus III / multivariable calculus. Use mathematically correct notation, units where relevant, and rigorous reasoning.",
  extraNotes:
    "Stress-test high detail in one reliable request. Cover the full course coherently. Use clean LaTeX for every equation, vector, derivative, integral, limit, exponent, subscript, matrix, and symbol. Include two genuinely useful, detailed diagrams and a complete teacher answer key.",
  optionalItems: ["objectives", "materials", "studentInstructions", "teacherAnswerKey", "teacherNotes"],
  testMode: true,
};

export default function AtomTestPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [assignment, setAssignment] = useState<AtomAssignmentDocument | null>(null);

  async function runTest() {
    setBusy(true);
    setMessage("Generating the stress-test assignment...");
    setAssignment(null);
    try {
      const response = await fetch("/api/atom/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(TEST_REQUEST),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The test assignment could not be generated.");
      const nextAssignment = payload.assignment as AtomAssignmentDocument;
      setAssignment(nextAssignment);
      downloadAssignmentPdf(nextAssignment);
      setMessage("PDF ready and downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The test assignment could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-5 py-10 text-[#171b24] sm:px-8 sm:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col items-center justify-center">
        <div className="w-full border-y border-[#ded8cc] py-10 text-center sm:py-14">
          <Image
            src="/atom/atom-for-docupeer-logo.png"
            alt="Atom for DocuPeer"
            width={150}
            height={150}
            className="mx-auto h-28 w-28 object-contain sm:h-36 sm:w-36"
            priority
          />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#637286]">
            Atom for DocuPeer
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Test</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#606978]">
            Calculus III · 20 questions · 2 diagrams · high detail
          </p>
          <button
            type="button"
            onClick={runTest}
            disabled={busy}
            className="mt-9 rounded-md bg-[#1f3447] px-9 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#162635] disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Testing..." : "Test"}
          </button>
          <p aria-live="polite" className="mt-5 min-h-6 text-sm text-[#606978]">
            {message}
          </p>
          {assignment ? (
            <button
              type="button"
              onClick={() => downloadAssignmentPdf(assignment)}
              className="mt-2 text-sm font-semibold text-[#2e6385] underline decoration-[#aac0cf] underline-offset-4"
            >
              Download again
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
