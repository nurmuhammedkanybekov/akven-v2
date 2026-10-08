import { Link } from "react-router-dom";
import { listProducts } from "../api/endpoints";
import type { Category } from "../api/types";
import { HornDivider, OimoBand } from "../brand/Ornaments";
import { SOCK_COLOURS as C, SockArt, type SockCut, type SockPattern } from "../brand/SockArt";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import {
  ChatIcon, PinIcon, RulerIcon, SealIcon, SpoolIcon, StackIcon, StoreIcon, TruckIcon,
} from "../components/icons";
import { ProductCard } from "../components/ProductCard";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { CATEGORIES, CATEGORY_PATH } from "../lib/labels";
import { usePricing, useShopInfo } from "../shop/useShopInfo";

/** The socks standing on the hero's shelf: the shop's colourways at every height, until photographs replace them. */
const LINEUP: Array<{ cut: SockCut; main: string; accent: string; pattern: SockPattern }> = [
  { cut: "knee-high", main: C.charcoal, accent: C.grey, pattern: "ribs" },
  { cut: "crew", main: C.navy, accent: C.cream, pattern: "bands" },
  { cut: "no-show", main: C.pink, accent: C.white, pattern: "plain" },
  { cut: "knee-high", main: C.cream, accent: C.brick, pattern: "heart" },
  { cut: "crew", main: C.white, accent: C.brick, pattern: "stripes" },
  { cut: "ankle", main: C.rose, accent: C.white, pattern: "dots" },
  { cut: "crew", main: C.sky, accent: C.gold, pattern: "stripes" },
  { cut: "crew", main: C.black, accent: C.gold, pattern: "bands" },
  { cut: "knee-high", main: C.brown, accent: C.beige, pattern: "ribs" },
];

const TILE_ART: Record<Category, { cut: SockCut; main: string; accent: string; pattern: SockPattern; tint: number }> = {
  MEN: { cut: "crew", main: C.navy, accent: C.cream, pattern: "bands", tint: 1 },
  WOMEN: { cut: "knee-high", main: C.cream, accent: C.brick, pattern: "heart", tint: 3 },
  KIDS: { cut: "crew", main: C.sky, accent: C.gold, pattern: "stripes", tint: 2 },
  BUNDLES: { cut: "mid-long", main: C.beige, accent: C.brick, pattern: "stripes", tint: 4 },
};

const CUTS: SockCut[] = ["no-show", "ankle", "crew", "mid-long", "knee-high"];

