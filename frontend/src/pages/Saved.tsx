import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProduct } from "../api/endpoints";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { HeartIcon, ShareIcon } from "../components/icons";
import { Price } from "../components/Price";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import { useSaved, type SavedItem } from "../shop/useSaved";

/** How many socks a shared link can carry, and what a slug may look like: anything else in the link is ignored. */
const SHARE_MAX = 24;
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** The slugs in a shared link, cleaned: unknown characters, repeats and anything past the limit are dropped. */
export function sharedSlugs(param: string | null): string[] {
  if (!param) return [];
  return [...new Set(param.split(",").map((s) => s.trim().toLowerCase()).filter((s) => SLUG.test(s)))].slice(0, SHARE_MAX);
}

/**
 * The socks a visitor saved with the heart, kept in this browser, ready to compare or open again. The list can be
 * shared as a link (a wish list for a birthday, or "these for the kids?"); opening such a link shows the shared socks
 * with a button to save them all.
 */
export function SavedPage() {
  const { t } = useT();
  const saved = useSaved();
  const toast = useToast();
  const [params] = useSearchParams();
  const shared = sharedSlugs(params.get("list"));

  async function share() {
    const url = `${window.location.origin}/saved?list=${saved.items.slice(0, SHARE_MAX).map((i) => i.slug).join(",")}`;
    try {
      if (navigator.share) await navigator.share({ title: t("nav.savedTitle"), url });
      else { await navigator.clipboard.writeText(url); toast(t("saved.copied")); }
    } catch { /* closed the share sheet, or the clipboard is blocked: nothing to do */ }
  }

  return (
    <div className="av-container av-page">
      <header className="av-page__head">
        <span className="av-eyebrow">{t("saved.eyebrow")}</span>
        <h1>{t("nav.savedTitle")}</h1>
        <p className="av-small">{t("saved.lead")}</p>
      </header>
      {shared.length > 0 && <SharedList slugs={shared} />}
      {saved.items.length === 0 ? (
        shared.length === 0 && (
          <div className="av-empty">
            <span className="av-empty__icon" aria-hidden="true"><HeartIcon /></span>
            <h2>{t("saved.empty")}</h2>
            <p className="av-lead">{t("saved.emptyS")}</p>
            <Button to="/shop">{t("cart.browse")}</Button>
          </div>
        )
      ) : (
        <>
          {shared.length > 0 && <h2 className="av-saved__mine">{t("saved.mine")}</h2>}
          <div className="av-row av-saved__bar">
            <Button variant="secondary" size="sm" onClick={() => void share()}><ShareIcon /> {t("saved.share")}</Button>
          </div>
          <SavedGrid items={saved.items} onRemove={saved.remove} removeLabel={(name) => t("save.remove", { name })} />
        </>
      )}
    </div>
  );
}

function SavedGrid({ items, onRemove, removeLabel }: { items: SavedItem[]; onRemove?: (slug: string) => void; removeLabel?: (name: string) => string }) {
  return (
    <ul className="av-grid-products av-saved">
      {items.map((p, i) => (
        <li key={p.slug} className="av-card-wrap" style={{ "--i": i } as React.CSSProperties}>
          <Link to={`/products/${p.slug}`} className="av-card">
            <div className="av-card__media" style={{ background: `var(--tint-${(i % 6) + 1})` }}>
              {p.image && <img src={p.image} alt="" width={800} height={1000} loading="lazy" />}
            </div>
            <div className="av-card__meta">
              <span className="av-card__name">{p.name}</span>
              {p.price != null && <span className="av-card__foot"><Price amount={p.price} from /></span>}
            </div>
          </Link>
          {onRemove && (
            <button type="button" className="av-save is-on" aria-pressed="true" aria-label={removeLabel?.(p.name)} onClick={() => onRemove(p.slug)}>
              <HeartIcon />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Socks someone shared with a link: read from the shop (names and prices are today's), with one button to keep them. */
function SharedList({ slugs }: { slugs: string[] }) {
  const { t } = useT();
  const saved = useSaved();
  const toast = useToast();
  const [kept, setKept] = useState(false);
  const found = useAsync(async () => {
    const results = await Promise.allSettled(slugs.map((s) => getProduct(s)));
    return results.flatMap((r): SavedItem[] => r.status !== "fulfilled" ? [] : [{
      slug: r.value.slug, name: r.value.name, image: r.value.images[0]?.url ?? null,
      price: r.value.variants.length ? Math.min(...r.value.variants.map((v) => v.price)) : null,
    }]);
  }, [slugs.join(",")]);
  const items = found.data ?? [];
  const keepAll = () => {
    saved.addAll(items);
    setKept(true);
    toast(t("saved.keptAll"));
  };
  return (
    <section className="av-saved__shared" aria-labelledby="shared-title">
      <h2 id="shared-title">{t("saved.shared", { n: slugs.length })}</h2>
      {found.loading && !found.data ? <Skeleton height={240} /> : items.length === 0 ? <p className="av-small">{t("saved.sharedNone")}</p> : (
        <>
          <SavedGrid items={items} />
          <Button onClick={keepAll} disabled={kept || items.every((i) => saved.has(i.slug))}>{t("saved.keepAll")}</Button>
        </>
      )}
    </section>
  );
}
