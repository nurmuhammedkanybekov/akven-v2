import { Link } from "react-router-dom";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const TILES: Array<{ to: string; key: string; tint: number; socks: SockSpec[] }> = [
  { to: "/men", key: "men", tint: 2, socks: [{ cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream }, { cut: "mid-long", main: C.charcoal, accent: C.grey }] },
  { to: "/women", key: "women", tint: 4, socks: [{ cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" }, { cut: "crew", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold }] },
  { to: "/kids", key: "kids", tint: 5, socks: [{ cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white }, { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream }] },
  { to: "/bundles", key: "bundles", tint: 1, socks: [{ cut: "crew", main: C.red, accent: C.white, pattern: "multistripe", second: C.gold }, { cut: "crew", main: C.black, accent: C.gold }] },
];

/**
 * Shop by who it is for, the way Bombas opens its shelves: four big tiles with the socks drawn on them. The whole tile
 * is the link; the socks lift a little on hover.
 */
export function CategoryTiles() {
  const { t } = useT();
  return (
    <section className="av-block" aria-labelledby="cats-title" data-reveal>
      <div className="av-container av-stack">
        <span className="av-eyebrow av-orn">{t("cats.eyebrow")}</span>
        <h2 id="cats-title">{t("cats.title")}</h2>
        <div className="av-cats">
          {TILES.map((tile) => (
            <Link key={tile.key} to={tile.to} className="av-cat" style={{ background: `var(--tint-${tile.tint})` }}>
              <span className="av-cat__socks" aria-hidden="true">
                {tile.socks.map((s, i) => <SockArt key={i} {...s} style={{ transform: `rotate(${i ? 8 : -6}deg)` }} />)}
              </span>
              <span className="av-cat__name">{t(`cats.${tile.key}` as MessageKey)}</span>
              <span className="av-cat__go">{t(`cats.${tile.key}Go` as MessageKey)} →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
