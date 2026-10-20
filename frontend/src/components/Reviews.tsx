import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { getMyReview, getReviews, writeReview } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import { formatDay } from "../lib/format";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { StarInput, Stars } from "./Stars";

/**
 * Reviews on a product page: the average and how the stars spread, what customers wrote (approved by the owners), and
 * for a customer who received this sock, a form to write or change theirs. Every word is shown as plain text.
 */
export function Reviews({ slug }: { slug: string }) {
  const { t } = useT();
  const list = useAsync((signal) => getReviews(slug, signal), [slug]);
  const r = list.data;
  return (
    <section className="av-block av-reviews" aria-labelledby="reviews-title">
      <header className="av-block__head">
        <span className="av-eyebrow">{t("rv.eyebrow")}</span>
        <h2 id="reviews-title">{t("rv.title")}</h2>
      </header>
      <div className="av-reviews__grid">
        <div className="av-reviews__summary">
          {r && r.count > 0 && r.average != null ? (
            <>
              <strong className="av-reviews__avg av-num">{r.average.toFixed(1)}</strong>
              <Stars value={r.average} size={20} />
              <span className="av-small">{t(r.count === 1 ? "rv.count1" : "rv.count", { n: r.count })}</span>
              <ul className="av-reviews__bars" aria-label={t("rv.spread")}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <li key={n}>
                    <span className="av-num">{n}</span>
                    <span className="av-reviews__bar" aria-hidden="true"><i style={{ width: `${(r.counts[n - 1] / r.count) * 100}%` }} /></span>
                    <span className="av-small av-num">{r.counts[n - 1]}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="av-small">{t("rv.none")}</p>
          )}
          <p className="av-small av-muted">{t("rv.verified")}</p>
          <WriteReview slug={slug} />
        </div>
        <ol className="av-reviews__list">
          {(r?.reviews ?? []).map((x, i) => (
            <li key={x.id} style={{ "--i": i } as React.CSSProperties}>
              <div className="av-reviews__head"><Stars value={x.rating} /><span className="av-small av-muted">{formatDay(x.createdAt.slice(0, 10))}</span></div>
              <p className="av-reviews__body">{x.body}</p>
              <span className="av-small"><strong>{x.author || t("rv.anon")}</strong> · {t("rv.buyer")}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WriteReview({ slug }: { slug: string }) {
  const { t } = useT();
  const { session, isStaff } = useAuth();
  const { pathname } = useLocation();
  const mine = useAsync(() => (session && !isStaff ? getMyReview(slug) : Promise.resolve(null)), [slug, session?.email]);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!session) return <p className="av-small"><Link to={`/login?next=${encodeURIComponent(pathname)}`}>{t("rv.signIn")}</Link></p>;
  const m = mine.data;
  if (!m || !m.canReview) return null;
  if (sent || (m.status === "PENDING" && !open)) return <p className="av-small av-reviews__note">{t("rv.pending")}</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) { setError(t("rv.needStars")); return; }
    setBusy(true); setError(null);
    try { await writeReview(slug, { rating, author: author.trim() || null, body }); setSent(true); }
    catch (err) { setError(err instanceof ApiError ? err.message : t("err.other")); }
    finally { setBusy(false); }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => { setOpen(true); setRating(m.rating ?? 0); setAuthor(m.author ?? ""); setBody(m.body ?? ""); }}>
        {m.status ? t("rv.edit") : t("rv.write")}
      </Button>
    );
  }
  return (
    <form className="av-reviews__form" onSubmit={(e) => void submit(e)} noValidate>
      <StarInput value={rating} onChange={setRating} label={t("rv.yourStars")} />
      <label className="av-field"><span className="av-label">{t("rv.name")}</span>
        <input className="av-input" value={author} maxLength={40} onChange={(e) => setAuthor(e.target.value)} placeholder={t("rv.namePh")} /></label>
      <label className="av-field"><span className="av-label">{t("rv.words")}</span>
        <textarea className="av-input av-textarea" rows={4} value={body} minLength={10} maxLength={1000} onChange={(e) => setBody(e.target.value)} />
        <span className="av-hint av-num">{body.length} / 1000</span></label>
      {m.status === "REJECTED" && <p className="av-small">{t("rv.rejected")}</p>}
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="av-row"><Button type="submit" loading={busy}>{t("rv.send")}</Button><Button variant="ghost" onClick={() => setOpen(false)}>{t("od.keep")}</Button></div>
      <p className="av-small av-muted">{t("rv.moderated")}</p>
    </form>
  );
}
