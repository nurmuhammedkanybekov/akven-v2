import { ColorField } from "../components/ColorField";
import { Input } from "../components/Field";
import { suggestSku, type VariantDraft } from "./helpers";

interface Props { draft: VariantDraft; errors: Record<string, string>; fallbackName: string; onChange: (next: VariantDraft) => void }

/** The fields of one new colour/size option: what customers see, what it costs, and how much is in stock. */
export function VariantFields({ draft, errors, fallbackName, onChange }: Props) {
  const set = (patch: Partial<VariantDraft>) => {
    const next = { ...draft, ...patch };
    if (!next.skuTouched) next.sku = suggestSku(fallbackName, next.color || null, next.size || null, Number(next.packSize) || null);
    onChange(next);
  };
  return (
    <div className="av-variantfields">
      <ColorField name={draft.color} hex={draft.colorHex} onChange={(c) => set({ color: c.name, colorHex: c.hex })} />
      <div className="av-formgrid av-formgrid--4">
        <Input label="Size" value={draft.size} placeholder="S, M, L or One size" onChange={(e) => set({ size: e.target.value })} />
        <Input label="Pairs in a pack" type="number" min={1} value={draft.packSize} error={errors.packSize} onChange={(e) => set({ packSize: e.target.value })} />
        <Input label="Price" type="number" min={0} step="0.01" value={draft.price} error={errors.price} onChange={(e) => set({ price: e.target.value })} />
        <Input label="In stock" type="number" min={0} step={1} value={draft.stockQty} error={errors.stockQty} onChange={(e) => set({ stockQty: e.target.value })} />
      </div>
      <div className="av-formgrid av-formgrid--4">
        <Input label="Your cost" type="number" min={0} step="0.01" value={draft.costPrice} error={errors.costPrice} hint="Never shown to customers." onChange={(e) => set({ costPrice: e.target.value })} />
        <Input label="Biggest discount (%)" type="number" min={0} max={100} step="0.5" value={draft.marginFloorPct} error={errors.marginFloorPct}
               hint="The most the assistant may ever take off." onChange={(e) => set({ marginFloorPct: e.target.value })} />
        <Input label="Code (SKU)" value={draft.sku} hint="Made for you. Change it if you use your own codes." error={errors.sku}
               onChange={(e) => onChange({ ...draft, sku: e.target.value, skuTouched: true })} />
      </div>
    </div>
  );
}
