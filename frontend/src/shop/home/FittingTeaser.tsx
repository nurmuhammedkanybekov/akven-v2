import { SOCK_COLOURS as C, type SockCut, type SockSpec } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { CUTS, FIT, HOUSE, Stage, WHO, type Who } from "../fitting/FittingRoom";
import { useState } from "react";

/** One sock of the house for each of the family, so changing "who" changes what is on the leg. */
const SAMPLE: Record<Who, SockSpec> = {
  MEN: HOUSE,
  WOMEN: { cut: "crew", main: C.blush, accent: C.berry, pattern: "hearts", second: C.cream },
  KIDS: { cut: "crew", main: C.lemon, accent: C.sky, pattern: "dots", second: C.cream },
};
const SKIN: Record<Who, string> = { MEN: "#dfb08f", WOMEN: "#f1d3bf", KIDS: "#dfb08f" };

/**
 * The fitting room, introduced on the home page: who is trying on and how high, live on the same leg the full room
 * uses (with trainers, the shoe most people wear), and the way into the room with those choices kept. Nothing is
 * loaded for it: the sock is drawn, not fetched.
 */
export function FittingTeaser() {
  const { t } = useT();
  const [who, setWho] = useState<Who>("MEN");
  const [cut, setCut] = useState<SockCut>("crew");
  const rating = FIT.trainers[cut];
  return (
    <section className="av-block av-ftease" id="fitting" aria-labelledby="ftease-title" data-reveal>
      <div className="av-container av-ftease__grid">
        <div className="av-ftease__copy">
          <span className="av-hand">{t("fr.eyebrow")}</span>
          <h2 id="ftease-title">{t("fr.title")}</h2>
          <p className="av-lead">{t("ft.lead")}</p>
          <fieldset className="av-ftease__step">
            <legend>{t("fr.who")}</legend>
            <div className="av-fr__chips">
              {WHO.map((w) => (
                <label key={w} className={`av-fr__chip${w === who ? " is-on" : ""}`}>
                  <input type="radio" name="ft-who" checked={w === who} onChange={() => setWho(w)} />
                  <span>{t(`fr.who.${w}` as MessageKey)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="av-ftease__step">
            <legend>{t("fr.height")}<span className="av-ftease__legend"><i aria-hidden="true" />{t("ft.best")}</span></legend>
            <div className="av-fr__chips">
              {CUTS.map((c) => (
                <label key={c} className={`av-fr__chip${c === cut ? " is-on" : ""}`} data-fit={FIT.trainers[c]}>
                  <input type="radio" name="ft-cut" checked={c === cut} onChange={() => setCut(c)} />
                  <span>{t(`cut.${c}` as MessageKey)}{FIT.trainers[c] === 2 && <span className="av-visually-hidden"> · {t("ft.best")}</span>}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="av-fr__advice" aria-live="polite" data-fit={rating}>
            <strong>{t(`fr.verdict${rating}` as MessageKey, { cut: t(`cut.${cut}` as MessageKey), shoe: t("fr.shoe.trainers").toLowerCase() })}</strong>
          </p>
          <div className="av-row">
            <Button to={`/fitting?who=${who}&cut=${cut}`}>{t("ft.open")} →</Button>
          </div>
          <p className="av-small av-muted">{t("ft.more")}</p>
        </div>
        <div className="av-ftease__stage">
          <Stage spec={{ ...SAMPLE[who], cut }} shoe="trainers" skin={SKIN[who]} cut={cut} shoesOn trousers="#2b3448" />
        </div>
      </div>
    </section>
  );
}
