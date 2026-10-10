import { listProducts } from "../../api/endpoints";
import { Button } from "../../components/Button";
import { ProductCard } from "../../components/ProductCard";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

/** The days people buy socks as gifts in Kyrgyzstan, as month and day. */
const HOLIDAYS: Array<{ key: MessageKey; month: number; day: number }> = [
  { key: "gift.feb23", month: 2, day: 23 },
  { key: "gift.mar8", month: 3, day: 8 },
  { key: "gift.nooruz", month: 3, day: 21 },
  { key: "gift.school", month: 9, day: 1 },
  { key: "gift.newYear", month: 12, day: 31 },
];

/** Today in Bishkek, as a date at midnight UTC (only the calendar day matters). */
function bishkekToday(now: Date): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bishkek" }).format(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function upcomingHolidays(now = new Date()) {
  const today = bishkekToday(now);
  const year = today.getUTCFullYear();
  return HOLIDAYS.map((h) => {
    let date = new Date(Date.UTC(year, h.month - 1, h.day));
    if (date < today) date = new Date(Date.UTC(year + 1, h.month - 1, h.day));
    return { ...h, date, days: Math.round((date.getTime() - today.getTime()) / 86_400_000) };
  }).sort((a, b) => a.days - b.days);
}

/**
 * Gift boxes and the calendar they are made for: the next holiday counts down, and the boxes come from the
 * catalogue (Bundles), so the owners decide what is shown.
 */
export function GiftCalendar() {
  const { t, lang } = useT();
  const boxes = useAsync((signal) => listProducts({ category: "BUNDLES", pageSize: 4, sort: "newest" }, signal), []);
  const days = upcomingHolidays();
  const next = days[0];
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang === "ru" ? "ru-RU" : "ky-KG", { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <section className="av-block" aria-labelledby="gift-title" data-reveal>
      <div className="av-container">
        <div className="av-gifts">
          <div className="av-gifts__head">
            <div className="av-stack">
              <span className="av-eyebrow av-orn">{t("gift.eyebrow")}</span>
              <h2 id="gift-title">{t("gift.title")}</h2>
              <p>{t("gift.lead")}</p>
            </div>
            <div className="av-countdown">
              <span className="av-countdown__n av-num">{next.days}</span>
              <span className="av-countdown__label">{next.days === 0 ? t("gift.today", { name: t(next.key) }) : t("gift.until", { name: t(next.key) })}</span>
            </div>
          </div>
          <ol className="av-dates">
            {days.map((h, i) => (
              <li key={h.key} className={i === 0 ? "is-next" : undefined}>
                <span className="av-dates__day">{fmt.format(h.date)}</span>
                <strong>{t(h.key)}</strong>
                <span className="av-dates__left av-num">{t("gift.inDays", { n: h.days })}</span>
              </li>
            ))}
          </ol>
          {boxes.data && boxes.data.items.length > 0 && (
            <div className="av-grid-products av-gifts__grid">
              {boxes.data.items.map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={((i + 2) % 6) + 1} />)}
            </div>
          )}
          <div className="av-row"><Button to="/bundles" variant="accent">{t("gift.all")}</Button></div>
        </div>
      </div>
    </section>
  );
}
