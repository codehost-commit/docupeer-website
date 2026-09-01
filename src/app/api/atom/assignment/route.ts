import { NextRequest, NextResponse } from "next/server";
import {
  AI_MODEL_ATOM_ASSIGNMENT,
  OPENROUTER_ATOM_REFERER,
  OPENROUTER_ATOM_TITLE,
  OPENROUTER_CHAT_COMPLETIONS_URL,
} from "@/lib/constants";
import {
  ATOM_COMPLEXITIES,
  ATOM_DETAIL_LEVELS,
  ATOM_DIAGRAM_PURPOSES,
  ATOM_OPTIONAL_ITEMS,
  ATOM_QUESTION_TYPES,
  type AtomAssignmentDocument,
  type AtomAssignmentRequest,
  type AtomComplexity,
  type AtomDetailLevel,
  type AtomDiagramPurpose,
  type AtomQuestionType,
  type AtomOptionalItem,
} from "@/lib/atom-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const ATOM_ASSIGNMENT_TIMEOUT_MS = Number(process.env.ATOM_ASSIGNMENT_TIMEOUT_MS) || 115000;
const ATOM_MAX_QUESTIONS_PER_REQUEST = Number(process.env.ATOM_MAX_QUESTIONS_PER_REQUEST) || 4;
const ATOM_MAX_DIAGRAMS_PER_REQUEST = Number(process.env.ATOM_MAX_DIAGRAMS_PER_REQUEST) || 1;
const ATOM_ASSIGNMENT_MAX_COMPLETION_TOKENS = Number(process.env.ATOM_ASSIGNMENT_MAX_COMPLETION_TOKENS) || 1000;
const ATOM_ASSIGNMENT_TEST_MAX_COMPLETION_TOKENS =
  Number(process.env.ATOM_ASSIGNMENT_TEST_MAX_COMPLETION_TOKENS) || 1000;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function stringValue(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function periodLabel(value: unknown) {
  const compact = stringValue(value, 60).replace(/\s+/g, " ");
  const match = compact.match(/^(period|section|block)\s*[:#-]?\s*(?:(?:period|section|block)\s*[:#-]?\s*)?([a-z0-9][a-z0-9 -]*)$/i);
  if (!match) return compact;
  const prefix = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return `${prefix} ${match[2].trim()}`;
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
  const optionalItems = Array.isArray(input.optionalItems)
    ? input.optionalItems.filter((value): value is AtomOptionalItem => isInList(value, ATOM_OPTIONAL_ITEMS))
    : ["studentInstructions", "teacherAnswerKey"] as AtomOptionalItem[];

  const request: AtomAssignmentRequest = {
    className: stringValue(input.className, 100),
    period: periodLabel(input.period),
    assignmentTitle: stringValue(input.assignmentTitle, 140),
    topic: stringValue(input.topic, 220),
    studentLevel: stringValue(input.studentLevel, 100),
    complexity: isInList(input.complexity, ATOM_COMPLEXITIES)
      ? (input.complexity as AtomComplexity)
      : "standard",
    questionTypes: questionTypes.length ? questionTypes.slice(0, 3) : ["mcq", "short_frq"],
    questionCount: Math.max(3, Math.min(ATOM_MAX_QUESTIONS_PER_REQUEST, Number(input.questionCount) || 10)),
    diagrams,
    diagramPurpose: isInList(input.diagramPurpose, ATOM_DIAGRAM_PURPOSES)
      ? (input.diagramPurpose as AtomDiagramPurpose)
      : "visual",
    diagramCount: diagrams ? Math.max(1, Math.min(ATOM_MAX_DIAGRAMS_PER_REQUEST, Number(input.diagramCount) || 1)) : 0,
    detailLevel: isInList(input.detailLevel, ATOM_DETAIL_LEVELS)
      ? (input.detailLevel as AtomDetailLevel)
      : "standard",
    standards: stringValue(input.standards, 800),
    extraNotes: stringValue(input.extraNotes, 1000),
    optionalItems,
    topicSummary: stringValue(input.topicSummary, 100),
    testMode: input.testMode === true,
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
  const title = request.assignmentTitle || `${request.topicSummary || request.topic} Assignment`;
  const diagramText = request.diagrams
    ? `${request.diagramCount} actual visual diagram(s), used as ${labelFor(request.diagramPurpose, ATOM_DIAGRAM_PURPOSES).toLowerCase()}. Every diagram must have a structured diagram object and a clear visual specification.`
    : "No diagrams.";
  const optionalText = request.optionalItems
    .map((item) => labelFor(item, ATOM_OPTIONAL_ITEMS))
    .join(", ");

  return [
    "Create a classroom-ready assignment for a teacher/professor using the exact JSON shape below.",
    "The assignment should be free of fluff, age-appropriate, academically useful, and ready to export to PDF.",
    "Create the student-facing assignment. Generate answer data for every question, but include visible answer-key pages only when Teacher Answer Key is selected.",
    "Return exactly the requested number of questions across the sections. Never add extra questions. Number them in order through the sections.",
    "For diagrams, create actual visual specifications, not just a sentence saying a diagram exists. Every requested diagram must be attached to a question with diagramPrompt and diagram: {kind, title, caption, labels}. Use kinds such as free_body, coordinate_plane, process, timeline, molecular, or generic.",
    "Use LaTeX for every mathematical, chemical, scientific, or symbolic expression: inline as \\( ... \\) and displayed equations as \\[ ... \\]. Do not use raw ASCII equations when LaTeX is appropriate.",
    "Because this is JSON, escape every LaTeX backslash correctly inside JSON strings. Use double backslashes in the JSON source for commands such as \\text{}, \\frac{}, \\sin{}, \\cos{}, \\mu{}, and \\circ. Always use braces for commands and never emit malformed fragments such as ext, rac, displaystyle, or ^circ.",
    "The answer key must contain one answer for every question and should be concise, accurate, and formatted with LaTeX wherever math, chemistry, biology, or symbolic notation appears.",
    "Use the full requested detail level while keeping each question and answer compact enough for one reliable JSON response. Do not pad with duplicate questions.",
    "Token budget: keep prompts to 1-2 sentences, choices to short phrases, multiple-choice explanations to 1 sentence, FRQ answers to 1-3 sentences, and teacher notes short.",
    "Return only valid JSON. No Markdown fences. No prose outside JSON.",
    "",
    "Teacher request:",
    `Class: ${request.className}`,
    `Period/section: ${request.period || "blank line"}`,
    `Title: ${title}`,
    `Topic: ${request.topicSummary || request.topic}`,
    `Student level: ${request.studentLevel}`,
    `Complexity: ${labelFor(request.complexity, ATOM_COMPLEXITIES)}`,
    `Question types: ${request.questionTypes.map((type) => labelFor(type, ATOM_QUESTION_TYPES)).join(", ")}`,
    `Question count: EXACTLY ${request.questionCount} (this is a hard constraint; output no more and no fewer)`,
    `Diagrams: ${diagramText}`,
    `Detail level: ${labelFor(request.detailLevel, ATOM_DETAIL_LEVELS)}`,
    `Optional page items (include only these): ${optionalText}`,
    `Standards or curriculum notes: ${request.standards || "None provided."}`,
    `Extra teacher notes: ${request.extraNotes || "None provided."}`,
    "",
    "Required JSON shape:",
    JSON.stringify(
      {
        className: request.className,
        period: request.period,
        title,
        topic: request.topicSummary || request.topic,
        studentLevel: request.studentLevel,
        complexity: labelFor(request.complexity, ATOM_COMPLEXITIES),
        estimatedTime: "45-60 minutes",
        objectives: ["Objective 1", "Objective 2", "Objective 3"],
        materials: ["Pencil", "Paper"],
        studentInstructions: "Clear student-facing directions.",
        optionalItems: request.optionalItems,
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
                diagramPrompt: "Only when a diagram is requested.",
                diagram: { kind: "generic", title: "Diagram title", caption: "What the student should inspect.", labels: ["Label"] },
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

function buildTestPrompt(request: AtomAssignmentRequest) {
  return [
    "Create a high-detail, classroom-ready Calculus III assignment and return only valid JSON. This is a stress test for one reliable request: use rigor, realistic distractors, worked FRQ solutions, and precise diagrams without filler or duplicate questions.",
    "Hard constraints: exactly 4 questions total across sections; exactly 1 actual diagram attached to a relevant question; include all requested optional sections; include one answerKey entry for every question. Use multiple choice, short FRQ, and long FRQ. Use LaTeX for all math and scientific notation with inline \\( ... \\) or display \\[ ... \\]. In JSON strings, escape every LaTeX backslash as two backslashes. Never emit malformed fragments such as ext, rac, displaystyle, or ^circ.",
    "Make the diagrams detailed visual specifications with kind, title, caption, and labels. Prefer coordinate-plane, free-body, vector-field, surface, or process diagrams when educationally appropriate. Make the teacher key accurate and detailed. Return no Markdown and no prose outside the JSON object.",
    `Class: ${request.className}; period: ${request.period || "blank"}; title: ${request.assignmentTitle}; topic: ${request.topic}; level: ${request.studentLevel}; complexity: advanced; question count: EXACTLY 4; diagrams: EXACTLY 1, for both visual reference and questions; detail: high but compact; optional items: ${request.optionalItems.join(", ")}; notes: ${request.extraNotes}`,
    'JSON shape: {"className":"...","period":"...","title":"...","topic":"...","studentLevel":"...","complexity":"Advanced","estimatedTime":"...","objectives":["..."],"materials":["..."],"studentInstructions":"...","optionalItems":["..."],"sections":[{"heading":"...","directions":"...","questions":[{"type":"Multiple choice|Short FRQ|Long FRQ","prompt":"...","choices":["..."],"answer":"...","points":1,"lines":4,"diagramPrompt":"...","diagram":{"kind":"coordinate_plane","title":"...","caption":"...","labels":["..."]}}]}],"answerKey":[{"number":"1","answer":"..."}],"teacherNotes":["..."]}',
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

function inferDiagramKind(prompt: string, diagramPrompt: string) {
  const source = `${prompt} ${diagramPrompt}`.toLowerCase();
  if (/free[- ]?body|force|vector|tension|normal force|friction/.test(source)) return "free_body";
  if (/coordinate|axis|graph|slope|function/.test(source)) return "coordinate_plane";
  if (/timeline|chronolog|sequence|era|event/.test(source)) return "timeline";
  if (/molecule|molecular|cell|organelle|atom|reaction/.test(source)) return "molecular";
  if (/process|cycle|flow|pathway|steps/.test(source)) return "process";
  return "generic";
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
          const diagramPrompt = stringValue(item.diagramPrompt, 900);
          const inferredKind = inferDiagramKind(stringValue(item.prompt, 1200), diagramPrompt);
          const rawDiagram = item.diagram && typeof item.diagram === "object" ? item.diagram : undefined;
          const rawKind = rawDiagram ? stringValue(rawDiagram.kind, 40) : "";
          return {
            type: stringValue(item.type, 60) || "Question",
            prompt: stringValue(item.prompt, 1200),
            choices,
            answer: stringValue(item.answer, 1200),
            points: Number.isFinite(Number(item.points)) ? Math.max(0, Math.min(25, Number(item.points))) : undefined,
            diagramPrompt: request.diagrams ? diagramPrompt || undefined : undefined,
            diagram:
              request.diagrams && rawDiagram
                ? {
                    kind: rawKind && rawKind !== "generic" ? rawKind : inferredKind,
                    title: stringValue(rawDiagram.title, 140),
                    caption: stringValue(rawDiagram.caption, 500),
                    labels: stringArray(rawDiagram.labels, 8),
                  }
                : undefined,
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

  const flatQuestions = sections.flatMap((section) => section.questions).slice(0, request.questionCount);
  if (flatQuestions.length < request.questionCount) {
    throw new Error(`The model returned ${flatQuestions.length} questions; Atom needs exactly ${request.questionCount}. Please try again.`);
  }
  const exactSections = sections
    .map((section) => ({ ...section, questions: flatQuestions.filter((question) => section.questions.includes(question)) }))
    .filter((section) => section.questions.length);

  if (request.diagrams) {
    let diagramIndex = 0;
    for (const question of flatQuestions) {
      if (question.diagramPrompt || question.diagram) {
        if (diagramIndex < request.diagramCount) {
          diagramIndex += 1;
        } else {
          delete question.diagramPrompt;
          delete question.diagram;
        }
      }
    }
    for (const question of flatQuestions) {
      if (diagramIndex >= request.diagramCount) break;
      if (!question.diagramPrompt && !question.diagram) {
        question.diagramPrompt = `Use the visual reference to answer this question about ${request.topicSummary || request.topic}.`;
        question.diagram = {
          kind: inferDiagramKind(question.prompt, question.diagramPrompt || ""),
          title: `Reference diagram ${diagramIndex + 1}`,
          caption: "Inspect the labeled relationships, direction, or sequence shown in the diagram.",
          labels: [],
        };
        diagramIndex += 1;
      }
    }
  }

  const answerKey = flatQuestions.map((question, index) => ({
    number: String(index + 1),
    answer: question.answer || "See the teacher solution for this question.",
  }));

  return {
    className: stringValue(input.className, 100) || request.className,
    period: stringValue(input.period, 60) || request.period,
    title: stringValue(input.title, 140) || request.assignmentTitle || `${request.topicSummary || request.topic} Assignment`,
    topic: stringValue(input.topic, 220) || request.topicSummary || request.topic,
    studentLevel: stringValue(input.studentLevel, 100) || request.studentLevel,
    complexity: stringValue(input.complexity, 80) || labelFor(request.complexity, ATOM_COMPLEXITIES),
    estimatedTime: stringValue(input.estimatedTime, 80) || "45-60 minutes",
    objectives: request.optionalItems.includes("objectives") ? stringArray(input.objectives, 6) : [],
    materials: request.optionalItems.includes("materials") ? stringArray(input.materials, 8) : [],
    studentInstructions:
      request.optionalItems.includes("studentInstructions")
        ? stringValue(input.studentInstructions, 1000) ||
          "Complete each question carefully. Show your work or reasoning when asked."
        : "",
    sections: exactSections,
    answerKey: request.optionalItems.includes("teacherAnswerKey") ? answerKey : [],
    teacherNotes: request.optionalItems.includes("teacherNotes") ? stringArray(input.teacherNotes, 8) : [],
    optionalItems: request.optionalItems,
  };
}

export async function POST(req: NextRequest) {
  try {
    const request = normalizeRequest(await req.json().catch(() => ({})));
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return json(
        {
          error:
            "OPENROUTER_API_KEY is not configured yet. Add it as a Vercel environment variable, then redeploy.",
        },
        503,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ATOM_ASSIGNMENT_TIMEOUT_MS);
    const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": OPENROUTER_ATOM_REFERER,
        "X-OpenRouter-Title": OPENROUTER_ATOM_TITLE,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_MODEL_ATOM_ASSIGNMENT,
        messages: [
          {
            role: "system",
            content:
              "You are Atom for DocuPeer, an expert assignment designer for teachers and professors. You create practical, classroom-ready assignments and return only valid JSON.",
          },
          { role: "user", content: request.testMode ? buildTestPrompt(request) : buildPrompt(request) },
        ],
        temperature: 0.35,
        max_completion_tokens: request.testMode
          ? ATOM_ASSIGNMENT_TEST_MAX_COMPLETION_TOKENS
          : ATOM_ASSIGNMENT_MAX_COMPLETION_TOKENS,
        // Pro keeps the strongest model behavior; minimal effort leaves most
        // of a small account-limited budget for the visible JSON assignment.
        reasoning: { mode: "pro", effort: "minimal", exclude: true },
        response_format: { type: "json_object" },
        stream: false,
      }),
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Atom OpenRouter error", response.status, detail.slice(0, 800));
      const providerMessage = (() => {
        try {
          const parsed = JSON.parse(detail);
          return stringValue(parsed?.error?.message ?? parsed?.message, 220);
        } catch {
          return stringValue(detail, 220);
        }
      })();
      const message =
          response.status === 429
            ? "Atom is busy right now. Wait a moment and try again."
            : response.status === 413
              ? "That assignment is too large for the current AI quota. Try fewer questions or a less detailed assignment."
            : providerMessage || "Atom could not generate that assignment yet.";
      const status = /more credits|can only afford|credit/i.test(message) ? 402 : response.status === 429 ? 429 : 502;
      return json({ error: message }, status);
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
