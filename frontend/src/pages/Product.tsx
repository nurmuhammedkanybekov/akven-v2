import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MAX_PER_LINE, useCart } from "../cart/CartContext";
import { QuantityStepper } from "../components/QuantityStepper";
import { useToast } from "../components/Toast";
import { getProduct } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { ProductDetail, VariantView } from "../api/types";
import { Skeleton } from "../components/Alert";
import { StockBadge } from "../components/Badge";
import { Button } from "../components/Button";
import { NegotiationChat } from "../components/NegotiationChat";
import { Price } from "../components/Price";
import { SizeFinder } from "../components/SizeFinder";
import { ProductImage } from "../components/ProductImage";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { usePricing } from "../shop/useShopInfo";
import { CATEGORY_PATH, productMeta } from "../lib/labels";
import { NotFoundPage } from "./NotFound";

export function ProductPage() {
  const { slug = "" } = useParams();
  const product = useAsync(() => getProduct(slug), [slug]);
  if (product.loading && !product.data) return <div className="av-container av-page"><Skeleton height={520} /></div>;
  if (product.error instanceof ApiError && product.error.status === 404) return <NotFoundPage what="That product" />;
  if (product.error || !product.data) return <div className="av-container av-page"><LoadError /></div>;
  return <ProductView product={product.data} />;
}

function LoadError() {
  const { t } = useT();
  return <p className="av-lead">{t("pdp.loadError")}</p>;
}

