import { stageFor } from "../components/ProductImage";
import { Link } from "react-router-dom";
import { Peg } from "../components/Clothesline";
import { useT } from "../i18n/I18n";
import { forgetViewed, useViewed } from "./useViewed";

/**
 * The socks this visitor looked at last, pegged on a line like a row of photos: on the product page and under the
 * shop's shelves. Remembered in this browser only, and the visitor can clear it. Leaves out the sock on the page.
 */
export function RecentlyViewed({ except }: { except?: string }) {
  const { t } = useT();
  const list = useViewed().filter((v) => v.slug !== except).slice(0, 8);
  if (list.length === 0) return null;
  return (
    <section className="av-seen" aria-labelledby="seen-title">
      <header className="av-seen__head">
        <h2 id="seen-title">{t("pdp.recent")}</h2>
        <button type="button" className="av-linkbtn" onClick={forgetViewed}>{t("recent.clear")}</button>
      </header>
      <ul className="av-seen__line">
        {list.map((v, i) => (
          <li key={v.slug} style={{ "--i": i } as React.CSSProperties}>
            <Link to={`/products/${v.slug}`} className="av-seen__photo">
              <Peg className="av-seen__peg" />
              {v.image ? <img src={v.image} data-stage={stageFor(v.image)} alt="" width={160} height={200} loading="lazy" decoding="async" /> : <span className="av-seen__blank" />}
              <span className="av-seen__name">{v.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
