import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MAX_PER_LINE, useCart } from "../cart/CartContext";
import { QuantityStepper } from "../components/QuantityStepper";
import { useToast } from "../components/Toast";
import { getProduct, listProducts } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { ProductDetail } from "../api/types";
import { Skeleton } from "../components/Alert";
import { StockBadge } from "../components/Badge";
import { Button } from "../components/Button";
import { NegotiationChat } from "../components/NegotiationChat";
import { Price } from "../components/Price";
import { SizeFinder } from "../components/SizeFinder";
import { NotifyMe } from "../components/NotifyMe";
import { ProductImage } from "../components/ProductImage";
import { ProductCard } from "../components/ProductCard";
import { HeartIcon, PinIcon, StackIcon, TruckIcon } from "../components/icons";
import { useSaved } from "../shop/useSaved";
import { rememberViewed, useViewed } from "../shop/useViewed";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { usePricing, useShopInfo } from "../shop/useShopInfo";
import { useVariantChoice } from "../shop/useVariantChoice";
import { CATEGORY_PATH, productMeta } from "../lib/labels";
import { NotFoundPage } from "./NotFound";
import { flyToBag } from "../lib/flyToBag";
import { categoryFor, useFamily } from "../shop/family";
import { openStatus, weekdayNames } from "../lib/hours";