export function HomePage() {
  const { t } = useT();
  const pricing = usePricing();
  const info = useShopInfo();
  const featured = useAsync((signal) => listProducts({ pageSize: 8, sort: "newest", inStock: true }, signal), []);
  const min = pricing?.minOrderPairs ?? 1;
  const writeTo = info?.contacts.filter((c) => c.kind === "TELEGRAM" || c.kind === "WHATSAPP" || c.kind === "INSTAGRAM") ?? [];

  return (
    <>
      {/* ---- hero: navy, centred, the socks standing on an oimo shelf ---- */}
      <section className="av-hero" aria-labelledby="hero-title">
        <div className="av-hero__inner">
          <span className="av-eyebrow av-hero__eyebrow">{t("hero.eyebrow")}</span>
          <h1 id="hero-title" className="av-display">{t("hero.title1")}<br /><em>{t("hero.title2")}</em></h1>
          <p className="av-hero__lead">{min > 1 ? t("hero.lead", { n: min }) : t("hero.leadOne")}</p>
          <div className="av-row av-hero__ctas">
            <Button to="/women" variant="accent" size="lg" className="av-btn--shine">{t("hero.women")}</Button>
            <Button to="/men" variant="secondary" size="lg" className="av-btn--onnavy">{t("hero.men")}</Button>
          </div>
        </div>
        <div className="av-lineup" aria-hidden="true">
          {LINEUP.map((s, i) => <SockArt key={i} {...s} style={{ animationDelay: `${0.45 + i * 0.07}s` }} />)}
        </div>
        <OimoBand className="av-hero__shelf" />
        <span className="av-hero__note">{t("hero.photo")}</span>
      </section>

      {/* ---- trust strip ---- */}
      <div className="av-container">
        <ul className="av-trust">
          {([["made", <SpoolIcon key="i" />], ["cert", <SealIcon key="i" />], ["ladder", <StackIcon key="i" />], ["ask", <ChatIcon key="i" />]] as const).map(([k, icon]) => (
            <li key={k}>{icon}<strong>{t(`trust.${k}` as MessageKey)}</strong><span>{t(`trust.${k}S` as MessageKey)}</span></li>
          ))}
        </ul>
      </div>

      {/* ---- categories ---- */}
      <section className="av-block" aria-labelledby="tiles-title" data-reveal>
        <div className="av-container">
          <header className="av-block__head"><span className="av-eyebrow">{t("tiles.eyebrow")}</span><h2 id="tiles-title">{t("tiles.title")}</h2></header>
          <div className="av-cats">
            {CATEGORIES.map((c) => {
              const art = TILE_ART[c];
              return (
                <Link key={c} to={CATEGORY_PATH[c]} className="av-cat">
                  <span className="av-cat__art" style={{ background: `var(--tint-${art.tint})` }}><SockArt {...art} /></span>
                  <strong>{t(`nav.${c.toLowerCase()}` as MessageKey)}</strong>
                  <span className="av-small">{t(`tile.${c}` as MessageKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- heights ---- */}
      <section className="av-block" aria-labelledby="height-title" data-reveal>
        <div className="av-container">
          <header className="av-block__head"><span className="av-eyebrow">{t("height.eyebrow")}</span><h2 id="height-title">{t("height.title")}</h2></header>
          <div className="av-heights">
            {CUTS.map((cut) => (
              <Link key={cut} to={`/shop?cut=${cut}`} className="av-height">
                <SockArt cut={cut} main="var(--tint-2)" accent="var(--accent-ink)" pattern="bands" />
                <span>{t(`cut.${cut}` as MessageKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- the collection ---- */}
      <section className="av-block" aria-labelledby="best-title">
        <div className="av-container">
          <header className="av-block__head av-block__head--row">
            <div><span className="av-eyebrow">{t("best.eyebrow")}</span><h2 id="best-title">{t("best.title")}</h2></div>
            <Button to="/shop" variant="secondary">{t("best.all")}</Button>
          </header>
          {featured.loading && <div className="av-grid-products">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={360} />)}</div>}
          {featured.error && <p className="av-small">{t("best.error")}</p>}
          {featured.data && featured.data.items.length === 0 && <p className="av-lead">{t("best.empty")}</p>}
          {featured.data && featured.data.items.length > 0 && (
            <div className="av-grid-products">
              {featured.data.items.map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={(i % 6) + 1} />)}
            </div>
          )}
        </div>
      </section>

      {/* ---- the price ladder ---- */}
      <section className="av-block" aria-labelledby="ladder-title" data-reveal>
        <div className="av-container">
          <div className="av-ladder">
            <div className="av-stack">
              <span className="av-eyebrow">{t("ladder.eyebrow")}</span>
              <h2 id="ladder-title">{t("ladder.title")}</h2>
              <p className="av-lead">{t("ladder.lead")}</p>
              {min > 1 && <p className="av-small">{t("ladder.minNote", { n: min })}</p>}
              <div className="av-row"><Button to="/shop">{t("ladder.cta")}</Button></div>
            </div>
            <ol className="av-steps" aria-label={t("ladder.title")}>
              <li><span className="av-steps__pairs av-num">{min > 1 ? t("ladder.min", { n: min }) : t("ladder.any")}</span><span className="av-steps__off">{t("ladder.base")}</span></li>
              {(pricing?.tiers ?? []).filter((x) => x.minPairs > min).map((x) => (
                <li key={x.minPairs}>
                  <span className="av-steps__pairs av-num">{t("ladder.min", { n: x.minPairs })}</span>
                  <span className="av-steps__off av-num">{t("ladder.off", { pct: Number(x.discountPct) })}</span>
                </li>
              ))}
              <li className="av-steps__wholesale"><Link to="/wholesale">{t("ladder.wholesale")}</Link></li>
            </ol>
          </div>
        </div>
      </section>

      {/* ---- ask for your price ---- */}
      <section className="av-block" aria-labelledby="ask-title" data-reveal>
        <div className="av-container av-ask">
          <div className="av-stack">
            <span className="av-eyebrow">{t("ask.eyebrow")}</span>
            <h2 id="ask-title">{t("ask.title")}</h2>
            <ol className="av-numbered">
              <li><b>1</b><span>{t("ask.1")}</span></li>
              <li><b>2</b><span>{t("ask.2")}</span></li>
              <li><b>3</b><span>{t("ask.3")}</span></li>
            </ol>
          </div>
          <figure className="av-ticket">
            <figcaption className="av-eyebrow">{t("ask.example")} · Merino Dress Sock · ×10</figcaption>
            <p className="av-ticket__you">“{t("ask.you")}”</p>
            <p className="av-ticket__shop">“{t("ask.shop")}”</p>
            <div className="av-lead-row"><span>{t("ask.asking")}</span><span className="av-lead-row__dots" /><s className="av-num">$80.00</s></div>
            <div className="av-lead-row"><strong>{t("ask.yours")}</strong><span className="av-lead-row__dots" /><span className="av-ticket__price av-num">$62.40</span></div>
            <span className="av-small">{t("ask.checked")}</span>
          </figure>
        </div>
      </section>

      {/* ---- quality: the certificate ---- */}
      <section className="av-block" aria-labelledby="quality-title" data-reveal>
        <div className="av-container">
          <div className="av-deep av-quality">
            <div className="av-quality__photo">
              <div className="av-cert" aria-hidden="true">
                <SealIcon /><i /><i className="s" /><i /><i /><i className="s" />
              </div>
              <span className="av-photonote">{t("quality.photo")}</span>
            </div>
            <div className="av-stack">
              <span className="av-eyebrow">{t("quality.eyebrow")}</span>
              <h2 id="quality-title">{t("quality.title")}</h2>
              <p>{t("quality.lead")}</p>
              <dl className="av-facts">
                {(["factory", "cert", "issued", "materials"] as const).map((k) => (
                  <div key={k}><dt>{t(`quality.${k}` as MessageKey)}</dt><dd className="av-placeholder">{t(`quality.${k}V` as MessageKey)}</dd></div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ---- the family's story ---- */}
      <div className="av-container"><HornDivider /></div>
      <section className="av-block av-block--tight" aria-labelledby="story-title" data-reveal>
        <div className="av-container av-story">
          <div className="av-story__photo" style={{ background: "var(--tint-1)" }}>
            <div className="av-story__socks" aria-hidden="true">
              {LINEUP.slice(1, 6).map((s, i) => <SockArt key={i} {...s} style={{ transform: `rotate(${(i - 2) * 5}deg)` }} />)}
            </div>
            <span className="av-photonote">{t("story.photo")}</span>
          </div>
          <div className="av-stack">
            <span className="av-eyebrow">{t("story.eyebrow")}</span>
            <h2 id="story-title">{t("story.title")}</h2>
            <p className="av-lead">{t("story.lead")}</p>
            <dl className="av-facts av-facts--light">
              <div><dt>{t("story.started")}</dt><dd className="av-placeholder">{t("story.startedV")}</dd></div>
              <div><dt>{t("story.made")}</dt><dd>{t("story.madeV")}</dd></div>
              <div><dt>{t("story.sold")}</dt><dd>{t("story.soldV")}</dd></div>
              <div><dt>{t("story.run")}</dt><dd>{t("story.runV")}</dd></div>
            </dl>
            <div className="av-row"><Button to="/visit" variant="secondary">{t("story.cta")}</Button></div>
          </div>
        </div>
      </section>

      {/* ---- help ---- */}
      <section className="av-block av-block--tight" aria-label={t("foot.help")} data-reveal>
        <div className="av-container">
          <ul className="av-help">
            <li><Link to="/visit#pickup"><TruckIcon /><strong>{t("help.delivery")}</strong><span>{t("help.deliveryS")}</span></Link></li>
            <li><Link to="/sizes"><RulerIcon /><strong>{t("help.sizes")}</strong><span>{t("help.sizesS")}</span></Link></li>
            <li><Link to="/visit"><StoreIcon /><strong>{t("help.visit")}</strong><span>{t("help.visitS")}</span></Link></li>
            <li><Link to="/visit#contact"><PinIcon /><strong>{t("help.contact")}</strong><span>{t("help.contactS")}</span></Link></li>
          </ul>
        </div>
      </section>

      {/* ---- wholesale ---- */}
      <section id="wholesale" className="av-block" aria-labelledby="whole-title" data-reveal>
        <div className="av-container av-whole">
          <div className="av-stack">
            <span className="av-eyebrow">{t("whole.eyebrow")}</span>
            <h2 id="whole-title">{t("whole.title")}</h2>
            <p className="av-lead">{t("whole.lead")}</p>
          </div>
          <div className="av-whole__actions">
            <Button to="/wholesale" size="lg">{t("whole.cta")}</Button>
            {writeTo.map((c) => (
              <Button key={c.id} href={c.url} variant="secondary" target="_blank" rel="noopener noreferrer">{c.label ?? c.kind}</Button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
