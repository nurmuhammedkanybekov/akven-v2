import { Link } from "react-router-dom";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const TILES: Array<{ to: string; key: string; socks: SockSpec[] }> = [
  { to: "/men", key: "men", socks: [{ cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream }, { cut: "crew", main: C.white, accent: C.black, pattern: "checker" }] },
  { to: "/women", key: "women", socks: [{ cut: "ankle", main: C.ivory, accent: C.red, pattern: "cherries" }, { cut: "crew", main: C.charcoal, accent: C.pink, pattern: "cat", second: C.ivory }] },
  { to: "/kids", key: "kids", socks: [{ cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white }, { cut: "crew", main: C.ivory, accent: C.pink, pattern: "bunny", second: C.ivory }] },
  { to: "/bundles", key: "bundles", socks: [{ cut: "crew", main: C.burgundy, accent: C.gold, pattern: "pinstripe", heel: false }, { cut: "crew", main: C.ivory, accent: C.red, pattern: "shyrdak", second: C.navy }] },
];

/**
 * Shop by who it is for, the way Bombas opens its shelves: four big flat colour tiles with the socks drawn on them.
 * The whole tile is the link; the socks lift a little on hover. The colours are fixed (not themed): dark text on a
 * light block reads the same in both themes.
 */
export function CategoryTiles() {
  const { t } = useT();
  return (
    <section className="av-block" aria-labelledby="cats-title" data-reveal>
      <div className="av-container av-stack">
        <span className="av-eyebrow">{t("cats.eyebrow")}</span>
        <h2 id="cats-title">{t("cats.title")}</h2>
        <div className="av-cats">
          {TILES.map((tile) => (
            <Link key={tile.key} to={tile.to} className={`av-cat av-cat--${tile.key}`}>
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
