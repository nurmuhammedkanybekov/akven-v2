import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldShellProps { label: string; hint?: string; error?: string }

/** Wires label, hint and error to the control with the right ids and ARIA, so every form gets it right. */
function useFieldIds(hint?: string, error?: string) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return { id, describedBy };
}

function Shell({ id, label, hint, error, children }: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className="av-field">
      <label className="av-label" htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="av-hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="av-error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  );
}

export function Input({ label, hint, error, ...props }: FieldShellProps & InputHTMLAttributes<HTMLInputElement>) {
  const { id, describedBy } = useFieldIds(hint, error);
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <input id={id} className="av-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
    </Shell>
  );
}

export function Select({ label, hint, error, children, ...props }: FieldShellProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const { id, describedBy } = useFieldIds(hint, error);
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <select id={id} className="av-select" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props}>
        {children}
      </select>
    </Shell>
  );
}

export function Textarea({ label, hint, error, ...props }: FieldShellProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { id, describedBy } = useFieldIds(hint, error);
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <textarea id={id} className="av-input av-textarea" rows={3} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
    </Shell>
  );
}
