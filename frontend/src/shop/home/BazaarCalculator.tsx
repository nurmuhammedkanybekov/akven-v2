import { useEffect, useRef, useState } from "react";
import { useT } from "../../i18n/I18n";
import { CheckIcon } from "../../components/icons";

const ASKING = "80.00";
const YOURS = "62.40";
const KEYS = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "=", "+"];

type Step = { show: string; key?: string; bubble: number; stamp?: boolean; wait: number };

/** The scene, one keypress at a time: the asking price is typed, the customer asks, the shop types its offer. */
function script(): Step[] {
  const steps: Step[] = [{ show: "", bubble: 1, wait: 900 }];
  let shown = "";
  for (const ch of ASKING) { shown += ch; steps.push({ show: shown, key: ch, bubble: 1, wait: 170 }); }
  steps.push({ show: shown, bubble: 2, wait: 1300 });
  steps.push({ show: "0", key: "−", bubble: 2, wait: 500 });
  shown = "";
  for (const ch of YOURS) { shown += ch; steps.push({ show: shown, key: ch, bubble: 3, wait: 190 }); }
  steps.push({ show: shown, key: "=", bubble: 3, wait: 700 });
  steps.push({ show: shown, bubble: 3, stamp: true, wait: 0 });
  return steps;
}

/**
 * "Ask for your price", told the way it happens at Dordoi: the seller types a price into a calculator and turns it
 * round. It plays once when scrolled into view, can be replayed, and shows the end straight away for reduced motion.
 * Screen readers get the outcome as text; the animated display is hidden from them.
 */
export function BazaarCalculator() {
  const { t } = useT();
  const steps = useRef(script()).current;
  const [i, setI] = useState(steps.length - 1);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  function play() {
    window.clearTimeout(timer.current);
    let k = 0;
    setI(0);
    const tick = () => {
      k += 1;
      if (k >= steps.length) return;
      timer.current = window.setTimeout(() => { setI(k); tick(); }, steps[k - 1].wait);
    };
    tick();
  }

  useEffect(() => {
    const el = ref.current;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!el || still || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timer.current); };
  }, []);

  const s = steps[i];
  const done = i === steps.length - 1;
  return (
    <section className="av-block" aria-labelledby="ask-title" data-reveal>
      <div className="av-container av-ask2">
        <div className="av-stack">
          <span className="av-eyebrow av-orn">{t("ask.eyebrow")}</span>
          <h2 id="ask-title">{t("ask.title")}</h2>
          <p className="av-lead">{t("ask.lead")}</p>
          <ol className="av-numbered">
            <li><b>1</b><span>{t("ask.1")}</span></li>
            <li><b>2</b><span>{t("ask.2")}</span></li>
            <li><b>3</b><span>{t("ask.3")}</span></li>
          </ol>
        </div>

        <div className="av-calc-scene" ref={ref}>
          <p className="av-visually-hidden">{t("ask.sr", { asking: `$${ASKING}`, yours: `$${YOURS}` })}</p>
          <div className="av-calc-scene__talk" aria-hidden="true">
            <p className={`av-say av-say--you${s.bubble >= 1 ? " is-on" : ""}`}>{t("ask.you")}</p>
            <p className={`av-say av-say--shop${s.bubble >= 3 ? " is-on" : ""}`}>{t("ask.shop")}</p>
          </div>
          <div className="av-calc" aria-hidden="true">
            <div className="av-calc__top"><span>AK&amp;VEN</span><i /></div>
            <div className={`av-calc__lcd${s.bubble >= 3 ? " is-offer" : ""}`}>
              <small>{s.bubble >= 3 ? t("ask.yours") : t("ask.asking")}</small>
              <span className="av-calc__digits">{s.show || "0"}</span>
              {s.bubble === 2 && <s className="av-calc__was">${ASKING}</s>}
            </div>
            <div className="av-calc__keys">
              {KEYS.map((k) => <span key={k} className={s.key === k ? "is-down" : undefined}>{k}</span>)}
            </div>
            <div className={`av-calc__stamp${s.stamp ? " is-on" : ""}`}><CheckIcon />{t("ask.stamp")}</div>
          </div>
          <button type="button" className="av-link-btn" onClick={play} disabled={!done}>{t("ask.replay")}</button>
          <span className="av-small av-calc-scene__note">{t("ask.checked")}</span>
        </div>
      </div>
    </section>
  );
}
