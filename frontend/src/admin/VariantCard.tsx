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

/** One existing colour/size option. Staff change listing, price and stock; only an admin sees and edits cost and discount limit. */
export function VariantCard({ variant, isAdmin, onSaved }: { variant: AdminVariant; isAdmin: boolean; onSaved: (v: AdminVariant) => void }) {
  const toast = useToast();
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
    if (e instanceof ApiError) { setError(e.message); setFieldErrors(e.fieldErrors); } else setError("Could not save. Try again.");
  }
  async function saveListing() {
    setBusy("listing"); setError(null); setFieldErrors({});
    try {
      const saved = await adminUpdateVariant(v.id, {
        size: size.trim() || null, color: color.name.trim() || null, colorHex: color.hex, packSize: pack.trim() ? Number(pack) : null,
        price: Number(price), stockQty: Number(stock), active: v.active, version: v.version,
      });
      setV(saved); onSaved(saved); toast("Saved");
    } catch (e) { fail(e); } finally { setBusy(null); }
  }
  async function saveActive(active: boolean) {
    setBusy("listing"); setError(null);
    try {
      const saved = await adminUpdateVariant(v.id, { size: v.size, color: v.color, colorHex: v.colorHex, packSize: v.packSize, price: v.price, stockQty: v.stockQty, active, version: v.version });
      setV(saved); onSaved(saved); toast(active ? "Shown in the shop" : "Hidden from the shop");
    } catch (e) { fail(e); } finally { setBusy(null); }
  }
  async function saveSupply() {
    setBusy("supply"); setError(null); setFieldErrors({});
    try {
      const saved = await adminUpdateSupply(v.id, { casePairs: casePairs.trim() ? Number(casePairs) : null, incomingQty: Number(incoming) || 0, restockEta: eta || null, version: v.version });
      setV(saved); onSaved(saved); toast("Incoming stock saved");
    } catch (e) { fail(e); } finally { setBusy(null); }
  }
  async function savePricing() {
    setBusy("pricing"); setError(null); setFieldErrors({});
    try {
      const saved = await adminUpdatePricing(v.id, { costPrice: Number(cost), marginFloorPct: Number(floor), version: v.version });
      setV(saved); onSaved(saved); toast("Cost and discount limit saved");
    } catch (e) { fail(e); } finally { setBusy(null); }
  }

  return (
    <article className="av-variantcard" aria-label={`${v.color ?? "Standard"} ${v.size ?? ""}`.trim()}>
      <header className="av-variantcard__head">
        <span><span className="av-dot" style={{ background: v.colorHex ?? "transparent" }} /> <strong>{v.color ?? "Standard"}</strong>{v.size ? `, ${v.size}` : ""}{v.packSize && v.packSize > 1 ? `, ${v.packSize} pairs` : ""}</span>
        <span className="av-eyebrow">{v.sku}</span>
        {!v.active && <Badge tone="danger">Hidden</Badge>}
      </header>
      {error && <Alert tone="danger">{error}</Alert>}
      <ColorField name={color.name} hex={color.hex} onChange={setColor} />
      <div className="av-formgrid av-formgrid--4">
        <Input label="Size" value={size} onChange={(e) => setSize(e.target.value)} />
        <Input label="Pairs in a pack" type="number" min={1} value={pack} error={fieldErrors.packSize} onChange={(e) => setPack(e.target.value)} />
        <Input label="Price" type="number" min={0} step="0.01" value={price} error={fieldErrors.price} onChange={(e) => setPrice(e.target.value)} />
        <Input label="In stock" type="number" min={0} step={1} value={stock} error={fieldErrors.stockQty} hint={v.reservedQty > 0 ? `${v.reservedQty} reserved by open orders` : undefined} onChange={(e) => setStock(e.target.value)} />
      </div>
      <div className="av-row av-between">
        <Switch checked={v.active} onChange={(a) => void saveActive(a)} label="Shown in the shop" />
        <Button size="sm" loading={busy === "listing"} disabled={!listingDirty} onClick={saveListing}>Save changes</Button>
      </div>
      <div className="av-variantcard__pricing">
        <div className="av-formgrid av-formgrid--4">
          <Input label="On the way" type="number" min={0} step={1} value={incoming} error={fieldErrors.incomingQty} hint="Units ordered from the factory." onChange={(e) => setIncoming(e.target.value)} />
          <Input label="Arrives on" type="date" value={eta} error={fieldErrors.restockEta} hint={'The shop says "arrives in about N days".'} onChange={(e) => setEta(e.target.value)} />
          <Input label="Pairs in a case" type="number" min={1} value={casePairs} error={fieldErrors.casePairs} hint="For wholesale, e.g. 200 or 250." onChange={(e) => setCasePairs(e.target.value)} />
          <div className="av-field"><span className="av-label">&nbsp;</span><Button size="sm" variant="secondary" loading={busy === "supply"} disabled={!supplyDirty} onClick={saveSupply}>Save incoming stock</Button></div>
        </div>
      </div>
      {isAdmin && (
        <div className="av-variantcard__pricing">
          <div className="av-formgrid av-formgrid--4">
            <Input label="Your cost" type="number" min={0} step="0.01" value={cost} error={fieldErrors.costPrice} hint="Never shown to customers." onChange={(e) => setCost(e.target.value)} />
            <Input label="Biggest discount (%)" type="number" min={0} max={100} step="0.5" value={floor} error={fieldErrors.marginFloorPct} hint="The most the assistant may ever take off." onChange={(e) => setFloor(e.target.value)} />
            <div className="av-field"><span className="av-label">&nbsp;</span><Button size="sm" variant="secondary" loading={busy === "pricing"} disabled={!pricingDirty} onClick={savePricing}>Save cost and limit</Button></div>
          </div>
        </div>
      )}
    </article>
  );
}
