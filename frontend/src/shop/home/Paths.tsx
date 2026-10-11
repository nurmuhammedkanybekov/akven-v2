import { Link } from "react-router-dom";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const PATHS: Array<{ key: string; to: string; socks: SockSpec[] }> = [
  { key: "family", to: "/#family", socks: [
    { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
    { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
    { cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
  ] },
  { key: "shops", to: "/wholesale", socks: [
    { cut: "crew", main: C.charcoal, accent: C.grey, pattern: "rib" },
    { cut: "crew", main: C.charcoal, accent: C.grey, pattern: "rib" },
    { cut: "crew", main: C.charcoal, accent: C.grey, pattern: "rib" },
  ] },
  { key: "gifts", to: "/wholesale#gifts", socks: [
    { cut: "crew", main: C.red, accent: C.white, pattern: "snow" },
    { cut: "crew", main: C.cream, accent: C.brick, pattern: "oimo", second: C.gold },
    { cut: "ankle", main: C.black, accent: C.gold, pattern: "sparkle", second: "#ffffff" },
  ] },
];

/**
 * Why the shop is online: three kinds of customers, three reasons. Families order a set for everyone, shops order by
 * the case, companies order gift boxes. Each card is one link.
 */
export function Paths() {
  const { t } = useT();
  return (
    <section className="av-block" aria-labelledby="paths-title" data-reveal>
      <div className="av-container">
        <header className="av-block__head av-paths__head">
          <span className="av-eyebrow av-orn">{t("paths.eyebrow")}</span>
          <h2 id="paths-title">{t("paths.title")}</h2>
        </header>
        <ol className="av-paths">
          {PATHS.map((p, i) => (
            <li key={p.key}>
              <Link to={p.to} className={`av-path av-path--${p.key}`}>
                <span className="av-path__n" aria-hidden="true">0{i + 1}</span>
                <span className="av-path__art" aria-hidden="true">
                  {p.socks.map((s, k) => <SockArt key={k} {...s} style={{ "--k": k } as React.CSSProperties} />)}
                </span>
                <strong className="av-path__title">{t(`paths.${p.key}` as MessageKey)}</strong>
                <span className="av-path__text">{t(`paths.${p.key}S` as MessageKey)}</span>
                <span className="av-path__go">{t(`paths.${p.key}Go` as MessageKey)} <span aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
