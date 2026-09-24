"use client";

import { ReactNode, useEffect, useState } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ---- Buttons ----
type BtnVariant = "primary" | "soft" | "ghost" | "outline" | "danger";
export function Btn({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-deep-accent text-white hover:bg-deep-accent-strong",
    soft: "bg-deep-accent-soft text-deep-accent hover:bg-brand-200",
    ghost: "text-deep-text-soft hover:bg-deep-panel2",
    outline: "border border-deep-border-strong text-deep-text hover:bg-deep-panel2",
    danger: "bg-deep-bad text-white hover:opacity-90",
  };
  return (
    <button type={type} className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

// ---- Card ----
export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "rounded-2xl border border-deep-border bg-deep-panel shadow-panel",
        onClick && "cursor-pointer hover:border-deep-border-strong transition-colors",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---- Modal ----
export function Modal({
  title,
  children,
  onClose,
  footer,
  size = "md",
}: {
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size];
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain">
      <div className="fixed inset-0 bg-deep-text/35 backdrop-blur-xl" onClick={onClose} aria-hidden="true" />
      <div className="relative flex min-h-full items-start justify-center p-4 sm:p-8">
        <div
          className={cx("relative w-full rounded-2xl border border-deep-border bg-deep-panel shadow-glow", width, "animate-fadeUp")}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-deep-border px-5 py-4">
            <h3 className="font-display text-lg text-deep-text">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-1 text-deep-dim hover:bg-deep-panel2" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-deep-border px-5 py-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

// ---- Form fields ----
export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <div className="mb-1 text-xs font-medium uppercase tracking-wide text-deep-dim">{label}</div>}
      {children}
      {hint && <div className="mt-1 text-xs text-deep-dim">{hint}</div>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-deep-border bg-deep-bg px-3 py-2 text-sm text-deep-text outline-none focus:border-deep-accent focus:ring-2 focus:ring-deep-accent-soft placeholder:text-deep-dim";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "min-h-[80px] resize-y", props.className)} />;
}
export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, "cursor-pointer", className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
      role="switch"
      aria-checked={checked}
    >
      <span
        className={cx(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-deep-accent" : "bg-deep-border-strong",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
      {label && <span className="text-sm text-deep-text-soft">{label}</span>}
    </button>
  );
}

export function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-deep-border bg-deep-panel2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-deep-panel text-deep-accent shadow-sm" : "text-deep-dim hover:text-deep-text-soft",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={color ? { backgroundColor: `${color}1a`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Empty({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep-border bg-deep-panel/50 px-6 py-12 text-center">
      <div className="mb-1 font-display text-lg text-deep-text">{title}</div>
      {subtitle && <div className="mb-4 max-w-sm text-sm text-deep-dim">{subtitle}</div>}
      {action}
    </div>
  );
}

// Danger-zone confirmation: user must type their exact name to proceed.
export function ConfirmNameModal({
  name,
  action,
  description,
  onConfirm,
  onClose,
}: {
  name: string;
  action: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const displayName = name.trim().toUpperCase();
  const matches = value.trim().toUpperCase() === displayName;
  return (
    <Modal
      title={action}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            disabled={!matches || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner className="h-4 w-4" /> : action}
          </Btn>
        </>
      }
    >
      {description && <p className="mb-3 text-sm text-deep-text-soft">{description}</p>}
      <p className="mb-2 text-sm text-deep-text-soft">
        Type <span className="font-semibold text-deep-text">{displayName}</span> to continue.
      </p>
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder={`Enter "${displayName}" to continue`}
      />
    </Modal>
  );
}

// ---- shared formatting ----
export function fmtPct(p: number | null): string {
  return p === null ? "-" : `${p.toFixed(1)}%`;
}
export function letterColor(letter: string | null): string {
  if (!letter) return "#6a7495";
  const c = letter[0];
  if (c === "A") return "#4f8a5f";
  if (c === "B") return "#356d97";
  if (c === "C") return "#a87717";
  return "#b3455e";
}
export const CATEGORY_COLOR: Record<string, string> = {
  academic: "#356d97",
  ec: "#7c5cbf",
  personal: "#4f8a5f",
  other: "#6a7495",
};
export function priorityColor(p: string): string {
  return p === "high" ? "#b3455e" : p === "medium" ? "#a87717" : "#6a7495";
}
