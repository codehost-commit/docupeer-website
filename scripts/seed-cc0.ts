// Seed DocuPeer's DB with ~1,000 real CC0-licensed papers.
//
// Source: OpenAlex (https://api.openalex.org). Free, no auth. Filtering with
// `open_access.license:cc0` returns works whose full text is dedicated to the
// public domain under CC0. Abstracts are reconstructed from their inverted
// index (that is the format OpenAlex exposes).
//
// All fetched papers are attached to a single dummy "Anonymous" author account
// (real authorship is never surfaced through the review interface anyway).
//
// Run:
//   npx tsx scripts/seed-cc0.ts
// or add to package.json:
//   "seed:cc0": "tsx scripts/seed-cc0.ts"
//
// Optional env:
//   TARGET_PAPERS=1000    how many papers to try to insert (default 1000)
//   TARGET_TOTAL=1        treat TARGET_PAPERS as the final seeded-paper count
//   MIN_WORDS=350         floor for a paper to be usable (default 350)
//   OPENALEX_MAILTO=you@example.com   OpenAlex "polite pool" identifier
//   OPENALEX_PER_PAGE=200 page size for OpenAlex requests (default 200)
//   OPENALEX_RETRIES=6    retry count for OpenAlex 429/5xx/network failures
//   OPENALEX_SLEEP_MS=300 pause between successful OpenAlex pages
//   WIPE_PAPERS=1         wipe existing papers/reviews before inserting

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const TARGET = Number(process.env.TARGET_PAPERS ?? 1000);
const TARGET_TOTAL = process.env.TARGET_TOTAL === "1";
const MIN_WORDS = Number(process.env.MIN_WORDS ?? 350);
const MAILTO = process.env.OPENALEX_MAILTO ?? "hello@docupeer.org";
const WIPE = process.env.WIPE_PAPERS === "1";
const OPENALEX_PER_PAGE = Number(process.env.OPENALEX_PER_PAGE ?? 200);
const OPENALEX_RETRIES = Number(process.env.OPENALEX_RETRIES ?? 6);
const OPENALEX_RETRY_BASE_MS = Number(
  process.env.OPENALEX_RETRY_BASE_MS ?? 1500
);
const OPENALEX_SLEEP_MS = Number(process.env.OPENALEX_SLEEP_MS ?? 300);
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
// Pipe-separated OpenAlex license values. Defaults to CC0 + public-domain +
// CC-BY: all freely redistributable, giving a big enough pool to hit 1000.
// Override with LICENSES=cc0 for strict CC0 only.
const LICENSES = (process.env.LICENSES ?? "cc0|public-domain|cc-by").trim();
const CHECKPOINT_PATH =
  process.env.CHECKPOINT_PATH ??
  path.join(process.cwd(), "_to_delete", "openalex-cc0-checkpoint.json");
const RESUME = process.env.RESUME === "1";

// Map an OpenAlex `primary_topic.field.display_name` to our own category list.
// OpenAlex field names come from a controlled vocabulary; we fold them into the
// DocuPeer taxonomy in src/lib/constants.ts.
const CATEGORY_MAP: Record<string, string> = {
  "Mathematics": "Mathematics",
  "Physics and Astronomy": "Physics",
  "Chemistry": "Chemistry",
  "Chemical Engineering": "Chemistry",
  "Biochemistry, Genetics and Molecular Biology": "Biology",
  "Agricultural and Biological Sciences": "Biology",
  "Immunology and Microbiology": "Biology",
  "Neuroscience": "Biology",
  "Pharmacology, Toxicology and Pharmaceutics": "Medicine & Health Sciences",
  "Medicine": "Medicine & Health Sciences",
  "Dentistry": "Medicine & Health Sciences",
  "Nursing": "Medicine & Health Sciences",
  "Health Professions": "Medicine & Health Sciences",
  "Veterinary": "Medicine & Health Sciences",
  "Computer Science": "Computer Science",
  "Engineering": "Engineering",
  "Materials Science": "Engineering",
  "Energy": "Engineering",
  "Earth and Planetary Sciences": "Earth & Environmental Science",
  "Environmental Science": "Earth & Environmental Science",
  "Arts and Humanities": "Literature & Writing",
  "Business, Management and Accounting": "Business",
  "Economics, Econometrics and Finance": "Economics",
  "Psychology": "Psychology",
  "Social Sciences": "Social Sciences",
  "Decision Sciences": "Social Sciences",
};

// Education levels are guessed loosely from the topic. Most published research
// papers we pull are graduate/researcher level; introductory topics get
// bumped to "college" for a bit of variety in the matcher.
function guessEducationLevel(topicName: string): string {
  const t = topicName.toLowerCase();
  if (/(introduc|primer|survey|review)/.test(t)) return "college";
  if (/(clinic|trial|patient)/.test(t)) return "professional";
  return "researcher";
}

