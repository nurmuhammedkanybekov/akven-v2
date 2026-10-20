import { Link } from "react-router-dom";
import { getShowcaseReviews } from "../../api/endpoints";
import { Stars } from "../../components/Stars";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";

/**
 * What families say: approved reviews of four or five stars, from customers who received the sock. The section only
 * exists once there is at least one; the shop never fills it with made-up words.
 */
export function FamiliesSay() {
  const { t } = useT();
  const list = useAsync((signal) => getShowcaseReviews(6, signal), []);
  const items = list.data ?? [];
  if (items.length === 0) return null;
  return (
    <section className="av-block" aria-labelledby="say-title" data-reveal>
      <div className="av-container">
        <header className="av-block__head"><span className="av-eyebrow">{t("rv.eyebrow")}</span><h2 id="say-title">{t("say.title")}</h2></header>
        <ul className="av-say2">
          {items.map((r) => (
            <li key={r.id}>
              <Stars value={r.rating} />
              <blockquote>{r.body}</blockquote>
              <span className="av-small"><strong>{r.author || t("rv.anon")}</strong> · <Link to={`/products/${r.productSlug}`}>{r.productName}</Link></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
