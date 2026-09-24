import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Signed-in user's id, or null. Routes: `const uid = await getUserId(); if (!uid) return unauthorized();`
export async function getUserId(): Promise<string | null> {
  const u = await getCurrentUser();
  return u?.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}
export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data as Record<string, unknown>, init);
}
export function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}
export function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  return (await req.json().catch(() => ({}))) as T;
}

// Coercion helpers used across the CRUD routes.
export function str(v: unknown, max = 4000): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s.slice(0, max) : null;
}
export function reqStr(v: unknown, max = 4000): string {
  return String(v ?? "").trim().slice(0, max);
}
export function num(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
export function bool(v: unknown, fallback = false): boolean {
  if (v === undefined || v === null) return fallback;
  return v === true || v === "true" || v === 1;
}
export function dt(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}
export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = String(v) as T;
  return (allowed as readonly string[]).includes(s) ? s : fallback;
}
export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
