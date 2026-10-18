import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { HeartIcon } from "../components/icons";
import { Price } from "../components/Price";
import { useT } from "../i18n/I18n";
import { useSaved } from "../shop/useSaved";

/** The socks a visitor saved with the heart, kept in this browser, ready to compare or open again. */
export function SavedPage() {
  const { t } = useT();
  const saved = useSaved();
  return (
    <div className="av-container av-page">
      <header className="av-page__head">
        <span className="av-eyebrow">{t("saved.eyebrow")}</span>
        <h1>{t("nav.savedTitle")}</h1>
        <p className="av-small">{t("saved.lead")}</p>
      </header>
      {saved.items.length === 0 ? (
        <div className="av-empty">
          <span className="av-empty__icon" aria-hidden="true"><HeartIcon /></span>
          <h2>{t("saved.empty")}</h2>
          <p className="av-lead">{t("saved.emptyS")}</p>
          <Button to="/shop">{t("cart.browse")}</Button>
        </div>
      ) : (
        <ul className="av-grid-products av-saved">
          {saved.items.map((p, i) => (
            <li key={p.slug} className="av-card-wrap">
              <Link to={`/products/${p.slug}`} className="av-card">
                <div className="av-card__media" style={{ background: `var(--tint-${(i % 6) + 1})` }}>
                  {p.image && <img src={p.image} alt="" width={800} height={1000} loading="lazy" />}
                </div>
                <div className="av-card__meta">
                  <span className="av-card__name">{p.name}</span>
                  {p.price != null && <span className="av-card__foot"><Price amount={p.price} from /></span>}
                </div>
              </Link>
              <button type="button" className="av-save is-on" aria-pressed="true" aria-label={t("save.remove", { name: p.name })} onClick={() => saved.remove(p.slug)}>
                <HeartIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
