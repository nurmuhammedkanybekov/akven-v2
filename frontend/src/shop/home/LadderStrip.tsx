import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";
import { usePricing } from "../useShopInfo";

/**
 * The collection price, said once and plainly where people are choosing: mix any socks, and every pair costs less
 * from the first step up. The steps are the shop's own (the server applies them at checkout), shown as kraft tags.
 */
export function LadderStrip() {
  const { t } = useT();
  const tiers = [...(usePricing()?.tiers ?? [])].sort((a, b) => a.minPairs - b.minPairs);
  if (tiers.length === 0) return null;
  return (
    <section className="av-ladderstrip" aria-labelledby="ladderstrip-title" data-reveal>
      <div className="av-container av-ladderstrip__inner">
        <div className="av-ladderstrip__copy">
          <span className="av-eyebrow">{t("ls.eyebrow")}</span>
          <h2 id="ladderstrip-title">{t("ls.title")}</h2>
          <p>{t("ls.lead")}</p>
        </div>
        <ol className="av-ladderstrip__steps">
          {tiers.map((x, i) => (
            <li key={x.minPairs} style={{ "--i": i } as React.CSSProperties}>
              <span className="av-kraft">−{Number(x.discountPct)}%</span>
              <span>{t("ls.step", { n: x.minPairs })}</span>
            </li>
          ))}
        </ol>
        <Button to="/shop" variant="accent">{t("ls.cta")}</Button>
      </div>
    </section>
  );
}
