import { useState } from "react";
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
import { CloseIcon } from "./icons";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";
import { useToast } from "./Toast";

/**
 * Quick view, as Bombas does it: look at a sock, choose colour, size and how many, and put it in the bag without
 * leaving the shelf. The full page (details, size help, the price chat) is one link away.
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
  const toast = useToast();
  const { current, colors, sizes, pick, label } = useVariantChoice(product);
  const [image, setImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const available = current?.availableQty ?? 0;

  function add() {
    if (!current) return;
    cart.add({ sku: current.sku, productSlug: product.slug, productName: product.name, variantLabel: label(current),
      colorHex: current.colorHex, imageUrl: product.images[0]?.url ?? null, unitPrice: current.price }, Math.min(quantity, available), available);
    toast(t("pdp.added"));
    onDone();
  }

  return (
    <div className="av-qv__grid">
      <div className="av-qv__media">
        <ProductImage image={product.images[image]} eager />
        {product.images.length > 1 && (
          <div className="av-qv__dots" role="group" aria-label={t("pdp.photos")}>
            {product.images.map((img, i) => (
              <button key={img.url} type="button" aria-pressed={i === image} aria-label={t("qv.photo", { n: i + 1 })} onClick={() => setImage(i)} />
            ))}
          </div>
        )}
      </div>
      <div className="av-qv__info">
        <h3 className="av-qv__name">{product.name}</h3>
        {current ? <Price amount={current.price} large /> : <Price amount={null} />}
        {product.description && <p className="av-small av-qv__desc">{product.description}</p>}
        {current && colors.some((c) => c.color) && (
          <fieldset className="av-option">
            <legend className="av-label">{t("pdp.colour")}: <strong>{current.color}</strong></legend>
            <div className="av-row">
              {colors.map((c) => (
                <button key={`${c.color}${c.colorHex}`} type="button" className="av-colorchoice" aria-pressed={c.color === current.color && c.colorHex === current.colorHex}
                        aria-label={c.color ?? t("a.color")} title={c.color ?? ""} onClick={() => pick({ color: c.color, colorHex: c.colorHex })}>
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
        {current && <StockBadge available={available} status={current.stockStatus} restockInDays={current.restockInDays} />}
        {available > 0 && <QuantityStepper value={Math.min(quantity, available)} max={Math.min(MAX_PER_LINE, available)} label={t("pdp.quantity")} onChange={setQuantity} />}
        <Button block disabled={!current || available <= 0} onClick={add}>{available <= 0 ? t("pdp.soldOut") : t("pdp.add")}</Button>
        <Link className="av-qv__more" to={`/products/${product.slug}`} onClick={onDone}>{t("qv.details")}</Link>
      </div>
    </div>
  );
}