// A published paper's closest DocuPeer paperType.
function guessPaperType(topicName: string): string {
  const t = topicName.toLowerCase();
  if (/(review|survey)/.test(t)) return "Literature Review";
  if (/(clinical|case)/.test(t)) return "Case Study";
  if (/(lab|experiment|assay)/.test(t)) return "Lab Report";
  return "Research Paper";
}

function words(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(retryAfter: string | null, attempt: number): number {
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(120_000, retryAfterSeconds * 1000);
  }
  const exponential = OPENALEX_RETRY_BASE_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 750);
  return Math.min(120_000, exponential + jitter);
}

// Reconstruct plain text from OpenAlex's abstract_inverted_index.
// The index maps { word: [positions...] }; we invert it into an ordered array.
function abstractFromInvertedIndex(
  idx: Record<string, number[]> | null | undefined
): string {
  if (!idx) return "";
  const slots: string[] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const p of positions) slots[p] = word;
  }
  return slots.filter(Boolean).join(" ");
}

// Some publishers wrap tags like <jats:italic>...</jats:italic> in titles or
// abstracts. Strip them so DocuPeer displays clean prose.
function stripXmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

async function readCheckpoint(): Promise<string | null> {
  if (!RESUME) return null;
  try {
    const raw = await readFile(CHECKPOINT_PATH, "utf8");
    const parsed = JSON.parse(raw) as { cursor?: unknown };
    return typeof parsed.cursor === "string" && parsed.cursor ? parsed.cursor : null;
  } catch {
    return null;
  }
}

async function saveCheckpoint(input: {
  cursor: string;
  inserted: number;
  skipped: number;
  pages: number;
}) {
  await mkdir(path.dirname(CHECKPOINT_PATH), { recursive: true });
  await writeFile(
    CHECKPOINT_PATH,
    JSON.stringify({ ...input, updatedAt: new Date().toISOString() }, null, 2),
  );
}

type OpenAlexWork = {
  id: string;
  title: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
  primary_topic: {
    display_name: string;
    field: { display_name: string };
    subfield?: { display_name: string };
  } | null;
  publication_year: number | null;
  open_access?: { license?: string | null };
};

type OpenAlexPage = {
  meta: { count: number; next_cursor: string | null };
  results: OpenAlexWork[];
};

async function fetchPage(cursor: string): Promise<OpenAlexPage> {
  // `locations.license` looks across every OA copy of a work, not just the
  // "best" one; combined with is_oa:true it gives us the widest CC0/CC-BY pool.
  const params = new URLSearchParams({
    filter: [
      `locations.license:${LICENSES}`,
      "is_oa:true",
      "has_abstract:true",
      "language:en",
    ].join(","),
    per_page: String(Math.min(200, Math.max(25, OPENALEX_PER_PAGE))),
    cursor,
    mailto: MAILTO,
    select:
      "id,title,abstract_inverted_index,primary_topic,publication_year,open_access",
  });
  const url = `https://api.openalex.org/works?${params.toString()}`;
  if (cursor === "*") console.log("Query URL:", url);

  for (let attempt = 0; attempt <= OPENALEX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": `DocuPeer-Seeder (mailto:${MAILTO})` },
    }).catch((err) => err as Error);

    if (response instanceof Error) {
      if (attempt === OPENALEX_RETRIES) throw response;
      const waitMs = retryDelayMs(null, attempt);
      console.warn(
        `OpenAlex request failed (${response.message}); retrying in ${Math.round(
          waitMs / 1000
        )}s...`
      );
      await sleep(waitMs);
      continue;
    }

    if (response.ok) {
      const page = (await response.json()) as OpenAlexPage;
      if (cursor === "*") {
        console.log(
          `OpenAlex reports ${page.meta.count.toLocaleString()} works matching this filter.`
        );
      }
      return page;
    }

    const body = await response.text();
    const message = `OpenAlex responded ${response.status} ${response.statusText}: ${body}`;
    if (!RETRYABLE_STATUS.has(response.status) || attempt === OPENALEX_RETRIES) {
      throw new Error(message);
    }

    const waitMs = retryDelayMs(response.headers.get("retry-after"), attempt);
    console.warn(
      `${message}\nRetrying in ${Math.round(waitMs / 1000)}s...`
    );
    await sleep(waitMs);
  }

  throw new Error("OpenAlex request failed after retries.");
}

