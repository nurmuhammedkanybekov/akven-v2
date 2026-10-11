import { ColorField } from "../components/ColorField";
import { Input } from "../components/Field";
import { suggestSku, type VariantDraft } from "./helpers";
import { useT } from "../i18n/I18n";

interface Props { draft: VariantDraft; errors: Record<string, string>; fallbackName: string; onChange: (next: VariantDraft) => void }

/** The fields of one new colour/size option: what customers see, what it costs, and how much is in stock. */
export function VariantFields({ draft, errors, fallbackName, onChange }: Props) {
  const { t } = useT();
  const set = (patch: Partial<VariantDraft>) => {
    const next = { ...draft, ...patch };
    if (!next.skuTouched) next.sku = suggestSku(fallbackName, next.color || null, next.size || null, Number(next.packSize) || null);
    onChange(next);
  };
  return (
    <div className="av-variantfields">
      <ColorField name={draft.color} hex={draft.colorHex} onChange={(c) => set({ color: c.name, colorHex: c.hex })} />
      <div className="av-formgrid av-formgrid--4">
        <Input label={t("a.v.size")} value={draft.size} placeholder={t("a.v.sizeEg")} onChange={(e) => set({ size: e.target.value })} />
        <Input label={t("a.v.pack")} type="number" min={1} value={draft.packSize} error={errors.packSize} onChange={(e) => set({ packSize: e.target.value })} />
        <Input label={t("a.v.price")} type="number" min={0} step="0.01" value={draft.price} error={errors.price} onChange={(e) => set({ price: e.target.value })} />
        <Input label={t("a.v.stock")} type="number" min={0} step={1} value={draft.stockQty} error={errors.stockQty} onChange={(e) => set({ stockQty: e.target.value })} />
      </div>
      <div className="av-formgrid av-formgrid--4">
        <Input label={t("a.v.cost")} type="number" min={0} step="0.01" value={draft.costPrice} error={errors.costPrice} hint={t("a.v.costHint")} onChange={(e) => set({ costPrice: e.target.value })} />
        <Input label={t("a.v.limit")} type="number" min={0} max={100} step="0.5" value={draft.marginFloorPct} error={errors.marginFloorPct}
               hint={t("a.v.limitHint")} onChange={(e) => set({ marginFloorPct: e.target.value })} />
        <Input label={t("a.v.sku")} value={draft.sku} hint={t("a.v.skuHint")} error={errors.sku}
               onChange={(e) => onChange({ ...draft, sku: e.target.value, skuTouched: true })} />
      </div>
    </div>
  );
}
