import { useState } from "react";
import { ApiError } from "../api/client";
import { adminUpdatePricing, adminUpdateSupply, adminUpdateVariant } from "../api/endpoints";
import type { AdminVariant } from "../api/types";
import { Alert } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ColorField } from "../components/ColorField";
import { Input } from "../components/Field";
import { Switch } from "../components/Switch";
import { useToast } from "../components/Toast";
import { useT } from "../i18n/I18n";

/** One existing colour/size option. Staff change listing, price and stock; only an admin sees and edits cost and discount limit. */
export function VariantCard({ variant, isAdmin, onSaved }: { variant: AdminVariant; isAdmin: boolean; onSaved: (v: AdminVariant) => void }) {
  const toast = useToast();
  const { t } = useT();
  const [v, setV] = useState(variant);
  const [color, setColor] = useState({ name: variant.color ?? "", hex: variant.colorHex });
  const [price, setPrice] = useState(String(variant.price));
  const [stock, setStock] = useState(String(variant.stockQty));
  const [size, setSize] = useState(variant.size ?? "");
  const [pack, setPack] = useState(variant.packSize?.toString() ?? "");
  const [cost, setCost] = useState(String(variant.costPrice));
  const [floor, setFloor] = useState(String(variant.marginFloorPct));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"listing" | "pricing" | "supply" | null>(null);
  const [incoming, setIncoming] = useState(String(variant.incomingQty ?? 0));
  const [eta, setEta] = useState(variant.restockEta ?? "");
  const [casePairs, setCasePairs] = useState(variant.casePairs?.toString() ?? "");
  const supplyDirty = incoming !== String(v.incomingQty ?? 0) || eta !== (v.restockEta ?? "") || casePairs !== (v.casePairs?.toString() ?? "");

  const listingDirty = color.name !== (v.color ?? "") || color.hex !== v.colorHex || price !== String(v.price) || stock !== String(v.stockQty)
    || size !== (v.size ?? "") || pack !== (v.packSize?.toString() ?? "");
  const pricingDirty = cost !== String(v.costPrice) || floor !== String(v.marginFloorPct);

  function fail(e: unknown) {
    if (e instanceof ApiError) { setError(e.message); setFieldErrors(e.fieldErrors); } else setError(t("a.err.save"));
  }
  async function saveListing() {
    setBusy("listing"); setError(null); setFieldErrors({});
    try {
      const saved = await adminUpdateVariant(v.id, {
        size: size.trim() || null, color: color.name.trim() || null, colorHex: color.hex, packSize: pack.trim() ? Number(pack) : null,
        price: Number(price), stockQty: Number(stock), active: v.active, version: v.version,
      });
      setV(saved); onSaved(saved); toast(t("a.saved"));
    } catch (e) { fail(e); } finally { setBusy(null); }
  }
  async function saveActive(active: boolean) {
    setBusy("listing"); setError(null);
    try {
      const saved = await adminUpdateVariant(v.id, { size: v.size, color: v.color, colorHex: v.colorHex, packSize: v.packSize, price: v.price, stockQty: v.stockQty, active, version: v.version });
      setV(saved); onSaved(saved); toast(active ? t("a.shownInShop") : t("a.hiddenFromShop"));
    } catch (e) { fail(e); } finally { setBusy(null); }
  }
  async function saveSupply() {
    setBusy("supply"); setError(null); setFieldErrors({});
    try {
      const saved = await adminUpdateSupply(v.id, { casePairs: casePairs.trim() ? Number(casePairs) : null, incomingQty: Number(incoming) || 0, restockEta: eta || null, version: v.version });
      setV(saved); onSaved(saved); toast(t("a.v.incomingSaved"));
    } catch (e) { fail(e); } finally { setBusy(null); }
  }
  async function savePricing() {
    setBusy("pricing"); setError(null); setFieldErrors({});
    try {
      const saved = await adminUpdatePricing(v.id, { costPrice: Number(cost), marginFloorPct: Number(floor), version: v.version });
      setV(saved); onSaved(saved); toast(t("a.v.pricingSaved"));
    } catch (e) { fail(e); } finally { setBusy(null); }
  }

  return (
    <article className="av-variantcard" aria-label={`${v.color ?? t("a.v.standard")} ${v.size ?? ""}`.trim()}>
      <header className="av-variantcard__head">
        <span><span className="av-dot" style={{ background: v.colorHex ?? "transparent" }} /> <strong>{v.color ?? t("a.v.standard")}</strong>{v.size ? `, ${v.size}` : ""}{v.packSize && v.packSize > 1 ? `, ${t("a.pairs", { n: v.packSize })}` : ""}</span>
        <span className="av-eyebrow">{v.sku}</span>
        {!v.active && <Badge tone="danger">{t("a.hidden")}</Badge>}
      </header>
      {error && <Alert tone="danger">{error}</Alert>}
      <ColorField name={color.name} hex={color.hex} onChange={setColor} />
      <div className="av-formgrid av-formgrid--4">
        <Input label={t("a.v.size")} value={size} onChange={(e) => setSize(e.target.value)} />
        <Input label={t("a.v.pack")} type="number" min={1} value={pack} error={fieldErrors.packSize} onChange={(e) => setPack(e.target.value)} />
        <Input label={t("a.v.price")} type="number" min={0} step="0.01" value={price} error={fieldErrors.price} onChange={(e) => setPrice(e.target.value)} />
        <Input label={t("a.v.stock")} type="number" min={0} step={1} value={stock} error={fieldErrors.stockQty} hint={v.reservedQty > 0 ? t("a.v.reserved", { n: v.reservedQty }) : undefined} onChange={(e) => setStock(e.target.value)} />
      </div>
      <div className="av-row av-between">
        <Switch checked={v.active} onChange={(a) => void saveActive(a)} label={t("a.shownInShop")} />
        <Button size="sm" loading={busy === "listing"} disabled={!listingDirty} onClick={saveListing}>{t("a.saveChanges")}</Button>
      </div>
      <div className="av-variantcard__pricing">
        <div className="av-formgrid av-formgrid--4">
          <Input label={t("a.v.incoming")} type="number" min={0} step={1} value={incoming} error={fieldErrors.incomingQty} hint={t("a.v.incomingHint")} onChange={(e) => setIncoming(e.target.value)} />
          <Input label={t("a.v.eta")} type="date" value={eta} error={fieldErrors.restockEta} hint={t("a.v.etaHint")} onChange={(e) => setEta(e.target.value)} />
          <Input label={t("a.v.case")} type="number" min={1} value={casePairs} error={fieldErrors.casePairs} hint={t("a.v.caseHint")} onChange={(e) => setCasePairs(e.target.value)} />
          <div className="av-field"><span className="av-label">&nbsp;</span><Button size="sm" variant="secondary" loading={busy === "supply"} disabled={!supplyDirty} onClick={saveSupply}>{t("a.v.saveIncoming")}</Button></div>
        </div>
      </div>
      {isAdmin && (
        <div className="av-variantcard__pricing">
          <div className="av-formgrid av-formgrid--4">
            <Input label={t("a.v.cost")} type="number" min={0} step="0.01" value={cost} error={fieldErrors.costPrice} hint={t("a.v.costHint")} onChange={(e) => setCost(e.target.value)} />
            <Input label={t("a.v.limit")} type="number" min={0} max={100} step="0.5" value={floor} error={fieldErrors.marginFloorPct} hint={t("a.v.limitHint")} onChange={(e) => setFloor(e.target.value)} />
            <div className="av-field"><span className="av-label">&nbsp;</span><Button size="sm" variant="secondary" loading={busy === "pricing"} disabled={!pricingDirty} onClick={savePricing}>{t("a.v.savePricing")}</Button></div>
          </div>
        </div>
      )}
    </article>
  );
}
