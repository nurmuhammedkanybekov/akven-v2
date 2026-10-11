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
import { useT } from "../i18n/I18n";

const KINDS: TermKind[] = ["SECTION", "CUT"];

type Editing = { term: AdminTerm | null } | null;

export function AdminTerms() {
  const toast = useToast();
  const { t } = useT();
  const [kind, setKind] = useState<TermKind>("SECTION");
  const list = useAsync(() => adminListTerms(kind), [kind]);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AdminTerm | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const terms = list.data ?? [];

  const fail = (e: unknown) => setError(e instanceof ApiError ? (e.fieldErrors.name ?? e.message) : t("a.err.generic"));
  function open(term: AdminTerm | null) { setEditing({ term }); setName(term?.name ?? ""); setDescription(term?.description ?? ""); setError(null); }

  async function saveTerm() {
    setBusy(true); setError(null);
    try {
      if (editing?.term) await adminUpdateTerm(editing.term.id, { name: name.trim(), description: description.trim() || null, active: editing.term.active });
      else await adminCreateTerm(kind, name.trim(), description.trim() || null);
      toast(editing?.term ? t("a.saved") : t("a.added"));
      setEditing(null); list.reload();
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function setActive(term: AdminTerm, active: boolean) {
    try { await adminUpdateTerm(term.id, { name: term.name, description: term.description, active }); toast(active ? t("a.shownInShop") : t("a.hiddenFromShop")); list.reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : t("a.err.save"), "danger"); }
  }
  async function move(index: number, by: -1 | 1) {
    const ids = terms.map((t) => t.id); const [id] = ids.splice(index, 1); ids.splice(index + by, 0, id);
    try { await adminReorderTerms(kind, ids); list.reload(); } catch (e) { toast(e instanceof ApiError ? e.message : t("a.err.generic"), "danger"); }
  }
  async function remove() {
    if (!deleting) return;
    try { await adminDeleteTerm(deleting.id); toast(t("a.term.deleted", { name: deleting.name })); list.reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : t("a.err.generic"), "danger"); }
    setDeleting(null);
  }

  return (
    <>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">{t("a.catalog")}</span><h1>{t("a.nav.sections")}</h1></div>
        <Button onClick={() => open(null)}>{t(`a.term.add.${kind}`)}</Button>
      </header>
      <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.kind")}>
        {KINDS.map((k) => <button key={k} type="button" className="av-tabbtn" aria-pressed={kind === k} onClick={() => setKind(k)}>{t(`a.term.tab.${k}`)}</button>)}
      </div>
      <p className="av-lead">{t(`a.term.intro.${kind}`)} {t("a.term.introMore")}</p>

      {list.loading && !list.data && <div className="av-stack">{[0, 1, 2].map((i) => <Skeleton key={i} height={64} />)}</div>}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && terms.length === 0 && <div className="av-empty"><h2>{t(`a.term.none.${kind}`)}</h2><Button onClick={() => open(null)}>{t(`a.term.add.${kind}`)}</Button></div>}
      {terms.length > 0 && (
        <ol className="av-termlist">
          {terms.map((x, i) => (
            <li key={x.id} className="av-term">
              <div className="av-term__main">
                <strong>{x.name}</strong>{!x.active && <> <Badge tone="danger">{t("a.hidden")}</Badge></>}
                {x.description && <span className="av-small av-muted"> {x.description}</span>}
                <span className="av-small av-muted"> {t("a.term.productCount", { n: x.productCount })}</span>
              </div>
              <div className="av-row">
                <Switch checked={x.active} onChange={(a) => void setActive(x, a)} label={t("a.term.showIn", { name: x.name })} />
                <Button size="sm" variant="ghost" disabled={i === 0} aria-label={t("a.term.up", { name: x.name })} onClick={() => void move(i, -1)}>↑</Button>
                <Button size="sm" variant="ghost" disabled={i === terms.length - 1} aria-label={t("a.term.down", { name: x.name })} onClick={() => void move(i, 1)}>↓</Button>
                <Button size="sm" variant="secondary" aria-label={t("a.term.editN", { name: x.name })} onClick={() => open(x)}>{t("a.edit")}</Button>
                <Button size="sm" variant="ghost" aria-label={t("a.term.deleteN", { name: x.name })} onClick={() => setDeleting(x)}>{t("a.delete")}</Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={!!editing} title={editing?.term ? t("a.term.editN", { name: editing.term.name }) : t(`a.term.add.${kind}`)} onClose={() => setEditing(null)}
              actions={<><Button variant="ghost" onClick={() => setEditing(null)}>{t("a.cancel")}</Button><Button loading={busy} disabled={!name.trim()} onClick={saveTerm}>{editing?.term ? t("a.save") : t(`a.term.addBtn.${kind}`)}</Button></>}>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label={t("a.name")} value={name} placeholder={t(`a.term.eg.${kind}`)} autoFocus onChange={(e) => setName(e.target.value)} />
        <Textarea label={t("a.term.description")} value={description} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </Dialog>

      <Dialog open={!!deleting} title={t("a.term.deleteQ", { name: deleting?.name ?? "" })} onClose={() => setDeleting(null)}
              actions={<><Button variant="ghost" onClick={() => setDeleting(null)}>{t("a.keep")}</Button>
                {deleting && deleting.productCount === 0 && <Button onClick={remove}>{t("a.delete")}</Button>}</>}>
        {deleting && deleting.productCount > 0
          ? <p>{deleting.productCount === 1 ? t("a.term.inUseOne", { name: deleting.name }) : t("a.term.inUse", { n: deleting.productCount, name: deleting.name })}</p>
          : <p>{t("a.term.unused", { name: deleting?.name ?? "" })}</p>}
      </Dialog>
    </>
  );
}
