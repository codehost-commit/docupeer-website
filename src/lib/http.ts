import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400, extra?: object) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// Wrap a route handler so thrown errors with a `status` become clean JSON
// responses (used by requireUser()).
export function handleRouteError(err: unknown) {
  const status =
    typeof (err as { status?: number })?.status === "number"
      ? (err as { status: number }).status
      : 500;
  const message =
    status === 401
      ? "You must be signed in."
      : status === 500
        ? "Something went wrong."
        : (err as Error)?.message || "Request failed.";
  if (status === 500) console.error(err);
  return error(message, status);
}
