import { FittingRoom } from "../fitting/FittingRoom";
import { useT } from "../../i18n/I18n";

/** The fitting room on the home page, under a note in the family's hand. */
export function FittingSection() {
  const { t } = useT();
  return (
    <section className="av-block av-fitroom" id="fitting" aria-labelledby="fitting-title" data-reveal>
      <div className="av-container">
        <header className="av-fitroom__head">
          <span className="av-hand">{t("fr.eyebrow")}</span>
          <h2 id="fitting-title">{t("fr.title")}</h2>
          <p className="av-lead">{t("fr.lead")}</p>
        </header>
        <FittingRoom />
      </div>
    </section>
  );
}
