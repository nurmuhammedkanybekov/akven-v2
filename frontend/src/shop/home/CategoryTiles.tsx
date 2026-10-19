import { Link } from "react-router-dom";
import { GiftBoxScene } from "../../components/GiftBoxScene";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const CARDS: Array<{ to: string; key: string; socks?: SockSpec[] }> = [
  { to: "/men", key: "him", socks: [
    { cut: "crew", main: C.charcoal, accent: C.charcoal, pattern: "rib" },
    { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
    { cut: "crew", main: C.black, accent: C.black, pattern: "rib" }] },
  { to: "/women", key: "her", socks: [
    { cut: "crew", main: C.cream, accent: C.cream, pattern: "rib", heel: false },
    { cut: "ankle", main: C.blush, accent: C.blush, pattern: "rib" },
    { cut: "mid-long", main: C.oat, accent: C.oat, pattern: "cable", heel: false }] },
  { to: "/kids", key: "kids", socks: [
    { cut: "crew", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
    { cut: "ankle", main: C.lemon, accent: C.coral, pattern: "dots" },
    { cut: "crew", main: C.sky, accent: C.mustard, pattern: "multistripe", second: C.coral }] },
  { to: "/gifts", key: "gifts" },
];

/**
 * Shop by who it is for, as four editorial cards: a still life of that shelf's socks on a soft backdrop in afternoon
 * light (dark classics for him, creams and blush for her, bright colours for children, the gift box for gifts), the
 * name underneath and an arrow. The picture grows slowly on hover and the arrow moves on. Drawn, until photographs.
 */
export function CategoryTiles() {
  const { t } = useT();
  return (
    <section className="av-block" aria-labelledby="cats-title" data-reveal>
      <div className="av-container av-stack">
        <span className="av-eyebrow">{t("cats.eyebrow")}</span>
        <h2 id="cats-title">{t("cats2.title")}</h2>
        <div className="av-cats2">
          {CARDS.map((card) => (
            <Link key={card.key} to={card.to} className={`av-cat2 av-cat2--${card.key}`}>
              <span className="av-cat2__pic" aria-hidden="true">
                <span className="av-cat2__light" />
                {card.socks
                  ? card.socks.map((s, i) => <span key={i} className="av-cat2__sock" style={{ "--i": i } as React.CSSProperties}><SockArt {...s} /></span>)
                  : <span className="av-cat2__box"><GiftBoxScene box="NAVY" ribbon="GOLD" open={false} to={null} socks={[]} /></span>}
              </span>
              <span className="av-cat2__name">{t(`cats2.${card.key}` as MessageKey)}</span>
              <span className="av-cat2__go">{t(`cats2.${card.key}Go` as MessageKey)} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
