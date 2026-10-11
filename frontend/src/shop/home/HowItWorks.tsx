import { BagIcon, CheckIcon, StoreIcon } from "../../components/icons";
import { useT } from "../../i18n/I18n";

/** Ordering in three steps, so a first-time visitor knows what happens after "Add to bag". */
export function HowItWorks() {
  const { t } = useT();
  const steps = [
    { icon: <BagIcon />, title: t("how.s1"), text: t("how.s1t") },
    { icon: <CheckIcon />, title: t("how.s2"), text: t("how.s2t") },
    { icon: <StoreIcon />, title: t("how.s3"), text: t("how.s3t") },
  ];
  return (
    <section className="av-block av-block--tight" aria-labelledby="how-title" data-reveal>
      <div className="av-container av-stack">
        <span className="av-eyebrow av-orn">{t("how.eyebrow")}</span>
        <h2 id="how-title">{t("how.title")}</h2>
        <ol className="av-how">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="av-how__n" aria-hidden="true">{i + 1}</span>
              <span className="av-how__icon" aria-hidden="true">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
