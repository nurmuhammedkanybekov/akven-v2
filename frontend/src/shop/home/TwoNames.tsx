import { LOGO } from "../../brand/logo.generated";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";

const P = LOGO.parts;
/** One part of the name as outlines (no font needed), cropped to its own width and the capitals' height. */
function Part({ d, x, w, className }: { d: string; x: number; w: number; className: string }) {
  const pad = 4;
  return (
    <svg className={className} viewBox={`${x - pad} ${P.top - pad} ${w + pad * 2} ${P.cap + pad * 2 + 6}`} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/**
 * "Two names. One family. One story.": AK from Akylbek and VEN from Venera slide in from either side and meet at the
 * gold ampersand, each with the name it comes from underneath. Then a few plain sentences about the family and, on the
 * home page, a way to the whole story (on the story page it is the page's own heading). Understated on purpose: the letters do the work.
 */
export function TwoNames({ page = false }: { page?: boolean }) {
  const { t } = useT();
  const Heading = page ? "h1" : "h2";
  return (
    <section className="av-block av-names" aria-labelledby="names-title" data-reveal>
      <div className="av-container av-names__inner">
        <span className="av-eyebrow">{t("names.eyebrow")}</span>
        <Heading id="names-title">{t("names.title")}</Heading>
        <div className="av-names__word">
          <figure className="av-names__part av-names__part--ak">
            <Part {...P.ak} className="av-names__glyph" />
            <figcaption><strong>Akylbek</strong></figcaption>
          </figure>
          <figure className="av-names__part av-names__part--amp">
            <Part {...P.amp} className="av-names__glyph" />
            <figcaption>{t("names.together")}</figcaption>
          </figure>
          <figure className="av-names__part av-names__part--ven">
            <Part {...P.ven} className="av-names__glyph" />
            <figcaption><strong>Venera</strong></figcaption>
          </figure>
        </div>
        <p className="av-names__lead">{t("story.lead")}</p>
        {!page && <Button to="/story" variant="secondary">{t("names.cta")}</Button>}
      </div>
    </section>
  );
}
