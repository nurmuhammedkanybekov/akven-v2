import { Link } from "react-router-dom";
import { categoryFor, useFamily } from "../family";
import { useViewed } from "../useViewed";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { CATEGORY_PATH } from "../../lib/labels";

/**
 * The home page for someone who has been here before: a shortcut to each shelf their saved family needs ("For Venera,
 * 38: women's socks") and the socks they were looking at last time. Nothing shows for a first visit.
 */
export function ForYou() {
  const { t } = useT();
  const family = useFamily().members ?? [];
  const viewed = useViewed().slice(0, 6);
  if (family.length === 0 && viewed.length === 0) return null;
  return (
    <section className="av-block av-foryou" aria-labelledby="foryou-title">
      <div className="av-container av-stack">
        <span className="av-eyebrow">{t("foryou.eyebrow")}</span>
        <h2 id="foryou-title">{t(family.length ? "foryou.titleFamily" : "foryou.title")}</h2>
        {family.length > 0 && (
          <ul className="av-foryou__family">
            {family.map((m, i) => (
              <li key={i}>
                <Link to={CATEGORY_PATH[categoryFor(m)]}>
                  <strong>{m.name || t(`family.${m.role}` as MessageKey)}</strong>
                  <span className="av-small">{t("foryou.shoe", { n: m.shoeSize })} · {t(`nav.${categoryFor(m).toLowerCase()}` as MessageKey)} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {viewed.length > 0 && (
          <>
            {family.length > 0 && <h3 className="av-foryou__sub">{t("foryou.title")}</h3>}
            <ul className="av-recent">
              {viewed.map((v, i) => (
                <li key={v.slug}>
                  <Link to={`/products/${v.slug}`}>
                    <span className="av-recent__img" style={{ background: `var(--tint-${(i % 6) + 1})` }}>{v.image && <img src={v.image} alt="" loading="lazy" width={160} height={200} />}</span>
                    <span className="av-recent__name">{v.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
