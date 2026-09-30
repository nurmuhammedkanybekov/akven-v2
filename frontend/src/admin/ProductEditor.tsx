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
import { ACTION_LABEL, draftToInput, emptyDraft, emptyProductInput, isBlankDraft, type VariantDraft } from "./helpers";
import { PhotoManager } from "./PhotoManager";
import { ProductForm } from "./ProductForm";
import { VariantCard } from "./VariantCard";
import { VariantFields } from "./VariantFields";

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
    toast(`${kind === "SECTION" ? "Section" : "Cut"} "${term.name}" added`);
    return term;
  }
  function reportFailure(e: unknown) {
    if (e instanceof ApiError) { setError(e.message); setFieldErrors(e.fieldErrors); } else setError("Something went wrong. Please try again.");
  }

  async function create(input: ProductInput) {
    setError(null); setFieldErrors({});
    const prepared = isAdmin ? drafts.filter((d) => !isBlankDraft(d)).map((d) => ({ d, r: draftToInput(d, input.name) })) : [];
    if (prepared.some((p) => Object.keys(p.r.errors).length)) {
      setDraftErrors(drafts.map((d) => (isBlankDraft(d) ? {} : draftToInput(d, input.name).errors)));
      setError("Please fix the highlighted colours and sizes first.");
      return;
    }
    setBusy(true);
    let created: AdminProduct;
    try { created = await adminCreateProduct(input); } catch (e) { reportFailure(e); setBusy(false); return; }
    for (const { r } of prepared) {
      try { await createVariantWithUniqueSku(created.id, r.input!, r.autoSku ?? true); }
      catch (e) {
        toast(`Product saved, but "${r.input!.color ?? r.input!.sku}" could not be added: ${e instanceof ApiError ? e.message : "try again"}`, "danger");
        setBusy(false);
        navigate(`/admin/products/${created.id}`); return;
      }
    }
    toast("Product added. Now add its photos.");
    setBusy(false);   // this component instance is reused for the edit URL, so it must not stay busy
    navigate(`/admin/products/${created.id}#photos`);
  }

  async function save(input: ProductInput) {
    if (!product) return;
    setBusy(true); setError(null); setFieldErrors({});
    try {
      const { slug: _slug, ...body } = input;
      setProduct(await adminUpdateProduct(product.id, body));
      toast("Saved");
    } catch (e) { reportFailure(e); } finally { setBusy(false); }
  }

  async function retire() {
    if (!product) return;
    try { await adminRetireProduct(product.id); setProduct({ ...product, active: false }); toast("Removed from the shop. You can put it back any time."); }
    catch (e) { reportFailure(e); }
    setConfirmRetire(false);
  }
  async function restore() {
    if (!product) return;
    try { setProduct(await adminRestoreProduct(product.id)); toast("Put back in the shop"); } catch (e) { reportFailure(e); }
  }

  // ---- adding one more colour/size to an existing product ----
  const [draft, setDraft] = useState<VariantDraft>(emptyDraft());
  const [draftFieldErrors, setDraftFieldErrors] = useState<Record<string, string>>({});
  const [addBusy, setAddBusy] = useState(false);
  async function addVariant() {
    if (!product) return;
    const r = draftToInput(draft, product.name);
    setDraftFieldErrors(r.errors);
    if (!r.input) return;
    setAddBusy(true);
    try {
      const v = await createVariantWithUniqueSku(product.id, r.input, r.autoSku ?? true);
      setProduct({ ...product, variants: [...product.variants, v] });
      setDraft(emptyDraft()); toast("Added");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not add it."); if (e instanceof ApiError) setDraftFieldErrors(e.fieldErrors); }
    finally { setAddBusy(false); }
  }

  async function showHistory() { setHistory(await adminProductAudit(product!.id)); }

  if (terms.loading || (!isNew && loaded.loading && !product)) return <div className="av-stack"><Skeleton height={48} width="40%" /><Skeleton height={320} /></div>;
  if (!isNew && (loaded.error || !product)) return <Alert tone="danger">{loaded.error?.message ?? "That product was not found."} <Link to="/admin">Back to products</Link></Alert>;

  return (
    <>
      <nav className="av-crumbs" aria-label="Breadcrumb"><Link to="/admin">Products</Link><span aria-hidden="true">/</span><span>{isNew ? "Add a product" : product!.name}</span></nav>
      <header className="av-admin__head">
        <div>
          <span className="av-eyebrow">{isNew ? "New" : product!.slug}</span>
          <h1>{isNew ? "Add a product" : product!.name}</h1>
        </div>
        {!isNew && (
          <div className="av-row">
            {product!.active ? <Badge tone="success">In the shop</Badge> : <Badge tone="danger">Removed</Badge>}
            {product!.active && <Button variant="secondary" size="sm" href={`/products/${product!.slug}`} target="_blank" rel="noreferrer">View in the shop</Button>}
            {product!.active
              ? <Button variant="ghost" size="sm" onClick={() => setConfirmRetire(true)}>Remove from the shop</Button>
              : <Button size="sm" onClick={restore}>Put back in the shop</Button>}
          </div>
        )}
      </header>

      {error && <Alert tone="danger">{error}</Alert>}
      {!isNew && !product!.active && <Alert>This product is hidden from the shop. Nothing is lost: put it back whenever you like.</Alert>}

      <ProductForm key={isNew ? "new" : `${product!.id}-${product!.version}`} initial={isNew ? emptyProductInput() : toInput(product!)}
                   sections={sections} cuts={cuts} createTerm={createTerm} fieldErrors={fieldErrors} busy={busy}
                   submitLabel={isNew ? "Add product" : "Save details"} onSubmit={isNew ? create : save} onNameChange={setDraftName} />

      {isNew ? (
        <section className="av-card-form" aria-labelledby="colours-h">
          <h2 className="av-formtitle" id="colours-h">Colours and sizes</h2>
          {isAdmin ? (
            <>
              <p className="av-small">Add each colour and size you sell. You can add more, and photos, after saving.</p>
              {drafts.map((d, i) => (
                <div key={i} className="av-draft">
                  <VariantFields draft={d} errors={draftErrors[i] ?? {}} fallbackName={draftName || "AKV"}
                                 onChange={(n) => setDrafts((list) => list.map((x, j) => (j === i ? n : x)))} />
                  {drafts.length > 1 && <Button variant="ghost" size="sm" onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))}>Remove this option</Button>}
                </div>
              ))}
              <div className="av-row"><Button variant="secondary" onClick={() => setDrafts((l) => [...l, emptyDraft()])}>+ Add another colour or size</Button></div>
            </>
          ) : <Alert>Colours and sizes set a cost and a discount limit, so an admin adds them. Save the product now and ask an admin to add them.</Alert>}
        </section>
      ) : (
        <>
          <PhotoManager product={product!} onChange={setProduct} />
          <section className="av-card-form" aria-labelledby="colours-h">
            <h2 className="av-formtitle" id="colours-h">Colours and sizes</h2>
            {product!.variants.length === 0 && <p className="av-small">Customers cannot buy this product until it has at least one colour or size.</p>}
            {product!.variants.map((v) => (
              <VariantCard key={`${v.id}-${v.version}`} variant={v} isAdmin={isAdmin}
                           onSaved={(nv) => setProduct((p) => p && { ...p, variants: p.variants.map((x) => (x.id === nv.id ? nv : x)) })} />
            ))}
            {isAdmin ? (
              <div className="av-draft">
                <h3>Add a colour or size</h3>
                <VariantFields draft={draft} errors={draftFieldErrors} fallbackName={product!.name} onChange={setDraft} />
                <div className="av-row"><Button loading={addBusy} onClick={addVariant}>Add this option</Button></div>
              </div>
            ) : <Alert>Only an admin can add a new colour or size, because it sets the cost and the discount limit.</Alert>}
          </section>

          {isAdmin && (
            <section className="av-card-form" aria-labelledby="history-h">
              <h2 className="av-formtitle" id="history-h">History</h2>
              {!history ? <div className="av-row"><Button variant="secondary" size="sm" onClick={showHistory}>Show who changed what</Button></div> : (
                <ul className="av-history">
                  {history.length === 0 && <li className="av-small">No changes recorded yet.</li>}
                  {history.map((h) => <li key={h.id}><span>{ACTION_LABEL[h.action] ?? h.action}</span><time className="av-small av-muted" dateTime={h.createdAt}>{new Date(h.createdAt).toLocaleString()}</time></li>)}
                </ul>
              )}
            </section>
          )}

          <Dialog open={confirmRetire} title="Remove from the shop?" onClose={() => setConfirmRetire(false)}
                  actions={<><Button variant="ghost" onClick={() => setConfirmRetire(false)}>Keep it</Button><Button onClick={retire}>Remove it</Button></>}>
            <p>"{product!.name}" disappears from the shop straight away. Nothing is deleted: its photos, colours and past orders stay safe, and you can put it back any time.</p>
          </Dialog>
        </>
      )}
    </>
  );
}
