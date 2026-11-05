import { HornBand } from "../../brand/Ornaments";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

/**
 * The family's own words: a short letter from the stall, on paper, signed by hand. The paragraphs arrive one after
 * another and a band of ram's horns draws itself above it. Plain facts only; nothing here the family did not say.
 */
export function StoryLetter() {
  const { t } = useT();
  return (
    <section className="av-block av-letter" aria-labelledby="letter-title" data-reveal>
      <div className="av-container av-letter__inner">
        <HornBand className="av-letter__band" />
        <article className="av-letter__paper">
          <span className="av-hand">{t("letter.eyebrow")}</span>
          <h2 id="letter-title">{t("letter.title")}</h2>
          {[1, 2, 3, 4].map((n, i) => <p key={n} style={{ "--i": i } as React.CSSProperties}>{t(`letter.p${n}` as MessageKey)}</p>)}
          <p className="av-letter__sign" style={{ "--i": 4 } as React.CSSProperties}>
            <span>{t("letter.sign")}</span>
            <span className="av-hand">{t("letter.names")}</span>
          </p>
        </article>
      </div>
    </section>
  );
}

const MOMENTS: Array<{ at: string; what: MessageKey; text: MessageKey }> = [
  { at: "8:00", what: "day.1", text: "day.1s" },
  { at: "10:00", what: "day.2", text: "day.2s" },
  { at: "13:00", what: "day.3", text: "day.3s" },
  { at: "16:00", what: "day.4", text: "day.4s" },
];

/**
 * A day at container 70-E: the sun crosses the sky over the stall as the section arrives, and each moment of the day
 * lights up as the sun reaches it. Without motion everything is simply shown, the sun at noon.
 */
export function DayAtStall() {
  const { t } = useT();
  return (
    <section className="av-block av-day" aria-labelledby="day-title" data-reveal>
      <div className="av-container">
        <span className="av-hand">{t("day.eyebrow")}</span>
        <h2 id="day-title">{t("day.title")}</h2>
        <div className="av-day__sky" aria-hidden="true">
          <svg viewBox="0 0 1000 260" preserveAspectRatio="xMidYMid meet">
            <path className="av-day__arc" d="M75.3 260A520 520 0 0 1 924.7 260" />
            <g className="av-day__stall">
              <rect x="440" y="196" width="120" height="64" rx="3" />
              <path d="M452 206V250M468 206V250M484 206V250M500 206V250M516 206V250M532 206V250M548 206V250" />
              <text x="500" y="190" textAnchor="middle">70-E</text>
            </g>
          </svg>
          <span className="av-day__arm"><span className="av-day__sun" /></span>
        </div>
        <ol className="av-day__moments">
          {MOMENTS.map((m, i) => (
            <li key={m.at} style={{ "--i": i } as React.CSSProperties}>
              <time>{m.at}</time>
              <strong>{t(m.what)}</strong>
              <span className="av-small">{t(m.text)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
