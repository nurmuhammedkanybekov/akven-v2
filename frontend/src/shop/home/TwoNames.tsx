import { useId } from "react";
import { LOGO } from "../../brand/logo.generated";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";

const P = LOGO.parts;
/** One part of the name as outlines (no font needed), cropped to its own width and the capitals' height. The heart
 * is written with the pen as the section arrives: its outline shows through a mask, a wide stroke along the pen's path. */
function Part({ d, x, w, line, className }: { d: string; x: number; w: number; line?: string | null; className: string }) {
  const pad = line ? 10 : 4;
  const id = `names-pen-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className={className} viewBox={`${x - pad} ${P.top - pad} ${w + pad * 2} ${P.cap + pad * 2 + 6}`} aria-hidden="true">
      {line && (
        <mask id={id} maskUnits="userSpaceOnUse" x={x - 50} y={P.top - 50} width={w + 100} height={P.cap + 100}>
          <path className="av-names__pen" d={line} pathLength={1} fill="none" stroke="#fff" strokeWidth={17} strokeLinecap="round" />
        </mask>
      )}
      <path d={d} mask={line ? `url(#${id})` : undefined} />
    </svg>
  );
}

/**
 * "Two names. One family. One story.": AK from Akylbek and VEN from Venera slide in from either side and meet at the
 * gold heart (the ampersand, written with a pen as the section arrives), each with the name it comes from underneath. Then a few plain sentences about the family and, on the
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
