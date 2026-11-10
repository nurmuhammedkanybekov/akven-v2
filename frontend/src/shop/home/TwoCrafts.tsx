import { HORN_LINE } from "../../brand/Ornaments";
import { SOCK_COLOURS as C, SockArt } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";

/** Bojagi: a Korean wrapping cloth sewn from patches, in the five traditional colours (obangsaek) and pale ramie. */
const PATCHES: Array<[number, number, number, number, string]> = [
  [0, 0, 70, 46, "#2f4f8a"], [70, 0, 58, 30, "#efe8da"], [128, 0, 72, 58, "#b8323a"],
  [70, 30, 58, 50, "#e1b742"], [0, 46, 40, 64, "#e9c7c0"], [40, 46, 30, 64, "#23211d"],
  [128, 58, 72, 34, "#efe8da"], [70, 80, 58, 30, "#cfd8c4"], [128, 92, 40, 62, "#2f4f8a"],
  [168, 92, 32, 62, "#e1b742"], [0, 110, 56, 90, "#efe8da"], [56, 110, 72, 44, "#b8323a"],
  [56, 154, 50, 46, "#e9c7c0"], [106, 154, 94, 46, "#efe8da"],
];

/**
 * Korea and Kyrgyzstan: Korea wraps gifts in bojagi (cloth sewn from patches), Kyrgyzstan lays shyrdak (felt cut into
 * ram's horns). Between them the route a pair travels, about 4,400 km from the mills to the stall, which a sock flies
 * along as the section arrives; the patches settle in one by one and the horns are drawn. And one word in both
 * languages: 양말 and байпак both mean socks.
 */
export function TwoCrafts({ story = false }: { story?: boolean }) {
  const { t } = useT();
  return (
    <section className="av-block av-crafts" aria-labelledby="crafts-title" data-reveal>
      <div className="av-container av-crafts__inner">
        <header className="av-crafts__head">
          <span className="av-hand">{t("crafts.eyebrow")}</span>
          <h2 id="crafts-title">{t("crafts.title")}</h2>
          <p className="av-lead">{t("crafts.lead")}</p>
        </header>
        <div className="av-crafts__row">
          <figure className="av-crafts__cloth">
            <svg viewBox="0 0 200 200" aria-hidden="true" className="av-crafts__bojagi">
              {PATCHES.map(([x, y, w, h, fill], i) => (
                <rect key={i} x={x} y={y} width={w} height={h} fill={fill} style={{ "--i": i } as React.CSSProperties} />
              ))}
              <path className="av-crafts__seams" d={PATCHES.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}Z`).join("")} />
            </svg>
            <figcaption><span lang="ko" className="av-crafts__word">보자기</span>{t("crafts.bojagi")}</figcaption>
          </figure>
          <div className="av-crafts__route" aria-hidden="true">
            <span className="av-crafts__city">{t("crafts.from")}</span>
            <div className="av-crafts__track">
              <svg viewBox="0 0 300 60" preserveAspectRatio="none"><path d="M4 52C80 4 220 4 296 52" /></svg>
              <span className="av-crafts__flyer"><span><SockArt cut="crew" main={C.navy} accent={C.gold} pattern="oimo" second={C.cream} /></span></span>
            </div>
            <span className="av-crafts__city">{t("crafts.to")}</span>
            <span className="av-crafts__km">{t("crafts.km")}</span>
          </div>
          <figure className="av-crafts__cloth">
            <svg viewBox="0 0 200 200" aria-hidden="true" className="av-crafts__shyrdak">
              <rect width="200" height="200" fill="#8e2a2a" />
              <rect x="10" y="10" width="180" height="180" fill="none" stroke="#efe2c4" strokeWidth="5" />
              <rect x="20" y="20" width="160" height="160" fill="none" stroke="#efe2c4" strokeWidth="1.5" strokeDasharray="4 5" />
              {[0, 90, 180, 270].map((r, i) => (
                <g key={r} transform={`translate(100 100) rotate(${r}) translate(0 -9) scale(0.8) translate(-47 -1)`} style={{ "--i": i } as React.CSSProperties}>
                  <path className="av-crafts__horn" d={HORN_LINE} pathLength={1} />
                </g>
              ))}
              <path d="M100 86L114 100L100 114L86 100Z" fill="#efe2c4" />
            </svg>
            <figcaption><span lang="ky" className="av-crafts__word">шырдак</span>{t("crafts.shyrdak")}</figcaption>
          </figure>
        </div>
        <p className="av-crafts__socks">
          <span lang="ko">양말</span> <span className="av-muted">(yangmal)</span> · <span lang="ky">байпак</span> <span className="av-muted">(baypak)</span> — {t("crafts.socks")}
        </p>
        {!story && <Button to="/story" variant="secondary">{t("crafts.cta")}</Button>}
      </div>
    </section>
  );
}
