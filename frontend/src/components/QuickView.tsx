import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProduct } from "../api/endpoints";
import type { ProductDetail } from "../api/types";
import { MAX_PER_LINE, useCart } from "../cart/CartContext";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import { useVariantChoice } from "../shop/useVariantChoice";
import { Skeleton } from "./Alert";
import { StockBadge } from "./Badge";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { CheckIcon, CloseIcon, HeartIcon } from "./icons";
import { Price } from "./Price";
import { NotifyMe } from "./NotifyMe";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";
import { flyToBag } from "../lib/flyToBag";
import { productMeta } from "../lib/labels";
import type { MessageKey } from "../i18n/en";
import { useSaved } from "../shop/useSaved";
import { usePricing } from "../shop/useShopInfo";

/**
 * Quick view, as Bombas does it: look at a sock, choose colour, size, pack and how many, and put it in the bag without
 * leaving the shelf; save it, or try it on in the fitting room. The full page (details, size help, the price chat) is
 * one link away. It rises in with its parts one after another, and the button says "added" before the bag slides in.
 */
export function QuickView({ slug, name, open, onClose }: { slug: string; name: string; open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <Dialog open={open} title={t("qv.title", { name })} hideTitle onClose={onClose} className="av-qv">
      <button type="button" className="av-qv__close" aria-label={t("qv.close")} onClick={onClose}><CloseIcon /></button>
      {open && <QuickViewBody slug={slug} onDone={onClose} />}
    </Dialog>
  );
}

function QuickViewBody({ slug, onDone }: { slug: string; onDone: () => void }) {
  const { t } = useT();
  const product = useAsync(() => getProduct(slug), [slug]);
  if (product.loading && !product.data) return <div className="av-qv__grid"><Skeleton height={320} /><Skeleton height={320} /></div>;
  if (product.error || !product.data) return <p>{t("pdp.loadError")}</p>;
  return <Chooser product={product.data} onDone={onDone} />;
}

function Chooser({ product, onDone }: { product: ProductDetail; onDone: () => void }) {
  const { t } = useT();
  const cart = useCart();
  const pricing = usePricing();
  const saved = useSaved();
  const { current, colors, sizes, packs, pick, label, images } = useVariantChoice(product);
  const [image, setImage] = useState(0);
  // A new colour starts on its first picture.
  useEffect(() => { setImage(0); }, [current?.color]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const available = current?.availableQty ?? 0;
  const minPrice = product.variants.length ? Math.min(...product.variants.map((v) => v.price)) : null;
  const isSaved = saved.has(product.slug);
  const canTry = !!product.cut && product.category !== "BUNDLES";
  const firstStep = pricing?.tiers?.[0];
  const shown = images[Math.min(image, images.length - 1)];

  function add() {
    if (!current || added) return;
    flyToBag(document.querySelector(".av-qv__media img"));
    // The button says "added" for a moment, then the quick view closes and the bag slides in.
    setAdded(true);
    window.setTimeout(() => {
      cart.add({ sku: current.sku, productSlug: product.slug, productName: product.name, variantLabel: label(current),
        colorHex: current.colorHex, imageUrl: images[0]?.url ?? null, unitPrice: current.price }, Math.min(quantity, available), available);
      onDone();
    }, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 650);
  }

  return (
    <div className="av-qv__grid">
      <div className="av-qv__gallery">
        <div className="av-qv__media">
          <ProductImage key={shown?.url} image={shown} eager />
          {canTry && (
            <Link className="av-pdp__try av-qv__try" to={`/products/${product.slug}?try=1${current?.colorHex ? `&colour=${encodeURIComponent(current.colorHex.replace("#", ""))}` : ""}`} onClick={onDone}>
              <span className="av-pdp__tryicon" aria-hidden="true" />{t("fr.try")}
            </Link>
          )}
        </div>
        {images.length > 1 && (
          <div className="av-qv__thumbs" role="group" aria-label={t("pdp.photos")}>
            {images.slice(0, 6).map((img, i) => (
              <button key={img.url} type="button" aria-pressed={i === image} aria-label={t("qv.photo", { n: i + 1 })} onClick={() => setImage(i)}>
                <img src={img.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="av-qv__info">
        <span className="av-qv__meta">{productMeta(product, t(`nav.${product.category.toLowerCase()}` as MessageKey))}</span>
        <div className="av-qv__titlerow">
          <h3 className="av-qv__name">{product.name}</h3>
          <button type="button" className={`av-save av-save--inline${isSaved ? " is-on" : ""}`} aria-pressed={isSaved}
            aria-label={t(isSaved ? "save.remove" : "save.add", { name: product.name })}
            onClick={() => saved.toggle({ slug: product.slug, name: product.name, image: product.images[0]?.url ?? null, price: minPrice })}>
            <HeartIcon />
          </button>
        </div>
        {current ? <Price amount={current.price} large /> : <Price amount={null} />}
        {product.description && <p className="av-small av-qv__desc">{product.description}</p>}
        {current && colors.some((c) => c.color) && (
          <fieldset className="av-option">
            <legend className="av-label">{t("pdp.colour")}: <strong>{current.color}</strong> <span className="av-muted">· {t("card.colours", { n: colors.length })}</span></legend>
            <div className="av-row av-qv__swatches">
              {colors.map((c, i) => (
                <button key={`${c.color}${c.colorHex}`} type="button" className="av-colorchoice" aria-pressed={c.color === current.color && c.colorHex === current.colorHex}
                        aria-label={c.color ?? t("a.color")} title={c.color ?? ""} style={{ "--i": i } as React.CSSProperties} onClick={() => pick({ color: c.color, colorHex: c.colorHex })}>
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
              {sizes.map((s) => <button key={s} type="button" className="av-chip" aria-pressed={current?.size === s} onClick={() => pick({ size: s })}>{s}</button>)}
            </div>
          </fieldset>
        )}
        {packs.length > 1 && (
          <fieldset className="av-option">
            <legend className="av-label">{t("pdp.pack")}</legend>
            <div className="av-row">
              {packs.map((n) => <button key={n} type="button" className="av-chip" aria-pressed={current?.packSize === n} onClick={() => pick({ packSize: n })}>{n === 1 ? t("pdp.pairs1") : t("pdp.pairsN", { n })}</button>)}
            </div>
          </fieldset>
        )}
        {current && <StockBadge available={available} status={current.stockStatus} restockInDays={current.restockInDays} />}
        <div className="av-qv__buy">
          {available > 0 && <QuantityStepper value={Math.min(quantity, available)} max={Math.min(MAX_PER_LINE, available)} label={t("pdp.quantity")} onChange={setQuantity} />}
          <Button block disabled={!current || available <= 0} onClick={add} className={added ? "is-added" : undefined}>
            {added ? <><CheckIcon />{t("pdp.added")}</> : available <= 0 ? t("pdp.soldOut") : t("pdp.add")}
          </Button>
        </div>
        {current && available <= 0 && <NotifyMe sku={current.sku} />}
        {firstStep && <p className="av-qv__hint">{t("shop.promo", { n: firstStep.minPairs, pct: Number(firstStep.discountPct) })}</p>}
        <Link className="av-qv__more" to={`/products/${product.slug}`} onClick={onDone}>{t("qv.details")} →</Link>
      </div>
    </div>
  );
}
