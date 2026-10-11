import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps { open: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode; className?: string; hideTitle?: boolean }

/**
 * A modal built on the browser's native <dialog>: focus is trapped inside, Escape closes it, and the page behind
 * is inert. No custom focus-trap code to get wrong.
 */
export function Dialog({ open, title, onClose, children, actions, className, hideTitle }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal?.();
    if (!open && el.open) el.close?.();
  }, [open]);
  return (
    <dialog ref={ref} className={`av-dialog${className ? ` ${className}` : ""}`} aria-labelledby="dialog-title" onClose={onClose} onCancel={onClose}>
      {open && (
        <form method="dialog" onSubmit={(e) => e.preventDefault()}>
          <h2 id="dialog-title" className={hideTitle ? "av-visually-hidden" : "av-dialog__title"}>{title}</h2>
          <div className="av-dialog__body">{children}</div>
          {actions && <div className="av-dialog__actions">{actions}</div>}
        </form>
      )}
    </dialog>
  );
}