function ProductView({ product }: { product: ProductDetail }) {
  const { t } = useT();
  const pricing = usePricing();
  const variants = product.variants;
  const [sku, setSku] = useState(() => (variants.find((v) => v.availableQty > 0) ?? variants[0])?.sku);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const cart = useCart();
  const toast = useToast();
  const current: VariantView | undefined = variants.find((v) => v.sku === sku);

  const colors = useMemo(() => {
    const seen = new Map<string, VariantView>();
    for (const v of variants) { const key = `${v.color ?? ""}|${v.colorHex ?? ""}`; if (!seen.has(key)) seen.set(key, v); }
    return [...seen.values()];
  }, [variants]);
  const sameColor = variants.filter((v) => v.color === current?.color && v.colorHex === current?.colorHex);
  const sizes = [...new Set(sameColor.map((v) => v.size).filter((s): s is string => !!s))];
  const packs = [...new Set(sameColor.filter((v) => v.size === current?.size).map((v) => v.packSize).filter((p): p is number => p !== null))];

  /** Picking one option keeps the others where possible, so changing colour does not reset the size. */
  function pick(change: Partial<Pick<VariantView, "color" | "colorHex" | "size" | "packSize">>) {
    const want = { color: current?.color, colorHex: current?.colorHex, size: current?.size, packSize: current?.packSize, ...change };
    const score = (v: VariantView) => (v.color === want.color ? 4 : 0) + (v.colorHex === want.colorHex ? 4 : 0) + (v.size === want.size ? 2 : 0) + (v.packSize === want.packSize ? 1 : 0);
    const best = [...variants].filter((v) => Object.entries(change).every(([k, val]) => v[k as keyof VariantView] === val))
      .sort((a, b) => score(b) - score(a))[0];
    if (best) setSku(best.sku);
  }

  const image = product.images[imageIndex];
  const details: Array<[MessageKey, string | null]> = [["pdp.fabric", product.fabricComposition], ["pdp.quality", product.quality], ["pdp.madeIn", product.origin], ["pdp.care", product.care]];
  const steps = pricing?.tiers ?? [];
  const label = (v: VariantView) => [v.color, v.size, v.packSize && v.packSize > 1 ? t("pdp.pairsN", { n: v.packSize }) : null].filter(Boolean).join(", ") || null;

  return (
    <div className="av-container av-page">
      <nav className="av-crumbs" aria-label={t("pdp.crumbs")}>
        <Link to={CATEGORY_PATH[product.category]}>{t(`nav.${product.category.toLowerCase()}` as MessageKey)}</Link>
        {product.section && <><span aria-hidden="true">/</span><Link to={`${CATEGORY_PATH[product.category]}?section=${product.section.slug}`}>{product.section.name}</Link></>}
      </nav>
      <div className="av-pdp">
        <div className="av-pdp__gallery">
          <div className="av-pdp__main"><ProductImage image={image} eager /></div>
          {product.images.length > 1 && (
            <div className="av-pdp__thumbs" role="group" aria-label={t("pdp.photos")}>
              {product.images.map((img, i) => (
                <button key={img.url} type="button" className="av-pdp__thumb" aria-pressed={i === imageIndex} aria-label={`Photo ${i + 1}: ${img.alt}`} onClick={() => setImageIndex(i)}>
                  <img src={img.url} alt="" width={96} height={120} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="av-pdp__info">
          <span className="av-eyebrow">{productMeta(product, t(`nav.${product.category.toLowerCase()}` as MessageKey))}</span>
          <h1 className="av-pdp__title">{product.name}</h1>
          {current ? <Price amount={current.price} large /> : <Price amount={null} />}
          {steps.length > 0 && (
            <p className="av-pdp__ladder">
              <span>{t("pdp.ladder")}</span>{" "}
              {steps.map((x, i) => <span key={x.minPairs} className="av-num">{i > 0 && " · "}{t("pdp.ladderStep", { n: x.minPairs, pct: Number(x.discountPct) })}</span>)}
            </p>
          )}
          {product.description && <p className="av-lead">{product.description}</p>}

          {variants.length === 0 && <p className="av-small">{t("pdp.noVariants")}</p>}

          {current && colors.length > 0 && colors.some((c) => c.color) && (
            <fieldset className="av-option">
              <legend className="av-label">{t("pdp.colour")}: <strong>{current.color ?? "Standard"}</strong></legend>
              <div className="av-row">
                {colors.map((c) => (
                  <button key={`${c.color}${c.colorHex}`} type="button" className="av-colorchoice" aria-pressed={c.color === current.color && c.colorHex === current.colorHex}
                          aria-label={c.color ?? "Colour"} title={c.color ?? ""} onClick={() => pick({ color: c.color, colorHex: c.colorHex })}>
                    <span style={{ background: c.colorHex ?? "var(--surface-2)" }} />
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {sizes.length > 0 && (
            <fieldset className="av-option">
              <legend className="av-label">{t("pdp.size")}</legend>
              <div className="av-row">
                {sizes.map((s) => <Chip2 key={s} label={s} pressed={current?.size === s} onClick={() => pick({ size: s })} />)}
              </div>
            </fieldset>
          )}
          {packs.length > 1 && (
            <fieldset className="av-option">
              <legend className="av-label">{t("pdp.pack")}</legend>
              <div className="av-row">
                {packs.map((p) => <Chip2 key={p} label={p === 1 ? t("pdp.pairs1") : t("pdp.pairsN", { n: p })} pressed={current?.packSize === p} onClick={() => pick({ packSize: p })} />)}
              </div>
            </fieldset>
          )}

          {current && (
            <div className="av-row">
              <StockBadge available={current.availableQty} status={current.stockStatus} restockInDays={current.restockInDays} />
              {current.casePairs && <span className="av-small">{t("pdp.case", { n: current.casePairs })}</span>}
            </div>
          )}
          <SizeFinder />
          <div className="av-stack">
            {current && current.availableQty > 0 && (
              <div className="av-row"><QuantityStepper value={Math.min(quantity, current.availableQty)} max={Math.min(MAX_PER_LINE, current.availableQty)} label={t("pdp.quantity")} onChange={setQuantity} /></div>
            )}
            <Button size="lg" block disabled={!current || current.availableQty <= 0} onClick={() => {
              if (!current) return;
              cart.add({ sku: current.sku, productSlug: product.slug, productName: product.name, variantLabel: label(current),
                colorHex: current.colorHex, imageUrl: product.images[0]?.url ?? null, unitPrice: current.price }, Math.min(quantity, current.availableQty), current.availableQty);
              toast(t("pdp.added"));
            }}>{current && current.availableQty <= 0 ? t("pdp.soldOut") : t("pdp.add")}</Button>
            {cart.count > 0 && <p className="av-small"><Link to="/cart">{t("pdp.viewBag", { n: cart.count })}</Link></p>}
          </div>

          {current && current.availableQty > 0 && (
            <NegotiationChat sku={current.sku} quantity={Math.min(quantity, current.availableQty)} onAccept={(offer, offeredQty) => {
              const qty = Math.min(offeredQty, current.availableQty);
              cart.add({ sku: current.sku, productSlug: product.slug, productName: product.name, variantLabel: label(current),
                colorHex: current.colorHex, imageUrl: product.images[0]?.url ?? null, unitPrice: offer.offerPrice, negotiationSessionId: offer.sessionId }, qty, current.availableQty);
              toast(`Added at ${offer.validatedDiscountPct}% off`);
            }} />
          )}

          <dl className="av-specs">
            {details.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="av-eyebrow">{t(k)}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      </div>
    </div>
  );
}

function Chip2({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return <button type="button" className="av-chip" aria-pressed={pressed} onClick={onClick}>{label}</button>;
}
