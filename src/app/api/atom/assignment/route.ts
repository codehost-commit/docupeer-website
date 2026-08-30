import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL_MAIN } from "@/lib/constants";
import {
  ATOM_COMPLEXITIES,
  ATOM_DETAIL_LEVELS,
  ATOM_DIAGRAM_PURPOSES,
  ATOM_QUESTION_TYPES,
  type AtomAssignmentDocument,
  type AtomAssignmentRequest,
  type AtomComplexity,
  type AtomDetailLevel,
  type AtomDiagramPurpose,
  type AtomQuestionType,
} from "@/lib/atom-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function stringValue(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isInList<T extends string>(value: unknown, list: readonly { value: T }[]): value is T {
  return list.some((item) => item.value === value);
}

function normalizeRequest(payload: unknown): AtomAssignmentRequest {
  const input = (payload ?? {}) as Partial<AtomAssignmentRequest>;
  const questionTypes = Array.isArray(input.questionTypes)
    ? input.questionTypes.filter((value): value is AtomQuestionType =>
        isInList(value, ATOM_QUESTION_TYPES),
      )
    : [];
  const diagrams = input.diagrams === true;

  const request: AtomAssignmentRequest = {
    className: stringValue(input.className, 100),
    period: stringValue(input.period, 60),
    assignmentTitle: stringValue(input.assignmentTitle, 140),
    topic: stringValue(input.topic, 220),
    studentLevel: stringValue(input.studentLevel, 100),
    complexity: isInList(input.complexity, ATOM_COMPLEXITIES)
      ? (input.complexity as AtomComplexity)
      : "standard",
    questionTypes: questionTypes.length ? questionTypes.slice(0, 3) : ["mcq", "short_frq"],
    questionCount: Math.max(3, Math.min(40, Number(input.questionCount) || 10)),
    diagrams,
    diagramPurpose: isInList(input.diagramPurpose, ATOM_DIAGRAM_PURPOSES)
      ? (input.diagramPurpose as AtomDiagramPurpose)
      : "visual",
    diagramCount: diagrams ? Math.max(1, Math.min(8, Number(input.diagramCount) || 1)) : 0,
    detailLevel: isInList(input.detailLevel, ATOM_DETAIL_LEVELS)
      ? (input.detailLevel as AtomDetailLevel)
      : "standard",
    standards: stringValue(input.standards, 800),
    extraNotes: stringValue(input.extraNotes, 1000),
  };

  if (request.className.length < 2) {
    throw Object.assign(new Error("Add the class name before generating."), { status: 400 });
  }
  if (request.topic.length < 4) {
    throw Object.assign(new Error("Add a topic before generating."), { status: 400 });
  }
  if (request.studentLevel.length < 2) {
    throw Object.assign(new Error("Add the student level before generating."), { status: 400 });
  }

  return request;
}

function labelFor<T extends string>(value: T, list: readonly { value: T; label: string }[]) {
  return list.find((item) => item.value === value)?.label ?? value;
}

function buildPrompt(request: AtomAssignmentRequest) {
  const title = request.assignmentTitle || `${request.topic} Assignment`;
  const diagramText = request.diagrams
    ? `${request.diagramCount} diagram(s), used as ${labelFor(request.diagramPurpose, ATOM_DIAGRAM_PURPOSES).toLowerCase()}.`
    : "No diagrams.";

  return [
    "Create a classroom-ready assignment for a teacher/professor using the exact JSON shape below.",
    "The assignment should be free of fluff, age-appropriate, academically useful, and ready to export to PDF.",
    "Include a student-facing assignment and a teacher answer key.",
    "For diagrams, write clear diagram descriptions or diagram-based question prompts. Do not generate image URLs.",
    "Return only valid JSON. No Markdown fences. No prose outside JSON.",
    "",
    "Teacher request:",
    `Class: ${request.className}`,
    `Period/section: ${request.period || "blank line"}`,
    `Title: ${title}`,
    `Topic: ${request.topic}`,
    `Student level: ${request.studentLevel}`,
    `Complexity: ${labelFor(request.complexity, ATOM_COMPLEXITIES)}`,
    `Question types: ${request.questionTypes.map((type) => labelFor(type, ATOM_QUESTION_TYPES)).join(", ")}`,
    `Question count: ${request.questionCount}`,
    `Diagrams: ${diagramText}`,
    `Detail level: ${labelFor(request.detailLevel, ATOM_DETAIL_LEVELS)}`,
    `Standards or curriculum notes: ${request.standards || "None provided."}`,
    `Extra teacher notes: ${request.extraNotes || "None provided."}`,
    "",
    "Required JSON shape:",
    JSON.stringify(
      {
        className: request.className,
        period: request.period,
        title,
        topic: request.topic,
        studentLevel: request.studentLevel,
        complexity: labelFor(request.complexity, ATOM_COMPLEXITIES),
        estimatedTime: "45-60 minutes",
        objectives: ["Objective 1", "Objective 2", "Objective 3"],
        materials: ["Pencil", "Paper"],
        studentInstructions: "Clear student-facing directions.",
        sections: [
          {
            heading: "Section title",
            directions: "Section-specific directions.",
            questions: [
              {
                type: "Multiple choice",
                prompt: "Question text",
                choices: ["Choice A", "Choice B", "Choice C", "Choice D"],
                answer: "Correct answer with short explanation",
                points: 1,
              },
              {
                type: "Short FRQ",
                prompt: "Question text",
                answer: "Expected answer",
                points: 3,
                lines: 3,
              },
            ],
          },
        ],
        answerKey: [{ number: "1", answer: "Answer and explanation" }],
        teacherNotes: ["Implementation note"],
      },
      null,
      2,
    ),
  ].join("\n");
}

