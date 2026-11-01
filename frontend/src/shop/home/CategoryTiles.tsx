import { Link } from "react-router-dom";
import { Clothesline } from "../../components/Clothesline";
import { GiftBoxScene } from "../../components/GiftBoxScene";
import { SOCK_COLOURS as C, type SockSpec } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const FABRIC: Record<string, string> = { him: "knit", her: "rib", kids: "dots", gifts: "paper" };

const CARDS: Array<{ to: string; key: string; socks?: SockSpec[] }> = [
  { to: "/men", key: "him", socks: [
    { cut: "crew", main: C.charcoal, accent: C.charcoal, pattern: "rib" },
    { cut: "mid-long", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
    { cut: "crew", main: C.black, accent: C.black, pattern: "rib" }] },
  { to: "/women", key: "her", socks: [
    { cut: "crew", main: C.cream, accent: C.cream, pattern: "rib", heel: false },
    { cut: "knee-high", main: C.blush, accent: C.blush, pattern: "rib", heel: false },
    { cut: "mid-long", main: C.oat, accent: C.oat, pattern: "cable", heel: false }] },
  { to: "/kids", key: "kids", socks: [
    { cut: "crew", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
    { cut: "mid-long", main: C.lemon, accent: C.coral, pattern: "dots" },
    { cut: "crew", main: C.sky, accent: C.mustard, pattern: "multistripe", second: C.coral }] },
  { to: "/gifts", key: "gifts" },
];

/**
 * Shop by who it is for: each shelf is a washing line on its own fabric (a knitted wall for him, ribbed blush for her,
 * spots for children, wrapping paper for gifts) with three of its socks pegged on it. Hovering or focusing a card sets
 * the socks swinging from their pegs; the gift box lifts its lid. Drawn, until photographs.
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
            <Link key={card.key} to={card.to} className={`av-cat2 av-cat2--${card.key} av-swing-on`}>
              <span className={`av-cat2__pic av-fabric--${FABRIC[card.key]}`} aria-hidden="true">
                {card.socks
                  ? <Clothesline socks={card.socks} at={[0.11, 0.41, 0.71]} width={0.36} sag={0.06} />
                  : <span className="av-cat2__box"><GiftBoxScene box="NAVY" ribbon="GOLD" open={false} to={null} socks={[]} /></span>}
                <span className="av-kraft av-cat2__tag">{t(`cats2.${card.key}Tag` as MessageKey)}</span>
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
