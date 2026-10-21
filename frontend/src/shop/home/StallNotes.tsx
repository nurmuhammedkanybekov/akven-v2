import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

/** Each note hangs a little crooked, by its own amount. */
const TILT = [-2.4, 1.8, -1.1, 2.6, -1.6];

const NOTES: Array<{ text: MessageKey; by: MessageKey; paper: "white" | "kraft" | "lined" | "yellow" }> = [
  { text: "notes.1", by: "notes.byV", paper: "lined" },
  { text: "notes.2", by: "notes.byV", paper: "kraft" },
  { text: "notes.3", by: "notes.byA", paper: "white" },
  { text: "notes.4", by: "notes.byUs", paper: "yellow" },
  { text: "notes.5", by: "notes.byA", paper: "kraft" },
];

/**
 * Notes from the stall: the advice the family gives at the counter, on scraps of paper pinned to a board, in their
 * handwriting. They swing into place as the board comes into view, and straighten when you point at one.
 */
export function StallNotes() {
  const { t } = useT();
  return (
    <section className="av-block av-notes" aria-labelledby="notes-title" data-reveal>
      <div className="av-container">
        <header className="av-notes__head">
          <span className="av-hand">{t("notes.eyebrow")}</span>
          <h2 id="notes-title">{t("notes.title")}</h2>
          <p className="av-lead">{t("notes.lead")}</p>
        </header>
        <ul className="av-notes__board">
          {NOTES.map((n, i) => (
            <li key={n.text} className={`av-note av-note--${n.paper}`} style={{ "--i": i, "--r": `${TILT[i]}deg` } as React.CSSProperties}>
              <span className="av-note__pin" aria-hidden="true" />
              <p>{t(n.text)}</p>
              <span className="av-note__by">— {t(n.by)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
