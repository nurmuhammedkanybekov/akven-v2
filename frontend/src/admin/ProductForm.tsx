import { useState, type FormEvent } from "react";
import type { AdminTerm, Category, ProductInput, TermKind } from "../api/types";
import { Button } from "../components/Button";
import { Input, Textarea } from "../components/Field";
import { CATEGORIES, CATEGORY_KEY } from "../lib/labels";
import { useT } from "../i18n/I18n";
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
  const { t } = useT();
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
    <form className="av-card-form" onSubmit={submit} noValidate aria-label={t("a.pf.aria")}>
      <h2 className="av-formtitle">{t("a.pf.details")}</h2>
      <Input label={t("a.name")} value={v.name} error={fieldErrors.name} placeholder={t("a.pf.nameEg")} required
             onChange={(e) => { set("name", e.target.value); onNameChange?.(e.target.value); }} />

      <fieldset className="av-option">
        <legend className="av-label">{t("a.pf.who")}</legend>
        <div className="av-row" role="group" aria-label={t("a.pf.audience")}>
          {CATEGORIES.map((c) => <button key={c} type="button" className="av-chip" aria-pressed={v.category === c} onClick={() => chooseCategory(c)}>{t(CATEGORY_KEY[c])}</button>)}
        </div>
        {fieldErrors.category && <span className="av-error">{fieldErrors.category}</span>}
      </fieldset>

      <div className="av-formgrid">
        <TermSelect label={t("a.term.SECTION")} kind="SECTION" terms={sections} value={v.sectionId} disabled={isBundle} onChange={(id) => set("sectionId", id)} onCreate={createTerm}
                    hint={isBundle ? t("a.pf.sectionBundle") : t("a.pf.sectionHint")} />
        <TermSelect label={t("a.term.CUT")} kind="CUT" terms={cuts} value={v.cutId} disabled={isBundle} onChange={(id) => set("cutId", id)} onCreate={createTerm}
                    hint={isBundle ? t("a.pf.cutBundle") : t("a.pf.cutHint")} />
      </div>

      <Input label={t("a.pf.collection")} value={v.collection ?? ""} error={fieldErrors.collection} placeholder={t("a.pf.collectionEg")} onChange={(e) => set("collection", e.target.value)} />
      <Textarea label={t("a.pf.description")} value={v.description ?? ""} error={fieldErrors.description} hint={t("a.pf.descriptionHint")}
                onChange={(e) => set("description", e.target.value)} />

      <h2 className="av-formtitle">{t("a.pf.qualityTitle")}</h2>
      <div className="av-formgrid">
        <Input label={t("a.pf.quality")} value={v.quality ?? ""} error={fieldErrors.quality} placeholder={t("a.pf.qualityEg")} onChange={(e) => set("quality", e.target.value)} />
        <Input label={t("a.pf.origin")} value={v.origin ?? ""} error={fieldErrors.origin} placeholder={t("a.pf.originEg")} onChange={(e) => set("origin", e.target.value)} />
      </div>
      <Input label={t("a.pf.fabric")} value={v.fabricComposition ?? ""} error={fieldErrors.fabricComposition} placeholder={t("a.pf.fabricEg")} onChange={(e) => set("fabricComposition", e.target.value)} />
      <Textarea label={t("a.pf.care")} value={v.care ?? ""} error={fieldErrors.care} placeholder={t("a.pf.careEg")} rows={2} onChange={(e) => set("care", e.target.value)} />

      <div className="av-row"><Button type="submit" loading={busy} disabled={!v.name.trim()}>{submitLabel}</Button></div>
    </form>
  );
}
