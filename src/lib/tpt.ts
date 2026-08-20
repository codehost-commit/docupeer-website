import "server-only";
import { prisma } from "@/lib/db";
import { sanitizeLine, sanitizeText } from "@/lib/sanitize";
import {
  TPT_CATEGORIES,
  type TptAdminItem,
  type TptCategory,
  type TptPublicItem,
  type TptPublicPayload,
  type TptStatus,
} from "@/lib/tpt-shared";

type ValidationResult =
  | {
      ok: true;
      value: {
        rating: number;
        title: string | null;
        body: string;
        displayName: string | null;
        isAnonymous: boolean;
        consentToPublish: boolean;
        suggestedCategory: TptCategory;
      };
    }
  | { ok: false; errors: Record<string, string> };

const DEFAULT_CATEGORY: TptCategory = "love";
const MAX_PUBLIC_ITEMS = 200;
const MAX_ADMIN_ITEMS = 300;

function isCategory(value: unknown): value is TptCategory {
  return TPT_CATEGORIES.includes(value as TptCategory);
}

export function normalizeTptCategory(
  value: unknown,
  fallback: TptCategory = DEFAULT_CATEGORY,
): TptCategory {
  return isCategory(value) ? value : fallback;
}

function iso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function publicName(item: { isAnonymous: boolean; displayName: string | null }) {
  if (item.isAnonymous) return "Anonymous";
  return item.displayName || "Anonymous";
}

function toPublicItem(item: {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  displayName: string | null;
  isAnonymous: boolean;
  category: string | null;
  suggestedCategory: string | null;
  featured: boolean;
  approvedAt: Date | null;
  createdAt: Date;
}): TptPublicItem {
  return {
    id: item.id,
    rating: item.rating,
    title: item.title,
    body: item.body,
    publicName: publicName(item),
    category: normalizeTptCategory(item.category ?? item.suggestedCategory),
    featured: item.featured,
    approvedAt: iso(item.approvedAt),
    createdAt: item.createdAt.toISOString(),
  };
}

function toAdminItem(item: Parameters<typeof toPublicItem>[0] & {
  status: string;
  userId: string | null;
  consentToPublish: boolean;
  updatedAt: Date;
}): TptAdminItem {
  return {
    ...toPublicItem(item),
    status: item.status === "approved" ? "approved" : "pending",
    suggestedCategory: isCategory(item.suggestedCategory) ? item.suggestedCategory : null,
    displayName: item.displayName,
    isAnonymous: item.isAnonymous,
    consentToPublish: item.consentToPublish,
    userId: item.userId,
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function validateTalkSubmission(input: unknown): ValidationResult {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const errors: Record<string, string> = {};
  const rating = Math.floor(Number(body.rating));
  const title = sanitizeLine(body.title, 120);
  const text = sanitizeText(body.body, 1_200).trim();
  const isAnonymous = body.isAnonymous !== false;
  const displayName = sanitizeLine(body.displayName, 80);
  const consentToPublish = body.consentToPublish === true;
  const suggestedCategory = normalizeTptCategory(body.suggestedCategory, "open-notes");

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    errors.rating = "Choose a rating from 1 to 5.";
  }
  if (text.length < 20) {
    errors.body = "Write at least 20 characters.";
  }
  if (!isAnonymous && displayName.length < 2) {
    errors.displayName = "Add a name or choose anonymous.";
  }
  if (!consentToPublish) {
    errors.consentToPublish = "Confirm this can be reviewed for publication.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      rating,
      title: title || null,
      body: text,
      displayName: isAnonymous ? null : displayName,
      isAnonymous,
      consentToPublish,
      suggestedCategory,
    },
  };
}

export async function createTalkSubmission(input: unknown, userId?: string | null) {
  const result = validateTalkSubmission(input);
  if (!result.ok) return result;

  const submission = await prisma.talkSubmission.create({
    data: {
      ...result.value,
      userId: userId ?? null,
    },
    select: { id: true, status: true, createdAt: true },
  });

  return {
    ok: true as const,
    submission: {
      id: submission.id,
      status: submission.status as TptStatus,
      createdAt: submission.createdAt.toISOString(),
    },
  };
}

export async function getPublicTalk(): Promise<TptPublicPayload> {
  const items = await prisma.talkSubmission.findMany({
    where: {
      status: "approved",
      consentToPublish: true,
    },
    orderBy: [
      { featured: "desc" },
      { approvedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: MAX_PUBLIC_ITEMS,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      displayName: true,
      isAnonymous: true,
      category: true,
      suggestedCategory: true,
      featured: true,
      approvedAt: true,
      createdAt: true,
    },
  });

  const publicItems = items.map(toPublicItem);
  const counts = {
    love: 0,
    improve: 0,
    "open-notes": 0,
    total: publicItems.length,
  };

  for (const item of publicItems) counts[item.category] += 1;

  return { items: publicItems, counts };
}

export async function getAdminTalk(status?: string) {
  const normalizedStatus = status === "approved" || status === "pending" ? status : undefined;
  const items = await prisma.talkSubmission.findMany({
    where: normalizedStatus ? { status: normalizedStatus } : {},
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
    take: MAX_ADMIN_ITEMS,
    select: {
      id: true,
      userId: true,
      rating: true,
      title: true,
      body: true,
      displayName: true,
      isAnonymous: true,
      consentToPublish: true,
      suggestedCategory: true,
      category: true,
      status: true,
      featured: true,
      approvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return items.map(toAdminItem);
}

export async function approveTalkSubmission(
  id: string,
  categoryInput?: unknown,
  featuredInput?: unknown,
) {
  const existing = await prisma.talkSubmission.findUnique({
    where: { id },
    select: { id: true, suggestedCategory: true },
  });
  if (!existing) return null;

  const item = await prisma.talkSubmission.update({
    where: { id },
    data: {
      status: "approved",
      category: normalizeTptCategory(categoryInput, normalizeTptCategory(existing.suggestedCategory)),
      featured: featuredInput === true,
      approvedAt: new Date(),
    },
    select: {
      id: true,
      userId: true,
      rating: true,
      title: true,
      body: true,
      displayName: true,
      isAnonymous: true,
      consentToPublish: true,
      suggestedCategory: true,
      category: true,
      status: true,
      featured: true,
      approvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return toAdminItem(item);
}

export async function setTalkSubmissionFeatured(id: string, featured: boolean) {
  const existing = await prisma.talkSubmission.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;

  const item = await prisma.talkSubmission.update({
    where: { id },
    data: { featured },
    select: {
      id: true,
      userId: true,
      rating: true,
      title: true,
      body: true,
      displayName: true,
      isAnonymous: true,
      consentToPublish: true,
      suggestedCategory: true,
      category: true,
      status: true,
      featured: true,
      approvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return toAdminItem(item);
}

export async function deleteTalkSubmission(id: string) {
  await prisma.talkSubmission.deleteMany({ where: { id } });
}