function extractJsonObject(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error("Model returned text instead of JSON.");
  }
}

function stringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => stringValue(item, 500)).filter(Boolean).slice(0, maxItems);
}

function normalizeAssignment(value: unknown, request: AtomAssignmentRequest): AtomAssignmentDocument {
  const input = (value ?? {}) as Partial<AtomAssignmentDocument>;
  const sectionsInput = Array.isArray(input.sections) ? input.sections : [];
  const sections = sectionsInput
    .map((section) => {
      const sectionInput = section as AtomAssignmentDocument["sections"][number];
      const questionsInput = Array.isArray(sectionInput.questions) ? sectionInput.questions : [];
      const questions = questionsInput
        .map((question) => {
          const item = question as AtomAssignmentDocument["sections"][number]["questions"][number];
          const choices = Array.isArray(item.choices)
            ? item.choices.map((choice) => stringValue(choice, 300)).filter(Boolean).slice(0, 6)
            : undefined;
          return {
            type: stringValue(item.type, 60) || "Question",
            prompt: stringValue(item.prompt, 1200),
            choices,
            answer: stringValue(item.answer, 1200),
            points: Number.isFinite(Number(item.points)) ? Math.max(0, Math.min(25, Number(item.points))) : undefined,
            diagramPrompt: stringValue(item.diagramPrompt, 900) || undefined,
            lines: Number.isFinite(Number(item.lines)) ? Math.max(1, Math.min(12, Number(item.lines))) : undefined,
          };
        })
        .filter((question) => question.prompt);

      return {
        heading: stringValue(sectionInput.heading, 140) || "Questions",
        directions: stringValue(sectionInput.directions, 500),
        questions,
      };
    })
    .filter((section) => section.questions.length)
    .slice(0, 8);

  if (!sections.length) {
    throw new Error("Model returned an assignment without questions.");
  }

  return {
    className: stringValue(input.className, 100) || request.className,
    period: stringValue(input.period, 60) || request.period,
    title: stringValue(input.title, 140) || request.assignmentTitle || `${request.topic} Assignment`,
    topic: stringValue(input.topic, 220) || request.topic,
    studentLevel: stringValue(input.studentLevel, 100) || request.studentLevel,
    complexity: stringValue(input.complexity, 80) || labelFor(request.complexity, ATOM_COMPLEXITIES),
    estimatedTime: stringValue(input.estimatedTime, 80) || "45-60 minutes",
    objectives: stringArray(input.objectives, 6),
    materials: stringArray(input.materials, 8),
    studentInstructions:
      stringValue(input.studentInstructions, 1000) ||
      "Complete each question carefully. Show your work or reasoning when asked.",
    sections,
    answerKey: Array.isArray(input.answerKey)
      ? input.answerKey
          .map((item, index) => {
            const entry = item as AtomAssignmentDocument["answerKey"][number];
            return {
              number: stringValue(entry.number, 20) || String(index + 1),
              answer: stringValue(entry.answer, 1500),
            };
          })
          .filter((item) => item.answer)
          .slice(0, 60)
      : [],
    teacherNotes: stringArray(input.teacherNotes, 8),
  };
}

export async function POST(req: NextRequest) {
  try {
    const request = normalizeRequest(await req.json().catch(() => ({})));
    const key = process.env.GROQ_ATOM_API_KEY;
    if (!key) {
      return json(
        {
          error:
            "GROQ_ATOM_API_KEY is not configured yet. Add it as a Vercel environment variable, then redeploy.",
        },
        503,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_MODEL_MAIN,
        messages: [
          {
            role: "system",
            content:
              "You are Atom for DocuPeer, an expert assignment designer for teachers and professors. You create practical, classroom-ready assignments and return only valid JSON.",
          },
          { role: "user", content: buildPrompt(request) },
        ],
        temperature: 0.35,
        max_completion_tokens: 6500,
        reasoning_effort: "medium",
        response_format: { type: "json_object" },
        stream: false,
      }),
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Atom Groq error", response.status, detail.slice(0, 800));
      const message =
        response.status === 429
          ? "Atom is busy right now. Wait a moment and try again."
          : "Atom could not generate that assignment yet.";
      return json({ error: message }, response.status === 429 ? 429 : 502);
    }

    const data = await response.json();
    const content = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!content) {
      return json({ error: "Atom returned an empty assignment. Try again." }, 502);
    }

    const assignment = normalizeAssignment(extractJsonObject(content), request);
    return json({ assignment });
  } catch (err) {
    const status = typeof (err as { status?: number }).status === "number" ? (err as { status: number }).status : 500;
    if (status >= 500) console.error(err);
    return json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Atom could not generate that assignment yet.",
      },
      status,
    );
  }
}
