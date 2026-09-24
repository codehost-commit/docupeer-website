// Local <-> ISO helpers for date/time inputs.
export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
export function toTimeInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(11, 16);
}
// Combine local date (YYYY-MM-DD) + optional time (HH:mm) into an ISO string.
export function combineDateTime(dateStr: string, timeStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T${timeStr && timeStr.length ? timeStr : "23:59"}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