async function ensureAnonymousAuthor(): Promise<string> {
  const email = "anonymous@docupeer.org";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const passwordHash = await bcrypt.hash(
    "docupeer-seed-" + Math.random().toString(36).slice(2),
    10
  );
  const u = await prisma.user.create({
    data: {
      name: "Anonymous",
      email,
      passwordHash,
      expertiseCategory: "Literature & Writing",
      specialty: "General",
      educationLevel: "researcher",
      strength: 50,
    },
  });
  console.log(`Created anonymous author user: ${u.id}`);
  return u.id;
}

async function main() {
  console.log(
    `Seeding from OpenAlex with licenses "${LICENSES}" and min ${MIN_WORDS} words...`
  );

  if (WIPE) {
    console.log("WIPE_PAPERS=1 -> deleting existing annotations, reviews, papers");
    await prisma.annotation.deleteMany();
    await prisma.review.deleteMany();
    await prisma.paper.deleteMany();
  }

  const authorId = await ensureAnonymousAuthor();

  const already = await prisma.paper.count({ where: { authorId } });
  console.log(`Anonymous author currently owns ${already} papers.`);
  const targetToInsert = TARGET_TOTAL ? Math.max(0, TARGET - already) : TARGET;
  if (TARGET_TOTAL) {
    console.log(
      `Target total mode: inserting up to ${targetToInsert} more papers to reach ${TARGET}.`
    );
  } else {
    console.log(`Insert-run mode: inserting up to ${targetToInsert} papers.`);
  }
  if (targetToInsert === 0) {
    console.log("Target already reached; nothing to insert.");
    await prisma.$disconnect();
    return;
  }

  const existingTitles = new Set<string>();
  const existing = await prisma.paper.findMany({
    where: { authorId },
    select: { title: true },
  });
  for (const paper of existing) existingTitles.add(titleKey(paper.title));

  let cursor = (await readCheckpoint()) ?? "*";
  if (cursor !== "*") {
    console.log(`Resuming from checkpoint: ${CHECKPOINT_PATH}`);
  }
  let inserted = 0;
  let skipped = 0;
  let pages = 0;

  while (inserted < targetToInsert) {
    pages++;
    const page = await fetchPage(cursor);
    if (!page.results.length) {
      console.log("OpenAlex returned an empty page; stopping.");
      break;
    }

    // Batch-build the rows we want to insert.
    const batch: {
      title: string;
      text: string;
      category: string;
      specialty: string;
      educationLevel: string;
      paperType: string;
      wordCount: number;
    }[] = [];

    for (const w of page.results) {
      if (inserted + batch.length >= targetToInsert) break;

      const rawTitle = w.title ?? "";
      const rawAbstract = abstractFromInvertedIndex(w.abstract_inverted_index);
      const title = stripXmlTags(rawTitle);
      const text = stripXmlTags(rawAbstract);

      if (!title || !text) {
        skipped++;
        continue;
      }
      const wc = words(text);
      if (wc < MIN_WORDS) {
        skipped++;
        continue;
      }
      const key = titleKey(title);
      if (existingTitles.has(key)) {
        skipped++;
        continue;
      }
      if (!w.primary_topic) {
        skipped++;
        continue;
      }
      const fieldName = w.primary_topic.field.display_name;
      const category = CATEGORY_MAP[fieldName];
      if (!category) {
        skipped++;
        continue;
      }
      const specialty =
        w.primary_topic.subfield?.display_name ?? w.primary_topic.display_name;

      batch.push({
        title: title.slice(0, 250),
        text,
        category,
        specialty: specialty.slice(0, 120),
        educationLevel: guessEducationLevel(w.primary_topic.display_name),
        paperType: guessPaperType(w.primary_topic.display_name),
        wordCount: wc,
      });
      existingTitles.add(key);
    }

    if (batch.length) {
      await prisma.$transaction(
        batch.map((row) =>
          prisma.paper.create({
            data: {
              authorId,
              title: row.title,
              text: row.text,
              category: row.category,
              specialty: row.specialty,
              educationLevel: row.educationLevel,
              paperType: row.paperType,
              feedbackWanted: null,
              wordCount: row.wordCount,
            },
          })
        )
      );
      inserted += batch.length;
      console.log(
        `Page ${pages}: +${batch.length}, total ${inserted}/${targetToInsert} (${skipped} skipped so far).`
      );
    } else {
      console.log(`Page ${pages}: 0 usable, ${skipped} skipped so far.`);
    }

    if (!page.meta.next_cursor) {
      console.log("OpenAlex cursor exhausted.");
      break;
    }
    cursor = page.meta.next_cursor;
    await saveCheckpoint({ cursor, inserted, skipped, pages });

    // Be polite: brief pause between pages.
    await sleep(OPENALEX_SLEEP_MS);
  }

  console.log(
    `Done. Inserted ${inserted} papers, skipped ${skipped} candidates across ${pages} pages.`
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
