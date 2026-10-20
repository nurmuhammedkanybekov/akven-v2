import { useRef, useState } from "react";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";

const SOCK: SockSpec = { cut: "crew", main: C.oat, accent: C.oat, pattern: "cable", heel: false };
const ZOOM = 3.2;

/**
 * Up close: a sock and a magnifying glass that follows the pointer (or a finger), showing the knit three times larger,
 * next to what to look for in a good sock. The glass is decoration; the facts are the text beside it.
 */
export function UpClose() {
  const { t } = useT();
  const box = useRef<HTMLDivElement>(null);
  const [glass, setGlass] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  function move(e: React.PointerEvent) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setGlass({ x: Math.min(r.width, Math.max(0, e.clientX - r.left)), y: Math.min(r.height, Math.max(0, e.clientY - r.top)), w: r.width, h: r.height });
  }

  const facts: Array<[string, string]> = [[t("close.f1"), t("close.f1s")], [t("close.f2"), t("close.f2s")], [t("close.f3"), t("close.f3s")], [t("close.f4"), t("close.f4s")]];
  return (
    <section className="av-block" aria-labelledby="close-title" data-reveal>
      <div className="av-container av-close">
        <div ref={box} className="av-close__stage" aria-hidden="true" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setGlass(null)}>
          <SockArt {...SOCK} className="av-close__sock" />
          <span className="av-close__hint">{t("close.hint")}</span>
          {glass && (
            <span className="av-close__glass" style={{ left: glass.x, top: glass.y }}>
              <span className="av-close__zoom" style={{ width: glass.w, height: glass.h, transform: `translate(${-glass.x * ZOOM + 90}px, ${-glass.y * ZOOM + 90}px) scale(${ZOOM})` }}>
                <SockArt {...SOCK} className="av-close__sock" />
              </span>
            </span>
          )}
        </div>
        <div className="av-stack av-close__copy">
          <span className="av-eyebrow">{t("close.eyebrow")}</span>
          <h2 id="close-title">{t("close.title")}</h2>
          <ul className="av-close__facts">
            {facts.map(([title, text], i) => <li key={i} style={{ "--i": i } as React.CSSProperties}><strong>{title}</strong><span>{text}</span></li>)}
          </ul>
          <Button to="/shop?section=classic" variant="secondary">{t("close.cta")}</Button>
        </div>
      </div>
    </section>
  );
}