export function ProductPage() {
  const { slug = "" } = useParams();
  const product = useAsync(() => getProduct(slug), [slug]);
  if (product.loading && !product.data) return <div className="av-container av-page"><Skeleton height={520} /></div>;
  if (product.error instanceof ApiError && product.error.status === 404) return <NotFoundPage kind="product" />;
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
  const saved = useSaved();
  const isSaved = saved.has(product.slug);
  usePageTitle(product.name);
  const minPrice = product.variants.length ? Math.min(...product.variants.map((v) => v.price)) : null;
  useEffect(() => { rememberViewed({ slug: product.slug, name: product.name, image: product.images[0]?.url ?? null, price: minPrice }); }, [product.slug, product.name, product.images, minPrice]);
  const variants = product.variants;
  const { current, colors, sizes, packs, pick, label, images } = useVariantChoice(product);
  const [imageIndex, setImageIndex] = useState(0);
  // A new colour starts on its first picture.
  useEffect(() => { setImageIndex(0); }, [current?.color]);
  const [quantity, setQuantity] = useState(1);
  const cart = useCart();
  const toast = useToast();

  const image = images[Math.min(imageIndex, images.length - 1)];
  const details: Array<[MessageKey, string | null]> = [["pdp.fabric", product.fabricComposition], ["pdp.quality", product.quality], ["pdp.madeIn", product.origin], ["pdp.care", product.care]];
  const steps = pricing?.tiers ?? [];

  return (
    <div className="av-container av-page">
      <nav className="av-crumbs" aria-label={t("pdp.crumbs")}>
        <Link to={CATEGORY_PATH[product.category]}>{t(`nav.${product.category.toLowerCase()}` as MessageKey)}</Link>
        {product.section && <><span aria-hidden="true">/</span><Link to={`${CATEGORY_PATH[product.category]}?section=${product.section.slug}`}>{product.section.name}</Link></>}
      </nav>
      <div className="av-pdp">
        <div className="av-pdp__gallery">
          <div className="av-pdp__main"><ProductImage key={image?.url} image={image} eager /></div>
          {images.length > 1 && (
            <div className="av-pdp__thumbs" role="group" aria-label={t("pdp.photos")}>
              {images.map((img, i) => (
                <button key={img.url} type="button" className="av-pdp__thumb" aria-pressed={i === imageIndex} aria-label={t("pdp.photoN", { n: i + 1, alt: img.alt })} onClick={() => setImageIndex(i)}>
                  <img src={img.url} alt="" width={96} height={120} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="av-pdp__info">
          <span className="av-eyebrow">{productMeta(product, t(`nav.${product.category.toLowerCase()}` as MessageKey))}</span>
          <div className="av-pdp__titlerow">
            <h1 className="av-pdp__title">{product.name}</h1>
            <button type="button" className={`av-save av-save--inline${isSaved ? " is-on" : ""}`} aria-pressed={isSaved}
              aria-label={t(isSaved ? "save.remove" : "save.add", { name: product.name })}
              onClick={() => saved.toggle({ slug: product.slug, name: product.name, image: product.images[0]?.url ?? null, price: minPrice })}>
              <HeartIcon />
            </button>
          </div>
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
              <legend className="av-label">{t("pdp.colour")}: <strong>{current.color ?? t("pdp.standard")}</strong></legend>
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
          <FamilyFits category={product.category} />
          <SizeFinder />
          <div className="av-stack">
            {current && current.availableQty > 0 && (
              <div className="av-row"><QuantityStepper value={Math.min(quantity, current.availableQty)} max={Math.min(MAX_PER_LINE, current.availableQty)} label={t("pdp.quantity")} onChange={setQuantity} /></div>
            )}
            <Button size="lg" block disabled={!current || current.availableQty <= 0} onClick={() => {
              if (!current) return;
              flyToBag(document.querySelector(".av-pdp__main img"));
              cart.add({ sku: current.sku, productSlug: product.slug, productName: product.name, variantLabel: label(current),
                colorHex: current.colorHex, imageUrl: images[0]?.url ?? null, unitPrice: current.price }, Math.min(quantity, current.availableQty), current.availableQty);
              toast(t("pdp.added"));
            }}>{current && current.availableQty <= 0 ? t("pdp.soldOut") : t("pdp.add")}</Button>
            {current && current.availableQty <= 0 && <NotifyMe sku={current.sku} />}
            {cart.count > 0 && <p className="av-small"><Link to="/cart">{t("pdp.viewBag", { n: cart.count })}</Link></p>}
          </div>
          <ul className="av-promises">
            <li><PinIcon /><span>{t("pdp.p1")} <PickupWhen /></span></li>
            <li><TruckIcon /><span>{t("pdp.p2")}</span></li>
            <li><StackIcon /><span>{t("pdp.p3")}</span></li>
          </ul>

          {current && current.availableQty > 0 && (
            <NegotiationChat sku={current.sku} quantity={Math.min(quantity, current.availableQty)} onAccept={(offer, offeredQty) => {
              const qty = Math.min(offeredQty, current.availableQty);
              cart.add({ sku: current.sku, productSlug: product.slug, productName: product.name, variantLabel: label(current),
                colorHex: current.colorHex, imageUrl: images[0]?.url ?? null, unitPrice: offer.offerPrice, negotiationSessionId: offer.sessionId }, qty, current.availableQty);
              toast(t("pdp.addedAt", { pct: offer.validatedDiscountPct }));
            }} />
          )}

          <div className="av-accordion">
            <details open>
              <summary>{t("pdp.details")}</summary>
              <dl className="av-specs">
                {details.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="av-eyebrow">{t(k)}</dt><dd>{v}</dd></div>)}
              </dl>
            </details>
            <details>
              <summary>{t("pdp.shipping")}</summary>
              <p>{t("visit.pickup2")} {t("visit.pickup3")}</p>
              <p>{t("visit.delivery")}</p>
            </details>
            <details>
              <summary>{t("pdp.collections")}</summary>
              <p>{t("box.lead")}</p>
            </details>
          </div>
        </div>
      </div>
      <MoreLikeThis product={product} />
      <RecentlyViewed current={product.slug} />
    </div>
  );
}

/** Who in the signed-in customer's saved family this shelf is for, so the right size is picked without looking it up. */
function FamilyFits({ category }: { category: ProductDetail["category"] }) {
  const { t } = useT();
  const { members } = useFamily();
  const fits = (members ?? []).filter((m) => categoryFor(m) === category);
  if (fits.length === 0) return null;
  const names = fits.map((m) => `${m.name || t(`family.${m.role}` as MessageKey)} (${m.shoeSize})`).join(", ");
  return <p className="av-fits"><span aria-hidden="true">♥</span> {t("pdp.fits", { names })}</p>;
}

/** When an order could be collected: today while the stall is open, otherwise when it opens next. */
function PickupWhen() {
  const { t, lang } = useT();
  const point = useShopInfo()?.pickupPoints[0];
  if (!point) return null;
  const s = openStatus(point);
  if (s.kind === "open") return <strong className="av-pickupwhen">{t("pdp.collectToday", { time: s.closes })}</strong>;
  if (s.kind === "closed") {
    const when = s.inDays === 0 ? t("pdp.today") : s.inDays === 1 ? t("pdp.tomorrow") : weekdayNames(lang)[s.day];
    return <strong className="av-pickupwhen">{t("pdp.collectFrom", { when, time: s.opens })}</strong>;
  }
  return null;
}

/** More from the same shelf, so a family can fill the set without going back to the catalogue. */
function MoreLikeThis({ product }: { product: ProductDetail }) {
  const { t } = useT();
  const more = useAsync((signal) => listProducts({ category: product.category, pageSize: 5, inStock: true }, signal), [product.category]);
  const items = (more.data?.items ?? []).filter((p) => p.slug !== product.slug).slice(0, 4);
  if (items.length === 0) return null;
  return (
    <section className="av-block" aria-labelledby="more-title">
      <header className="av-block__head"><span className="av-eyebrow">{t("ladder.eyebrow")}</span><h2 id="more-title">{t("pdp.more")}</h2></header>
      <div className="av-grid-products">{items.map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={((i + 3) % 6) + 1} />)}</div>
    </section>
  );
}

/** What this visitor looked at before, kept in this browser only. */
function RecentlyViewed({ current }: { current: string }) {
  const { t } = useT();
  const items = useViewed().filter((v) => v.slug !== current).slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section className="av-block" aria-labelledby="recent-title">
      <h2 id="recent-title" className="av-recent__title">{t("pdp.recent")}</h2>
      <ul className="av-recent">
        {items.map((v, i) => (
          <li key={v.slug}>
            <Link to={`/products/${v.slug}`}>
              <span className="av-recent__img" style={{ background: `var(--tint-${(i % 6) + 1})` }}>{v.image && <img src={v.image} alt="" loading="lazy" width={160} height={200} />}</span>
              <span className="av-recent__name">{v.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Chip2({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return <button type="button" className="av-chip" aria-pressed={pressed} onClick={onClick}>{label}</button>;
}
