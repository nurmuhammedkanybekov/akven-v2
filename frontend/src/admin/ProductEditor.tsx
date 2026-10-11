import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  adminCreateProduct, adminCreateTerm, adminGetProduct, adminListTerms, adminProductAudit,
  adminRestoreProduct, adminRetireProduct, adminUpdateProduct,
} from "../api/endpoints";
import type { AdminProduct, AdminTerm, AuditEntry, ProductInput, TermKind } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { createVariantWithUniqueSku } from "./createVariant";
import { actionLabel, draftToInput, emptyDraft, emptyProductInput, isBlankDraft, type VariantDraft } from "./helpers";
import { PhotoManager } from "./PhotoManager";
import { ProductForm } from "./ProductForm";
import { VariantCard } from "./VariantCard";
import { VariantFields } from "./VariantFields";
import { useT } from "../i18n/I18n";

const toInput = (p: AdminProduct): ProductInput => ({
  slug: p.slug, name: p.name, category: p.category, sectionId: p.section?.id ?? null, cutId: p.cut?.id ?? null,
  collection: p.collection, description: p.description, fabricComposition: p.fabricComposition, quality: p.quality, care: p.care, origin: p.origin,
});

/** One screen for adding a product and for editing it afterwards. */
export function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { t } = useT();

  const terms = useAsync(async () => {
    const [sections, cuts] = await Promise.all([adminListTerms("SECTION"), adminListTerms("CUT")]);
    return { sections, cuts };
  }, []);
  const loaded = useAsync(() => (id ? adminGetProduct(id) : Promise.resolve(null)), [id]);
  const [sections, setSections] = useState<AdminTerm[]>([]);
  const [cuts, setCuts] = useState<AdminTerm[]>([]);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  useEffect(() => { if (terms.data) { setSections(terms.data.sections); setCuts(terms.data.cuts); } }, [terms.data]);
  useEffect(() => { setProduct(loaded.data); }, [loaded.data]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftName, setDraftName] = useState("");
  const [drafts, setDrafts] = useState<VariantDraft[]>([emptyDraft()]);
  const [draftErrors, setDraftErrors] = useState<Array<Record<string, string>>>([]);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [history, setHistory] = useState<AuditEntry[] | null>(null);

  async function createTerm(kind: TermKind, name: string): Promise<AdminTerm> {
    const term = await adminCreateTerm(kind, name, null);
    (kind === "SECTION" ? setSections : setCuts)((list) => [...list, term]);
    toast(t("a.term.added", { kind: t(kind === "SECTION" ? "a.term.SECTION" : "a.term.CUT"), name: term.name }));
    return term;
  }
  function reportFailure(e: unknown) {
    if (e instanceof ApiError) { setError(e.message); setFieldErrors(e.fieldErrors); } else setError(t("a.err.generic"));
  }

  async function create(input: ProductInput) {
    setError(null); setFieldErrors({});
    const prepared = isAdmin ? drafts.filter((d) => !isBlankDraft(d)).map((d) => ({ d, r: draftToInput(d, input.name, t) })) : [];
    if (prepared.some((p) => Object.keys(p.r.errors).length)) {
      setDraftErrors(drafts.map((d) => (isBlankDraft(d) ? {} : draftToInput(d, input.name, t).errors)));
      setError(t("a.pe.fixDrafts"));
      return;
    }
    setBusy(true);
    let created: AdminProduct;
    try { created = await adminCreateProduct(input); } catch (e) { reportFailure(e); setBusy(false); return; }
    for (const { r } of prepared) {
      try { await createVariantWithUniqueSku(created.id, r.input!, r.autoSku ?? true); }
      catch (e) {
        toast(t("a.pe.partial", { name: r.input!.color ?? r.input!.sku, reason: e instanceof ApiError ? e.message : t("a.err.tryAgain") }), "danger");
        setBusy(false);
        navigate(`/admin/products/${created.id}`); return;
      }
    }
    toast(t("a.pe.added"));
    setBusy(false);   // this component instance is reused for the edit URL, so it must not stay busy
    navigate(`/admin/products/${created.id}#photos`);
  }

  async function save(input: ProductInput) {
    if (!product) return;
    setBusy(true); setError(null); setFieldErrors({});
    try {
      const { slug: _slug, ...body } = input;
      setProduct(await adminUpdateProduct(product.id, body));
      toast(t("a.saved"));
    } catch (e) { reportFailure(e); } finally { setBusy(false); }
  }

  async function retire() {
    if (!product) return;
    try { await adminRetireProduct(product.id); setProduct({ ...product, active: false }); toast(t("a.pe.removed")); }
    catch (e) { reportFailure(e); }
    setConfirmRetire(false);
  }
  async function restore() {
    if (!product) return;
    try { setProduct(await adminRestoreProduct(product.id)); toast(t("a.pe.restored")); } catch (e) { reportFailure(e); }
  }

  // ---- adding one more colour/size to an existing product ----
  const [draft, setDraft] = useState<VariantDraft>(emptyDraft());
  const [draftFieldErrors, setDraftFieldErrors] = useState<Record<string, string>>({});
  const [addBusy, setAddBusy] = useState(false);
  async function addVariant() {
    if (!product) return;
    const r = draftToInput(draft, product.name, t);
    setDraftFieldErrors(r.errors);
    if (!r.input) return;
    setAddBusy(true);
    try {
      const v = await createVariantWithUniqueSku(product.id, r.input, r.autoSku ?? true);
      setProduct({ ...product, variants: [...product.variants, v] });
      setDraft(emptyDraft()); toast(t("a.added"));
    } catch (e) { setError(e instanceof ApiError ? e.message : t("a.err.add")); if (e instanceof ApiError) setDraftFieldErrors(e.fieldErrors); }
    finally { setAddBusy(false); }
  }

  async function showHistory() { setHistory(await adminProductAudit(product!.id)); }

  if (terms.loading || (!isNew && loaded.loading && !product)) return <div className="av-stack"><Skeleton height={48} width="40%" /><Skeleton height={320} /></div>;
  if (!isNew && (loaded.error || !product)) return <Alert tone="danger">{loaded.error?.message ?? t("a.pe.notFound")} <Link to="/admin">{t("a.pe.back")}</Link></Alert>;

  return (
    <>
      <nav className="av-crumbs" aria-label={t("a.crumbs")}><Link to="/admin">{t("a.nav.products")}</Link><span aria-hidden="true">/</span><span>{isNew ? t("a.products.add") : product!.name}</span></nav>
      <header className="av-admin__head">
        <div>
          <span className="av-eyebrow">{isNew ? t("a.pe.new") : product!.slug}</span>
          <h1>{isNew ? t("a.products.add") : product!.name}</h1>
        </div>
        {!isNew && (
          <div className="av-row">
            {product!.active ? <Badge tone="success">{t("a.status.inShop")}</Badge> : <Badge tone="danger">{t("a.status.removed")}</Badge>}
            {product!.active && <Button variant="secondary" size="sm" href={`/products/${product!.slug}`} target="_blank" rel="noreferrer">{t("a.pe.view")}</Button>}
            {product!.active
              ? <Button variant="ghost" size="sm" onClick={() => setConfirmRetire(true)}>{t("a.pe.remove")}</Button>
              : <Button size="sm" onClick={restore}>{t("a.pe.restore")}</Button>}
          </div>
        )}
      </header>

      {error && <Alert tone="danger">{error}</Alert>}
      {!isNew && !product!.active && <Alert>{t("a.pe.hidden")}</Alert>}

      <ProductForm key={isNew ? "new" : `${product!.id}-${product!.version}`} initial={isNew ? emptyProductInput() : toInput(product!)}
                   sections={sections} cuts={cuts} createTerm={createTerm} fieldErrors={fieldErrors} busy={busy}
                   submitLabel={isNew ? t("a.pe.addProduct") : t("a.pe.saveDetails")} onSubmit={isNew ? create : save} onNameChange={setDraftName} />

      {isNew ? (
        <section className="av-card-form" aria-labelledby="colours-h">
          <h2 className="av-formtitle" id="colours-h">{t("a.products.options")}</h2>
          {isAdmin ? (
            <>
              <p className="av-small">{t("a.pe.optionsLead")}</p>
              {drafts.map((d, i) => (
                <div key={i} className="av-draft">
                  <VariantFields draft={d} errors={draftErrors[i] ?? {}} fallbackName={draftName || "AKV"}
                                 onChange={(n) => setDrafts((list) => list.map((x, j) => (j === i ? n : x)))} />
                  {drafts.length > 1 && <Button variant="ghost" size="sm" onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))}>{t("a.pe.removeOption")}</Button>}
                </div>
              ))}
              <div className="av-row"><Button variant="secondary" onClick={() => setDrafts((l) => [...l, emptyDraft()])}>{t("a.pe.addAnother")}</Button></div>
            </>
          ) : <Alert>{t("a.pe.staffNew")}</Alert>}
        </section>
      ) : (
        <>
          <PhotoManager product={product!} onChange={setProduct} />
          <section className="av-card-form" aria-labelledby="colours-h">
            <h2 className="av-formtitle" id="colours-h">{t("a.products.options")}</h2>
            {product!.variants.length === 0 && <p className="av-small">{t("a.pe.noOptions")}</p>}
            {product!.variants.map((v) => (
              <VariantCard key={`${v.id}-${v.version}`} variant={v} isAdmin={isAdmin}
                           onSaved={(nv) => setProduct((p) => p && { ...p, variants: p.variants.map((x) => (x.id === nv.id ? nv : x)) })} />
            ))}
            {isAdmin ? (
              <div className="av-draft">
                <h3>{t("a.pe.addOptionTitle")}</h3>
                <VariantFields draft={draft} errors={draftFieldErrors} fallbackName={product!.name} onChange={setDraft} />
                <div className="av-row"><Button loading={addBusy} onClick={addVariant}>{t("a.pe.addOption")}</Button></div>
              </div>
            ) : <Alert>{t("a.pe.staffAdd")}</Alert>}
          </section>

          {isAdmin && (
            <section className="av-card-form" aria-labelledby="history-h">
              <h2 className="av-formtitle" id="history-h">{t("a.pe.history")}</h2>
              {!history ? <div className="av-row"><Button variant="secondary" size="sm" onClick={showHistory}>{t("a.pe.showHistory")}</Button></div> : (
                <ul className="av-history">
                  {history.length === 0 && <li className="av-small">{t("a.pe.noHistory")}</li>}
                  {history.map((h) => <li key={h.id}><span>{actionLabel(h.action, t)}</span><time className="av-small av-muted" dateTime={h.createdAt}>{new Date(h.createdAt).toLocaleString()}</time></li>)}
                </ul>
              )}
            </section>
          )}

          <Dialog open={confirmRetire} title={t("a.pe.removeQ")} onClose={() => setConfirmRetire(false)}
                  actions={<><Button variant="ghost" onClick={() => setConfirmRetire(false)}>{t("a.keep")}</Button><Button onClick={retire}>{t("a.pe.removeIt")}</Button></>}>
            <p>{t("a.pe.removeBody", { name: product!.name })}</p>
          </Dialog>
        </>
      )}
    </>
  );
}
