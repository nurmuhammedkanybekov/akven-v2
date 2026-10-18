import { Link } from "react-router-dom";
import { SOCK_COLOURS as C, SockArt } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";

/** The two other kinds of customers, after the families: shops buying by the case, companies buying gift boxes. */
export function ForBusiness() {
  const { t } = useT();
  return (
    <section className="av-block av-block--tight" aria-label={t("biz.label")} data-reveal>
      <div className="av-container av-biz">
        <Link to="/wholesale" className="av-biz__card av-biz__card--shops">
          <span className="av-biz__art" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <SockArt key={i} cut="crew" main={C.charcoal} accent={C.grey} pattern="rib" />)}
          </span>
          <strong>{t("biz.shops")}</strong>
          <span>{t("biz.shopsText")}</span>
          <span className="av-biz__go">{t("biz.shopsGo")} <span aria-hidden="true">→</span></span>
        </Link>
        <Link to="/wholesale#gifts" className="av-biz__card av-biz__card--gifts">
          <span className="av-biz__art" aria-hidden="true">
            <SockArt cut="crew" main={C.burgundy} accent={C.gold} pattern="pinstripe" heel={false} />
            <SockArt cut="crew" main={C.navy} accent={C.gold} pattern="stars" second={C.ivory} />
            <SockArt cut="crew" main={C.ivory} accent={C.red} pattern="shyrdak" second={C.navy} />
          </span>
          <strong>{t("biz.gifts")}</strong>
          <span>{t("biz.giftsText")}</span>
          <span className="av-biz__go">{t("biz.giftsGo")} <span aria-hidden="true">→</span></span>
        </Link>
      </div>
    </section>
  );
}
