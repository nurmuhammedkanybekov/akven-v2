import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listProducts } from "../api/endpoints";
import type { Category, GiftBoxColour, GiftInput, GiftRibbon } from "../api/types";
import { useCart } from "../cart/CartContext";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { BOX_COLOURS, GiftBoxScene, RIBBON_COLOURS } from "../components/GiftBoxScene";
import { ProductCard } from "../components/ProductCard";
import { ProductImage } from "../components/ProductImage";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { BOXES, LIMITS, RIBBONS, setGift, useGift } from "../shop/useGift";

const SHELVES: Array<{ category: Category | null; key: MessageKey }> = [
  { category: null, key: "gb.all" }, { category: "WOMEN", key: "nav.women" }, { category: "MEN", key: "nav.men" }, { category: "KIDS", key: "nav.kids" },
];

/**
 * Build a gift box: choose the box and the ribbon, put socks in (from any shelf, with quick view, straight into the
 * bag), and write the card. The box, ribbon and card are free; the family packs it by hand at 70-E. What is chosen
 * here is kept with the bag and sent with the order.
 */
export function GiftPage() {
  const { t } = useT();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const saved = useGift();
  const [params] = useSearchParams();
  const forName = params.get("for")?.slice(0, LIMITS.to) ?? null;
  const [draft, setDraft] = useState<GiftInput>(() => saved ?? { box: "NAVY", ribbon: "GOLD", to: forName, from: null, message: null, hidePrices: true });
  const [open, setOpen] = useState(true);
  const [shelf, setShelf] = useState<Category | null>(null);
  const picks = useAsync((signal) => listProducts({ category: shelf ?? undefined, inStock: true, pageSize: 6, sort: "newest" }, signal), [shelf]);
  const set = (patch: Partial<GiftInput>) => setDraft((d) => ({ ...d, ...patch }));
  const pairs = cart.count;

  function done() {
    setGift(draft);
    toast(t("gb.added"));
    navigate("/cart");
  }

  return (
    <div className="av-container av-page av-giftpage">
      <header className="av-page__head">
        <span className="av-eyebrow">{t("gb.eyebrow")}</span>
        <h1>{t("gb.title")}</h1>
        <p className="av-lead">{t("gb.lead")}</p>
      </header>

      <div className="av-giftb">
        <div className="av-giftb__stage">
          <GiftBoxScene box={draft.box} ribbon={draft.ribbon} open={open} to={draft.to}
                        socks={cart.lines.map((l) => ({ key: l.sku, colorHex: l.colorHex }))} />
          <button type="button" className="av-linkbtn av-giftb__peek" onClick={() => setOpen((o) => !o)} aria-pressed={!open}>
            {open ? t("gb.close") : t("gb.peek")}
          </button>
          <figure className={`av-giftcard${draft.message || draft.to ? " is-written" : ""}`} aria-label={t("gb.cardPreview")}>
            {draft.to && <p className="av-giftcard__to">{t("gb.dear", { name: draft.to })}</p>}
            <p className="av-giftcard__msg">{draft.message || t("gb.cardEmpty")}</p>
            {draft.from && <p className="av-giftcard__from">— {draft.from}</p>}
          </figure>
        </div>

        <div className="av-giftb__form">
          <fieldset className="av-giftstep" onFocus={() => setOpen(true)}>
            <legend><span className="av-giftstep__n">1</span>{t("gb.box")}</legend>
            <div className="av-gswatches" role="radiogroup" aria-label={t("gb.box")}>
              {BOXES.map((b) => (
                <Swatch key={b} name="box" checked={draft.box === b} colour={BOX_COLOURS[b].face} label={t(`gb.box.${b}` as MessageKey)} onChange={() => set({ box: b as GiftBoxColour })} />
              ))}
            </div>
            <div className="av-gswatches" role="radiogroup" aria-label={t("gb.ribbon")}>
              <span className="av-label">{t("gb.ribbon")}</span>
              {RIBBONS.map((r) => (
                <Swatch key={r} name="ribbon" checked={draft.ribbon === r} colour={RIBBON_COLOURS[r]} label={t(`gb.ribbon.${r}` as MessageKey)} onChange={() => set({ ribbon: r as GiftRibbon })} />
              ))}
            </div>
          </fieldset>

          <fieldset className="av-giftstep" onFocus={() => setOpen(true)}>
            <legend><span className="av-giftstep__n">2</span>{t("gb.inside")}</legend>
            {cart.lines.length === 0 ? <p className="av-small">{t("gb.insideEmpty")}</p> : (
              <ul className="av-giftb__lines" aria-label={t("gb.inside")}>
                {cart.lines.map((l) => (
                  <li key={l.sku}>
                    <span className="av-giftb__thumb"><ProductImage image={l.imageUrl ? { url: l.imageUrl, alt: "" } : null} /></span>
                    <span><strong>{l.productName}</strong><br /><span className="av-small av-muted">{l.variantLabel} · ×{l.quantity}</span></span>
                  </li>
                ))}
              </ul>
            )}
            <p className="av-small">{t("gb.pairs", { n: pairs })} <Link to="/cart">{t("gb.editBag")}</Link></p>
            <div className="av-tabs av-tabs--inline" role="group" aria-label={t("gb.shelves")}>
              {SHELVES.map((s) => (
                <button key={s.key} type="button" aria-pressed={shelf === s.category} className="av-tabbtn" onClick={() => setShelf(s.category)}>{t(s.key)}</button>
              ))}
            </div>
            {picks.loading && !picks.data ? <Skeleton height={220} /> : (
              <div className="av-grid-products av-giftb__picks">
                {(picks.data?.items ?? []).map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={(i % 6) + 1} />)}
              </div>
            )}
          </fieldset>

          <fieldset className="av-giftstep" onFocus={() => setOpen(false)}>
            <legend><span className="av-giftstep__n">3</span>{t("gb.card")}</legend>
            <div className="av-formgrid">
              <label className="av-field"><span className="av-label">{t("gb.to")}</span>
                <input className="av-input" value={draft.to ?? ""} maxLength={LIMITS.to} onChange={(e) => set({ to: e.target.value })} /></label>
              <label className="av-field"><span className="av-label">{t("gb.from")}</span>
                <input className="av-input" value={draft.from ?? ""} maxLength={LIMITS.from} onChange={(e) => set({ from: e.target.value })} /></label>
            </div>
            <label className="av-field"><span className="av-label">{t("gb.message")}</span>
              <textarea className="av-input av-textarea" rows={4} value={draft.message ?? ""} maxLength={LIMITS.message}
                        placeholder={t("gb.messagePh")} onChange={(e) => set({ message: e.target.value })} />
              <span className="av-hint av-num" aria-live="polite">{(draft.message ?? "").length} / {LIMITS.message}</span>
            </label>
            <label className="av-check"><input type="checkbox" checked={draft.hidePrices} onChange={(e) => set({ hidePrices: e.target.checked })} /> {t("gb.hidePrices")}</label>
          </fieldset>

          <div className="av-row av-giftb__done">
            <Button size="lg" variant="accent" onClick={done}>{saved ? t("gb.update") : t("gb.done")}</Button>
            {saved && <Button variant="ghost" onClick={() => { setGift(null); toast(t("gb.removed")); }}>{t("gb.remove")}</Button>}
          </div>
          <p className="av-small av-muted">{t("gb.free")}</p>
        </div>
      </div>
    </div>
  );
}

function Swatch({ name, checked, colour, label, onChange }: { name: string; checked: boolean; colour: string; label: string; onChange: () => void }) {
  return (
    <label className="av-gswatch" title={label}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span className="av-gswatch__dot" style={{ background: colour }} />
      <span className="av-gswatch__label">{label}</span>
    </label>
  );
}
