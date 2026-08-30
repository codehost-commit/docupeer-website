export const ATOM_COMPLEXITIES = [
  { value: "intro", label: "Introductory", description: "Clear and approachable." },
  { value: "standard", label: "Standard", description: "Balanced classroom depth." },
  { value: "challenging", label: "Challenging", description: "More synthesis and transfer." },
  { value: "advanced", label: "Advanced", description: "High rigor with layered reasoning." },
] as const;

export const ATOM_QUESTION_TYPES = [
  { value: "mcq", label: "Multiple choice" },
  { value: "short_frq", label: "Short FRQ" },
  { value: "long_frq", label: "Long FRQ" },
] as const;

export const ATOM_DIAGRAM_PURPOSES = [
  { value: "visual", label: "Visual reference" },
  { value: "question", label: "Question prompt" },
  { value: "both", label: "Both" },
] as const;

export const ATOM_DETAIL_LEVELS = [
  { value: "concise", label: "Concise" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
] as const;

export type AtomComplexity = (typeof ATOM_COMPLEXITIES)[number]["value"];
export type AtomQuestionType = (typeof ATOM_QUESTION_TYPES)[number]["value"];
export type AtomDiagramPurpose = (typeof ATOM_DIAGRAM_PURPOSES)[number]["value"];
export type AtomDetailLevel = (typeof ATOM_DETAIL_LEVELS)[number]["value"];

export type AtomAssignmentRequest = {
  className: string;
  period: string;
  assignmentTitle: string;
  topic: string;
  studentLevel: string;
  complexity: AtomComplexity;
  questionTypes: AtomQuestionType[];
  questionCount: number;
  diagrams: boolean;
  diagramPurpose: AtomDiagramPurpose;
  diagramCount: number;
  detailLevel: AtomDetailLevel;
  standards: string;
  extraNotes: string;
};

export type AtomGeneratedQuestion = {
  type: "Multiple choice" | "Short FRQ" | "Long FRQ" | "Diagram" | string;
  prompt: string;
  choices?: string[];
  answer?: string;
  points?: number;
  diagramPrompt?: string;
  lines?: number;
};

export type AtomAssignmentSection = {
  heading: string;
  directions?: string;
  questions: AtomGeneratedQuestion[];
};

export type AtomAnswerKeyItem = {
  number: string;
  answer: string;
};

export type AtomAssignmentDocument = {
  className: string;
  period: string;
  title: string;
  topic: string;
  studentLevel: string;
  complexity: string;
  estimatedTime: string;
  objectives: string[];
  materials: string[];
  studentInstructions: string;
  sections: AtomAssignmentSection[];
  answerKey: AtomAnswerKeyItem[];
  teacherNotes: string[];
};

export const DEFAULT_ATOM_REQUEST: AtomAssignmentRequest = {
  className: "",
  period: "",
  assignmentTitle: "",
  topic: "",
  studentLevel: "",
  complexity: "standard",
  questionTypes: ["mcq", "short_frq"],
  questionCount: 10,
  diagrams: false,
  diagramPurpose: "visual",
  diagramCount: 1,
  detailLevel: "standard",
  standards: "",
  extraNotes: "",
};
