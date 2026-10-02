import { useState, type FormEvent } from "react";
import type { AdminTerm, Category, ProductInput, TermKind } from "../api/types";
import { Button } from "../components/Button";
import { Input, Textarea } from "../components/Field";
import { CATEGORIES, CATEGORY_LABEL } from "../lib/labels";
import { blankToNull } from "./helpers";
import { TermSelect } from "./TermSelect";

interface Props {
  initial: ProductInput;
  sections: AdminTerm[];
  cuts: AdminTerm[];
  createTerm: (kind: TermKind, name: string) => Promise<AdminTerm>;
  fieldErrors: Record<string, string>;
  submitLabel: string;
  busy: boolean;
  onSubmit: (input: ProductInput) => void;
  /** Lets the page suggest SKUs from the name while it is still being typed. */
  onNameChange?: (name: string) => void;
}

/** The product's details: what it is, where it sits in the shop, and what it is made of. */
export function ProductForm({ initial, sections, cuts, createTerm, fieldErrors, submitLabel, busy, onSubmit, onNameChange }: Props) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setV((cur) => ({ ...cur, [key]: value }));
  const isBundle = v.category === "BUNDLES";

  function chooseCategory(c: Category) {
    setV((cur) => ({ ...cur, category: c, ...(c === "BUNDLES" ? { sectionId: null, cutId: null } : {}) }));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      ...v, name: v.name.trim(), collection: blankToNull(v.collection ?? ""), description: blankToNull(v.description ?? ""),
      fabricComposition: blankToNull(v.fabricComposition ?? ""), quality: blankToNull(v.quality ?? ""),
      care: blankToNull(v.care ?? ""), origin: blankToNull(v.origin ?? ""),
    });
  }

  return (
    <form className="av-card-form" onSubmit={submit} noValidate aria-label="Product details">
      <h2 className="av-formtitle">Details</h2>
      <Input label="Name" value={v.name} error={fieldErrors.name} placeholder="e.g. Ak&Ven Mid-Long Socks" required
             onChange={(e) => { set("name", e.target.value); onNameChange?.(e.target.value); }} />

      <fieldset className="av-option">
        <legend className="av-label">Who is it for?</legend>
        <div className="av-row" role="group" aria-label="Audience">
          {CATEGORIES.map((c) => <button key={c} type="button" className="av-chip" aria-pressed={v.category === c} onClick={() => chooseCategory(c)}>{CATEGORY_LABEL[c]}</button>)}
        </div>
        {fieldErrors.category && <span className="av-error">{fieldErrors.category}</span>}
      </fieldset>

      <div className="av-formgrid">
        <TermSelect label="Section" kind="SECTION" terms={sections} value={v.sectionId} disabled={isBundle} onChange={(id) => set("sectionId", id)} onCreate={createTerm}
                    hint={isBundle ? "Bundles sit outside the sections." : "For example Classic, Sport, or your own."} />
        <TermSelect label="Cut" kind="CUT" terms={cuts} value={v.cutId} disabled={isBundle} onChange={(id) => set("cutId", id)} onCreate={createTerm}
                    hint={isBundle ? "Bundles have no single cut." : "How tall the sock is, for example Crew or Mid-long."} />
      </div>

      <Input label="Collection (optional)" value={v.collection ?? ""} error={fieldErrors.collection} placeholder="e.g. Winter 2026" onChange={(e) => set("collection", e.target.value)} />
      <Textarea label="Description" value={v.description ?? ""} error={fieldErrors.description} hint="Shown on the product page. A sentence or two is plenty."
                onChange={(e) => set("description", e.target.value)} />

      <h2 className="av-formtitle">Quality and fabric</h2>
      <div className="av-formgrid">
        <Input label="Quality" value={v.quality ?? ""} error={fieldErrors.quality} placeholder="e.g. Premium combed cotton" onChange={(e) => set("quality", e.target.value)} />
        <Input label="Made in" value={v.origin ?? ""} error={fieldErrors.origin} placeholder="e.g. Korea" onChange={(e) => set("origin", e.target.value)} />
      </div>
      <Input label="Fabric" value={v.fabricComposition ?? ""} error={fieldErrors.fabricComposition} placeholder="e.g. 80% cotton, 18% nylon, 2% elastane" onChange={(e) => set("fabricComposition", e.target.value)} />
      <Textarea label="Care" value={v.care ?? ""} error={fieldErrors.care} placeholder="e.g. Machine wash cold. Do not bleach." rows={2} onChange={(e) => set("care", e.target.value)} />

      <div className="av-row"><Button type="submit" loading={busy} disabled={!v.name.trim()}>{submitLabel}</Button></div>
    </form>
  );
}
