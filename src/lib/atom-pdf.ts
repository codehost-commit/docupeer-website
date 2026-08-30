import type { AtomAssignmentDocument, AtomGeneratedQuestion } from "./atom-types";

type PdfFont = "regular" | "bold";
type PdfColor = [number, number, number];

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BLACK: PdfColor = [0.08, 0.1, 0.14];
const MUTED: PdfColor = [0.32, 0.36, 0.42];
const BLUE: PdfColor = [0.12, 0.25, 0.34];
const RED: PdfColor = [0.68, 0.12, 0.12];
const LIGHT_LINE: PdfColor = [0.76, 0.78, 0.81];
const encoder = new TextEncoder();

function normalizePdfText(value: unknown): string {
  return String(value ?? "")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\\\[(.*?)\\\]/gs, "$1")
    .replace(/\$(.*?)\$/gs, "$1")
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
    .replace(/\\mathbf\{([^{}]*)\}/g, "$1")
    .replace(/\\(cdot|times)/g, " x ")
    .replace(/\\(quad|qquad|enspace)/g, " ")
    .replace(/\\[,;:!]/g, "")
    .replace(/\\pm/g, "+/-")
    .replace(/\\(leq|le)/g, "<=")
    .replace(/\\(geq|ge)/g, ">=")
    .replace(/\\rightarrow/g, "->")
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/\^\{([^{}]*)\}/g, "^$1")
    .replace(/_\{([^{}]*)\}/g, "_$1")
    .replace(/[{}]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function escapePdfText(value: unknown): string {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function byteLength(value: string) {
  return encoder.encode(value).length;
}

function fit(value: number) {
  return Number(value.toFixed(2));
}

function color(value: PdfColor) {
  return value.map(fit).join(" ");
}

function wrapText(text: string, maxWidth: number, size: number, font: PdfFont) {
  const averageCharacterWidth = size * (font === "bold" ? 0.53 : 0.48);
  const maxChars = Math.max(18, Math.floor(maxWidth / averageCharacterWidth));
  const lines: string[] = [];
  for (const paragraph of normalizePdfText(text).split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      if (word.length > maxChars) {
        if (current) lines.push(current);
        current = "";
        for (let index = 0; index < word.length; index += maxChars) lines.push(word.slice(index, index + maxChars));
        continue;
      }
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

class PdfDocument {
  private pages: string[][] = [[]];
  private y = PAGE_HEIGHT - MARGIN;

  private get currentPage() {
    return this.pages[this.pages.length - 1];
  }

  private addRaw(command: string) {
    this.currentPage.push(command);
  }

  addPage() {
    this.pages.push([]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN) this.addPage();
  }

  textAt(text: string, x: number, y: number, size = 11, font: PdfFont = "regular", textColor: PdfColor = BLACK) {
    const pdfFont = font === "bold" ? "F2" : "F1";
    this.addRaw(`q ${color(textColor)} rg BT /${pdfFont} ${fit(size)} Tf 1 0 0 1 ${fit(x)} ${fit(y)} Tm (${escapePdfText(text)}) Tj ET Q`);
  }

  move(amount: number) {
    this.y -= amount;
  }

  paragraph(text: string, opts: { size?: number; font?: PdfFont; indent?: number; maxWidth?: number; leading?: number; color?: PdfColor } = {}) {
    const size = opts.size ?? 11;
    const font = opts.font ?? "regular";
    const indent = opts.indent ?? 0;
    const width = opts.maxWidth ?? CONTENT_WIDTH - indent;
    const leading = opts.leading ?? size + 5;
    const lines = wrapText(text, width, size, font);
    for (const line of lines) {
      this.ensureSpace(leading);
      if (line) this.textAt(line, MARGIN + indent, this.y, size, font, opts.color ?? BLACK);
      this.y -= leading;
    }
    return lines.length;
  }

  heading(text: string, size = 16, textColor: PdfColor = BLACK) {
    this.ensureSpace(size + 18);
    this.paragraph(text, { size, font: "bold", leading: size + 5, color: textColor });
    this.y -= 7;
  }

  smallLabel(text: string, textColor: PdfColor = BLUE) {
    this.ensureSpace(18);
    this.textAt(text.toUpperCase(), MARGIN, this.y, 8, "bold", textColor);
    this.y -= 15;
  }

  rule() {
    this.ensureSpace(12);
    this.addRaw(`q ${color([0.83, 0.82, 0.78])} RG 0.8 w ${MARGIN} ${fit(this.y)} m ${PAGE_WIDTH - MARGIN} ${fit(this.y)} l S Q`);
    this.y -= 18;
  }

  private answerLine() {
    this.ensureSpace(17);
    const y = this.y + 2;
    this.addRaw(`q ${color(LIGHT_LINE)} RG 0.6 w ${MARGIN} ${fit(y)} m ${PAGE_WIDTH - MARGIN} ${fit(y)} l S Q`);
    this.y -= 18;
  }

  private line(x1: number, y1: number, x2: number, y2: number, lineColor: PdfColor = BLUE, width = 1.2) {
    this.addRaw(`q ${color(lineColor)} RG ${fit(width)} w ${fit(x1)} ${fit(y1)} m ${fit(x2)} ${fit(y2)} l S Q`);
  }

  private arrow(x1: number, y1: number, x2: number, y2: number) {
    this.line(x1, y1, x2, y2);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 6;
    this.line(x2, y2, x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    this.line(x2, y2, x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
  }

  private diagramDrawing(kind: string, x: number, y: number, width: number, height: number) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const normalized = kind.toLowerCase();
    if (normalized.includes("free") || normalized.includes("force")) {
      this.addRaw(`q ${color([0.92, 0.94, 0.95])} rg ${fit(cx - 22)} ${fit(cy - 15)} 44 30 re f Q`);
      this.arrow(cx, cy + 15, cx, cy + 48);
      this.arrow(cx, cy - 15, cx, cy - 48);
      this.arrow(cx - 22, cy, cx - 56, cy);
      this.arrow(cx + 22, cy, cx + 56, cy);
      this.textAt("up", cx + 8, cy + 41, 8, "regular", MUTED);
      this.textAt("down", cx + 8, cy - 46, 8, "regular", MUTED);
    } else if (normalized.includes("coordinate") || normalized.includes("graph")) {
      this.line(x + 36, cy, x + width - 30, cy);
      this.line(cx, y + 22, cx, y + height - 18);
      this.arrow(cx, cy, cx + 48, cy + 25);
      this.textAt("x", x + width - 24, cy - 12, 9, "bold", MUTED);
      this.textAt("y", cx + 8, y + height - 13, 9, "bold", MUTED);
    } else if (normalized.includes("timeline")) {
      this.line(x + 42, cy, x + width - 42, cy);
      for (let index = 0; index < 4; index += 1) {
        const px = x + 58 + index * ((width - 116) / 3);
        this.addRaw(`q ${color(BLUE)} rg ${fit(px - 4)} ${fit(cy - 4)} 8 8 re f Q`);
        this.textAt(`step ${index + 1}`, px - 15, cy - 20, 8, "regular", MUTED);
      }
    } else if (normalized.includes("process") || normalized.includes("flow")) {
      for (let index = 0; index < 3; index += 1) {
        const px = x + 52 + index * ((width - 104) / 2);
        this.addRaw(`q ${color([0.92, 0.94, 0.95])} rg ${fit(px - 29)} ${fit(cy - 17)} 58 34 re f Q`);
        this.textAt(`${index + 1}`, px - 3, cy - 3, 10, "bold", BLUE);
        if (index < 2) this.arrow(px + 31, cy, px + 62, cy);
      }
    } else if (normalized.includes("molecular") || normalized.includes("cell")) {
      for (let index = 0; index < 4; index += 1) {
        const px = x + 62 + (index % 2) * 92;
        const py = cy + (index < 2 ? 21 : -21);
        this.addRaw(`q ${color([0.92, 0.94, 0.95])} rg ${fit(px - 13)} ${fit(py - 13)} 26 26 re f Q`);
        if (index > 0) this.line(px - 44, py, px - 14, py, BLUE, 1);
      }
    } else {
      this.line(x + 35, cy, x + width - 35, cy, LIGHT_LINE, 0.8);
      this.line(cx, y + 18, cx, y + height - 18, LIGHT_LINE, 0.8);
      this.addRaw(`q ${color([0.92, 0.94, 0.95])} rg ${fit(cx - 22)} ${fit(cy - 22)} 44 44 re f Q`);
    }
  }

  diagramBox(question: AtomGeneratedQuestion, number: number, teacher: boolean) {
    const height = 148;
    this.ensureSpace(height + 34);
    const boxY = this.y - height;
    const fill = teacher ? [0.99, 0.95, 0.95] : [0.96, 0.97, 0.97];
    this.addRaw(`q ${color(fill as PdfColor)} rg ${MARGIN} ${fit(boxY)} ${CONTENT_WIDTH} ${height} re f Q`);
    this.addRaw(`q ${color(teacher ? [0.82, 0.45, 0.45] : [0.61, 0.68, 0.72])} RG 0.8 w ${MARGIN} ${fit(boxY)} ${CONTENT_WIDTH} ${height} re S Q`);
    const diagram = question.diagram;
    this.textAt(diagram?.title || `Diagram ${number}`, MARGIN + 14, boxY + height - 19, 9, "bold", teacher ? RED : BLUE);
    this.diagramDrawing(diagram?.kind || "generic", MARGIN + 14, boxY + 37, CONTENT_WIDTH - 28, height - 62);
    this.y = boxY + 24;
    const labels = diagram?.labels?.length ? ` Labels: ${diagram.labels.join(", ")}.` : "";
    this.paragraph(`${diagram?.caption || question.diagramPrompt || "Use the visual reference to support your reasoning."}${labels}`, { size: 8.5, leading: 11, indent: 14, maxWidth: CONTENT_WIDTH - 28, color: teacher ? RED : MUTED });
    this.y = boxY - 18;
  }

  addQuestion(number: number, question: AtomGeneratedQuestion, teacher: boolean, fallbackAnswer?: string) {
    this.ensureSpace(30);
    this.paragraph(`${number}. ${question.prompt}`, { font: "bold", leading: 15 });
    if (question.diagramPrompt || question.diagram) this.diagramBox(question, number, teacher);
    if (question.choices?.length) {
      question.choices.forEach((choice, index) => this.paragraph(`${String.fromCharCode(65 + index)}. ${choice}`, { indent: 16, size: 10.5, leading: 14 }));
    }

    const kind = question.type.toLowerCase();
    const isMultipleChoice = Boolean(question.choices?.length) || kind.includes("multiple") || kind.includes("mcq");
    const responseLines = typeof question.lines === "number"
      ? Math.max(1, Math.min(12, question.lines))
      : kind.includes("long") ? 8 : kind.includes("short") || !isMultipleChoice ? 4 : 0;
    const answer = question.answer || fallbackAnswer || "";

    if (isMultipleChoice) {
      if (teacher && answer) {
        let letter = answer.match(/\b([A-F])\b/i)?.[1]?.toUpperCase();
        if (!letter && question.choices) {
          const choiceIndex = question.choices.findIndex((choice) => answer.toLowerCase().includes(choice.toLowerCase()));
          if (choiceIndex >= 0) letter = String.fromCharCode(65 + choiceIndex);
        }
        this.paragraph(`Answer: ${letter || answer}`, { indent: 16, size: 10, leading: 14, font: "bold", color: RED });
      }
    } else if (responseLines > 0) {
      const answerLines = teacher ? wrapText(answer, CONTENT_WIDTH - 16, 9.5, "regular") : [];
      const lineCount = teacher ? Math.max(responseLines, answerLines.length) : responseLines;
      for (let index = 0; index < lineCount; index += 1) {
        this.ensureSpace(17);
        const lineY = this.y + 2;
        this.addRaw(`q ${color(LIGHT_LINE)} RG 0.6 w ${MARGIN} ${fit(lineY)} m ${PAGE_WIDTH - MARGIN} ${fit(lineY)} l S Q`);
        if (teacher && answerLines[index]) this.textAt(answerLines[index], MARGIN + 4, this.y + 5, 9.5, "regular", RED);
        this.y -= 18;
      }
    }
    this.y -= 8;
  }

  build() {
    const objects: string[] = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ];
    const pageRefs: number[] = [];
    for (const page of this.pages) {
      const stream = page.join("\n");
      const contentRef = objects.length + 1;
      objects.push(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
      const pageRef = objects.length + 1;
      pageRefs.push(pageRef);
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`);
    }
    objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
    let output = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = byteLength(output);
      output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = byteLength(output);
    output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return encoder.encode(output);
  }
}

function cleanFileName(value: string) {
  const name = normalizePdfText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return name || "atom-assignment";
}

function selectedItems(assignment: AtomAssignmentDocument) {
  return Array.isArray(assignment.optionalItems) ? assignment.optionalItems : ["objectives", "materials", "studentInstructions", "teacherAnswerKey"];
}

function addHeader(pdf: PdfDocument, assignment: AtomAssignmentDocument, teacher: boolean) {
  pdf.smallLabel(teacher ? "Atom for DocuPeer | Teacher Copy" : "Atom for DocuPeer");
  pdf.heading(teacher ? `${assignment.title || "Assignment"} | Answer Key` : assignment.title || "Assignment", 23, teacher ? RED : BLACK);
  pdf.paragraph("Name: ________________________________________________", { size: 10.5, font: "bold" });
  pdf.paragraph(`Period / Section: ${assignment.period || "________________"}`, { size: 10.5, font: "bold" });
  pdf.move(2);
  pdf.paragraph(`Class: ${assignment.className || "Class"}`, { size: 10.5 });
  pdf.paragraph(`Topic: ${assignment.topic || "Topic"}`, { size: 10.5 });
  pdf.paragraph(`Level: ${assignment.studentLevel || "Students"}`, { size: 10.5 });
  pdf.paragraph(`Complexity: ${assignment.complexity || "Standard"}`, { size: 10.5 });
  pdf.paragraph(`Estimated time: ${assignment.estimatedTime || "Class period"}`, { size: 10.5 });
  pdf.rule();
}

function addTopSections(pdf: PdfDocument, assignment: AtomAssignmentDocument) {
  const optional = selectedItems(assignment);
  if (optional.includes("objectives") && assignment.objectives.length) {
    pdf.heading("Objectives", 14);
    assignment.objectives.forEach((item) => pdf.paragraph(`- ${item}`, { indent: 10, size: 10.5, leading: 15 }));
    pdf.move(5);
  }
  if (optional.includes("materials") && assignment.materials.length) {
    pdf.heading("Materials", 14);
    assignment.materials.forEach((item) => pdf.paragraph(`- ${item}`, { indent: 10, size: 10.5, leading: 15 }));
    pdf.move(5);
  }
  if (optional.includes("studentInstructions") && assignment.studentInstructions) {
    pdf.heading("Student Instructions", 14);
    pdf.paragraph(assignment.studentInstructions, { size: 10.5, leading: 15 });
    pdf.move(6);
  }
}

function addBody(pdf: PdfDocument, assignment: AtomAssignmentDocument, teacher: boolean) {
  addTopSections(pdf, assignment);
  let number = 1;
  const answers = new Map(assignment.answerKey.map((item) => [String(item.number), item.answer]));
  for (const section of assignment.sections) {
    pdf.heading(section.heading || "Questions", 14, teacher ? RED : BLACK);
    if (section.directions) pdf.paragraph(section.directions, { size: 10.5, leading: 15 });
    for (const question of section.questions) {
      pdf.addQuestion(number, question, teacher, answers.get(String(number)));
      number += 1;
    }
  }
  if (teacher && selectedItems(assignment).includes("teacherNotes") && assignment.teacherNotes.length) {
    pdf.heading("Teacher Notes", 14, RED);
    assignment.teacherNotes.forEach((note) => pdf.paragraph(`- ${note}`, { indent: 10, size: 10.5, leading: 15, color: RED }));
  }
}

export function createAssignmentPdf(assignment: AtomAssignmentDocument) {
  const pdf = new PdfDocument();
  addHeader(pdf, assignment, false);
  addBody(pdf, assignment, false);
  if (selectedItems(assignment).includes("teacherAnswerKey") && assignment.answerKey.length) {
    pdf.addPage();
    addHeader(pdf, assignment, true);
    addBody(pdf, assignment, true);
  }
  return { bytes: pdf.build(), filename: `${cleanFileName(assignment.title)}.pdf` };
}

export function downloadAssignmentPdf(assignment: AtomAssignmentDocument) {
  const { bytes, filename } = createAssignmentPdf(assignment);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
