import type { AtomAssignmentDocument, AtomGeneratedQuestion } from "./atom-types";

type PdfFont = "regular" | "bold";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const encoder = new TextEncoder();

function normalizePdfText(value: unknown): string {
  return String(value ?? "")
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

function wrapText(text: string, maxWidth: number, size: number, font: PdfFont) {
  const avg = size * (font === "bold" ? 0.56 : 0.5);
  const maxChars = Math.max(12, Math.floor(maxWidth / avg));
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
        if (current) {
          lines.push(current);
          current = "";
        }
        for (let index = 0; index < word.length; index += maxChars) {
          lines.push(word.slice(index, index + maxChars));
        }
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

  textAt(text: string, x: number, y: number, size = 11, font: PdfFont = "regular") {
    const pdfFont = font === "bold" ? "F2" : "F1";
    this.addRaw(`BT /${pdfFont} ${fit(size)} Tf 1 0 0 1 ${fit(x)} ${fit(y)} Tm (${escapePdfText(text)}) Tj ET`);
  }

  move(amount: number) {
    this.y -= amount;
  }

  heading(text: string, size = 18) {
    this.ensureSpace(size + 14);
    this.textAt(text, MARGIN, this.y, size, "bold");
    this.y -= size + 10;
  }

  smallLabel(text: string) {
    this.ensureSpace(18);
    this.textAt(text.toUpperCase(), MARGIN, this.y, 8, "bold");
    this.y -= 16;
  }

  paragraph(text: string, opts: { size?: number; font?: PdfFont; indent?: number; maxWidth?: number; leading?: number } = {}) {
    const size = opts.size ?? 11;
    const font = opts.font ?? "regular";
    const indent = opts.indent ?? 0;
    const width = opts.maxWidth ?? CONTENT_WIDTH - indent;
    const leading = opts.leading ?? size + 5;
    const lines = wrapText(text, width, size, font);

    for (const line of lines) {
      this.ensureSpace(leading);
      if (line) this.textAt(line, MARGIN + indent, this.y, size, font);
      this.y -= leading;
    }
  }

  bulletList(items: string[]) {
    for (const item of items.filter(Boolean)) {
      this.paragraph(`- ${item}`, { indent: 10 });
    }
  }

  rule() {
    this.ensureSpace(12);
    this.addRaw(`q 0.83 0.81 0.76 RG 0.8 w ${MARGIN} ${fit(this.y)} m ${PAGE_WIDTH - MARGIN} ${fit(this.y)} l S Q`);
    this.y -= 18;
  }

  answerLine(width = 350) {
    this.ensureSpace(14);
    const y = this.y + 2;
    this.addRaw(`q 0.65 0.67 0.72 RG 0.5 w ${MARGIN + 18} ${fit(y)} m ${fit(MARGIN + 18 + width)} ${fit(y)} l S Q`);
    this.y -= 18;
  }

  diagramBox(label: string) {
    const height = 116;
    this.ensureSpace(height + 32);
    const y = this.y - height;
    this.addRaw(`q 0.78 0.75 0.68 RG 1 w ${MARGIN + 18} ${fit(y)} ${CONTENT_WIDTH - 36} ${height} re S Q`);
    this.textAt(label, MARGIN + 28, y + height - 18, 9, "bold");
    this.y = y - 18;
  }

  addQuestion(number: number, question: AtomGeneratedQuestion) {
    const title = `${number}. ${question.prompt}`;
    this.paragraph(title, { font: "bold", indent: 0, leading: 16 });

    if (question.diagramPrompt) {
      this.paragraph(`Diagram: ${question.diagramPrompt}`, { indent: 18, size: 10, leading: 14 });
      this.diagramBox("Diagram space");
    }

    if (question.choices?.length) {
      question.choices.forEach((choice, index) => {
        const letter = String.fromCharCode(65 + index);
        this.paragraph(`${letter}. ${choice}`, { indent: 18, size: 10.5, leading: 14 });
      });
    }

    const responseLines =
      typeof question.lines === "number"
        ? Math.max(1, Math.min(12, question.lines))
        : question.type.toLowerCase().includes("long")
          ? 8
          : question.type.toLowerCase().includes("short")
            ? 3
            : 0;

    for (let index = 0; index < responseLines; index += 1) {
      this.answerLine(question.type.toLowerCase().includes("long") ? CONTENT_WIDTH - 36 : 350);
    }

    this.move(8);
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
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`,
      );
    }

    objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;

    let output = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = byteLength(output);
      output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = byteLength(output);
    output += `xref\n0 ${objects.length + 1}\n`;
    output += "0000000000 65535 f \n";
    for (let index = 1; index <= objects.length; index += 1) {
      output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return encoder.encode(output);
  }
}

function cleanFileName(value: string) {
  const name = normalizePdfText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || "atom-assignment";
}

export function createAssignmentPdf(assignment: AtomAssignmentDocument) {
  const pdf = new PdfDocument();

  pdf.smallLabel("Atom for DocuPeer");
  pdf.heading(assignment.title || "Assignment", 24);
  pdf.paragraph(`Name: ________________________________        Period: ${assignment.period || "__________"}`, {
    size: 11,
    font: "bold",
  });
  pdf.paragraph(`Class: ${assignment.className || "Class"}        Topic: ${assignment.topic || "Topic"}`, {
    size: 10.5,
  });
  pdf.paragraph(`Level: ${assignment.studentLevel || "Students"}        Complexity: ${assignment.complexity || "Standard"}        Estimated time: ${assignment.estimatedTime || "Class period"}`, {
    size: 10.5,
  });
  pdf.rule();

  if (assignment.objectives.length) {
    pdf.heading("Objectives", 14);
    pdf.bulletList(assignment.objectives);
    pdf.move(6);
  }

  if (assignment.materials.length) {
    pdf.heading("Materials", 14);
    pdf.bulletList(assignment.materials);
    pdf.move(6);
  }

  pdf.heading("Student Instructions", 14);
  pdf.paragraph(assignment.studentInstructions || "Complete each question carefully and show your thinking when asked.", {
    leading: 16,
  });
  pdf.move(8);

  let questionNumber = 1;
  for (const section of assignment.sections) {
    pdf.heading(section.heading || "Questions", 15);
    if (section.directions) {
      pdf.paragraph(section.directions, { size: 10.5, leading: 15 });
      pdf.move(4);
    }
    for (const question of section.questions) {
      pdf.addQuestion(questionNumber, question);
      questionNumber += 1;
    }
  }

  if (assignment.answerKey.length || assignment.teacherNotes.length) {
    pdf.addPage();
    pdf.smallLabel("Atom for DocuPeer");
    pdf.heading("Teacher Answer Key", 22);
    if (assignment.answerKey.length) {
      assignment.answerKey.forEach((item) => {
        pdf.paragraph(`${item.number}. ${item.answer}`, { leading: 16 });
      });
    }
    if (assignment.teacherNotes.length) {
      pdf.move(12);
      pdf.heading("Teacher Notes", 14);
      pdf.bulletList(assignment.teacherNotes);
    }
  }

  return {
    bytes: pdf.build(),
    filename: `${cleanFileName(assignment.title)}.pdf`,
  };
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
