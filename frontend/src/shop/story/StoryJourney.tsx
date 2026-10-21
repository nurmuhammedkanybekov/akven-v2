import { SOCK_COLOURS as C, SockArt } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const YEARS: Array<{ when: MessageKey; what: MessageKey }> = [
  { when: "tl.1w", what: "tl.1" },
  { when: "tl.2w", what: "tl.2" },
  { when: "tl.3w", what: "tl.3" },
  { when: "tl.4w", what: "tl.4" },
];

/** Small drawings for the four stops of a pair's journey, in the line style of the shop's icons. */
const ICONS = [
  // knitted: a ball of yarn with a needle
  <svg key="k" viewBox="0 0 48 48"><circle cx="22" cy="26" r="14" /><path d="M10 22c8-4 16-4 24 2M9 30c9-5 18-4 26 1M14 15c4 6 6 14 4 24M24 12c3 8 4 17 1 27" /><path d="M30 8l12 12" /></svg>,
  // chosen: a magnifier over a sock
  <svg key="c" viewBox="0 0 48 48"><path d="M10 8h12v16l8 7a6 6 0 0 1-4 10H15a6 6 0 0 1-6-6V8Z" /><circle cx="33" cy="17" r="8" /><path d="M39 23l6 6" /></svg>,
  // packed: a box with a ribbon
  <svg key="p" viewBox="0 0 48 48"><path d="M8 20h32v20H8zM6 13h36v7H6zM24 13v27" /><path d="M24 13c-5 0-9-7-4-7s4 7 4 7Zm0 0c5 0 9-7 4-7s-4 7-4 7Z" /></svg>,
  // collected: a paper bag with the mark
  <svg key="b" viewBox="0 0 48 48"><path d="M10 16h28l-2 26H12Z" /><path d="M18 16v-3a6 6 0 0 1 12 0v3" /><path d="M19 30l5-7 5 7M21 27h6" /></svg>,
];

/**
 * The story told in time and in space: the family's years at Dordoi, and the journey of one pair from the mill in
 * Korea to the customer. On the journey a sock walks along the dotted route as the section scrolls by (in browsers
 * that tie animation to scrolling; elsewhere it waits at the start), and each stop rises in its turn.
 */
export function StoryJourney() {
  const { t } = useT();
  return (
    <>
      <section className="av-block av-tl" aria-labelledby="tl-title" data-reveal>
        <div className="av-container">
          <span className="av-hand">{t("tl.eyebrow")}</span>
          <h2 id="tl-title">{t("tl.title")}</h2>
          <ol className="av-tl__list">
            {YEARS.map((y, i) => (
              <li key={y.when} style={{ "--i": i } as React.CSSProperties}>
                <span className="av-tl__when">{t(y.when)}</span>
                <p>{t(y.what)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="av-block av-journey" aria-labelledby="journey-title" data-reveal>
        <div className="av-container">
          <span className="av-hand">{t("jr.eyebrow")}</span>
          <h2 id="journey-title">{t("jr.title")}</h2>
          <div className="av-journey__route">
            <svg className="av-journey__line" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><path d="M20 20C200 0 300 40 500 20S800 0 980 20" pathLength={1} /></svg>
            <span className="av-journey__walker" aria-hidden="true"><SockArt cut="crew" main={C.navy} accent={C.gold} pattern="oimo" second={C.cream} /></span>
            <ol className="av-journey__stops">
              {[1, 2, 3, 4].map((n, i) => (
                <li key={n} style={{ "--i": i } as React.CSSProperties}>
                  <span className="av-journey__icon" aria-hidden="true">{ICONS[i]}</span>
                  <strong>{t(`jr.${n}` as MessageKey)}</strong>
                  <span className="av-small">{t(`jr.${n}s` as MessageKey)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
