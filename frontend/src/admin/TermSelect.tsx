import { useId, useState } from "react";
import { ApiError } from "../api/client";
import type { AdminTerm, TermKind } from "../api/types";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { Input } from "../components/Field";

interface Props {
  label: string;
  kind: TermKind;
  terms: AdminTerm[];
  value: string | null;
  disabled?: boolean;
  hint?: string;
  onChange: (id: string | null) => void;
  /** Creates the section or cut on the server and returns it, so it can be selected straight away. */
  onCreate: (kind: TermKind, name: string) => Promise<AdminTerm>;
}

const NEW = "__new__";

/** A dropdown of the owners' own sections or cuts, with "Add new" right inside it: no detour to another page. */
export function TermSelect({ label, kind, terms, value, disabled, hint, onChange, onCreate }: Props) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const noun = kind === "SECTION" ? "section" : "cut";
  const visible = terms.filter((t) => t.active || t.id === value);

  async function create() {
    setBusy(true); setError(null);
    try {
      const term = await onCreate(kind, name.trim());
      onChange(term.id);
      setAdding(false); setName("");
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldErrors.name ?? e.message) : "Could not add it. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="av-field">
        <label className="av-label" htmlFor={id}>{label}</label>
        <select id={id} className="av-select" disabled={disabled} value={value ?? ""} aria-describedby={hint ? `${id}-hint` : undefined}
                onChange={(e) => e.target.value === NEW ? setAdding(true) : onChange(e.target.value || null)}>
          <option value="">None</option>
          {visible.map((t) => <option key={t.id} value={t.id}>{t.name}{t.active ? "" : " (hidden)"}</option>)}
          <option value={NEW}>+ Add a new {noun}…</option>
        </select>
        {hint && <span className="av-hint" id={`${id}-hint`}>{hint}</span>}
      </div>
      <Dialog open={adding} title={`Add a ${noun}`} onClose={() => { setAdding(false); setError(null); }}
              actions={<><Button variant="ghost" onClick={() => { setAdding(false); setError(null); }}>Cancel</Button>
                <Button loading={busy} disabled={!name.trim()} onClick={create}>Add {noun}</Button></>}>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Name" value={name} autoFocus placeholder={kind === "SECTION" ? "e.g. Premium Gold Line" : "e.g. Mid-long"}
               onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { e.preventDefault(); void create(); } }} />
        <p className="av-small">It appears in the shop's filters as soon as a product uses it. You can rename, hide or reorder it later under Sections and cuts.</p>
      </Dialog>
    </>
  );
}
