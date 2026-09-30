import { useState } from "react";
import { ApiError } from "../api/client";
import { adminCreateTerm, adminDeleteTerm, adminListTerms, adminReorderTerms, adminUpdateTerm } from "../api/endpoints";
import type { AdminTerm, TermKind } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { Input, Textarea } from "../components/Field";
import { Switch } from "../components/Switch";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";

const COPY: Record<TermKind, { tab: string; noun: string; intro: string; example: string }> = {
  SECTION: { tab: "Sections", noun: "section", intro: "The lines your socks are grouped into in the shop, for example Classic, Casual or Sport.", example: "e.g. Premium Gold Line" },
  CUT: { tab: "Cuts", noun: "cut", intro: "How tall the sock is, for example Ankle, Crew or Mid-long.", example: "e.g. Mid-long" },
};

type Editing = { term: AdminTerm | null } | null;

export function AdminTerms() {
  const toast = useToast();
  const [kind, setKind] = useState<TermKind>("SECTION");
  const list = useAsync(() => adminListTerms(kind), [kind]);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AdminTerm | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = COPY[kind];
  const terms = list.data ?? [];

  const fail = (e: unknown) => setError(e instanceof ApiError ? (e.fieldErrors.name ?? e.message) : "Something went wrong. Please try again.");
  function open(term: AdminTerm | null) { setEditing({ term }); setName(term?.name ?? ""); setDescription(term?.description ?? ""); setError(null); }

  async function saveTerm() {
    setBusy(true); setError(null);
    try {
      if (editing?.term) await adminUpdateTerm(editing.term.id, { name: name.trim(), description: description.trim() || null, active: editing.term.active });
      else await adminCreateTerm(kind, name.trim(), description.trim() || null);
      toast(editing?.term ? "Saved" : `${c.noun[0].toUpperCase()}${c.noun.slice(1)} added`);
      setEditing(null); list.reload();
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function setActive(t: AdminTerm, active: boolean) {
    try { await adminUpdateTerm(t.id, { name: t.name, description: t.description, active }); toast(active ? "Shown in the shop" : "Hidden from the shop"); list.reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Could not save", "danger"); }
  }
  async function move(index: number, by: -1 | 1) {
    const ids = terms.map((t) => t.id); const [id] = ids.splice(index, 1); ids.splice(index + by, 0, id);
    try { await adminReorderTerms(kind, ids); list.reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not reorder", "danger"); }
  }
  async function remove() {
    if (!deleting) return;
    try { await adminDeleteTerm(deleting.id); toast(`"${deleting.name}" deleted`); list.reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Could not delete", "danger"); }
    setDeleting(null);
  }

  return (
    <>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">Catalog</span><h1>Sections and cuts</h1></div>
        <Button onClick={() => open(null)}>Add a {c.noun}</Button>
      </header>
      <div className="av-tabs av-tabs--inline" role="group" aria-label="Kind">
        {(Object.keys(COPY) as TermKind[]).map((k) => <button key={k} type="button" className="av-tabbtn" aria-pressed={kind === k} onClick={() => setKind(k)}>{COPY[k].tab}</button>)}
      </div>
      <p className="av-lead">{c.intro} Order them the way you want them shown. Hide one to keep its products but remove it from the shop's filters.</p>

      {list.loading && !list.data && <div className="av-stack">{[0, 1, 2].map((i) => <Skeleton key={i} height={64} />)}</div>}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && terms.length === 0 && <div className="av-empty"><h2>No {c.noun}s yet</h2><Button onClick={() => open(null)}>Add the first {c.noun}</Button></div>}
      {terms.length > 0 && (
        <ol className="av-termlist">
          {terms.map((t, i) => (
            <li key={t.id} className="av-term">
              <div className="av-term__main">
                <strong>{t.name}</strong>{!t.active && <> <Badge tone="danger">Hidden</Badge></>}
                {t.description && <span className="av-small av-muted"> {t.description}</span>}
                <span className="av-small av-muted"> {t.productCount} {t.productCount === 1 ? "product" : "products"}</span>
              </div>
              <div className="av-row">
                <Switch checked={t.active} onChange={(a) => void setActive(t, a)} label={`Show ${t.name} in the shop`} />
                <Button size="sm" variant="ghost" disabled={i === 0} aria-label={`Move ${t.name} up`} onClick={() => void move(i, -1)}>↑</Button>
                <Button size="sm" variant="ghost" disabled={i === terms.length - 1} aria-label={`Move ${t.name} down`} onClick={() => void move(i, 1)}>↓</Button>
                <Button size="sm" variant="secondary" aria-label={`Edit ${t.name}`} onClick={() => open(t)}>Edit</Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>Delete</Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={!!editing} title={editing?.term ? `Edit ${editing.term.name}` : `Add a ${c.noun}`} onClose={() => setEditing(null)}
              actions={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={busy} disabled={!name.trim()} onClick={saveTerm}>{editing?.term ? "Save" : `Add ${c.noun}`}</Button></>}>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Name" value={name} placeholder={c.example} autoFocus onChange={(e) => setName(e.target.value)} />
        <Textarea label="Short description (optional)" value={description} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </Dialog>

      <Dialog open={!!deleting} title={`Delete ${deleting?.name ?? ""}?`} onClose={() => setDeleting(null)}
              actions={<><Button variant="ghost" onClick={() => setDeleting(null)}>Keep it</Button>
                {deleting && deleting.productCount === 0 && <Button onClick={remove}>Delete</Button>}</>}>
        {deleting && deleting.productCount > 0
          ? <p>{deleting.productCount} {deleting.productCount === 1 ? "product uses" : "products use"} "{deleting.name}". Move {deleting.productCount === 1 ? "it" : "them"} to another {c.noun} first, or hide "{deleting.name}" instead so its products keep it.</p>
          : <p>"{deleting?.name}" is not used by any product, so nothing else changes. This cannot be undone.</p>}
      </Dialog>
    </>
  );
}
