"use client";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  secondaryLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onSecondary?: () => void;
};

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  secondaryLabel,
  onConfirm,
  onCancel,
  onSecondary,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-deep-text/40 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-deep-text">{title}</h2>
        <div className="mt-2 text-sm text-deep-dim">{body}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button className="btn-secondary" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
