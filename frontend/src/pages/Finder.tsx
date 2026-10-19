import { useState } from "react";
import { listProducts, type CatalogQuery } from "../api/endpoints";
import type { Category, ProductSummary } from "../api/types";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../brand/SockArt";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { ProductCard } from "../components/ProductCard";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { CATEGORY_PATH } from "../lib/labels";

type Answer = { value: string; key: MessageKey; hint?: MessageKey; art: SockSpec };

const WHO: Answer[] = [
  { value: "MEN", key: "nav.men", art: { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream } },
  { value: "WOMEN", key: "nav.women", art: { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" } },
  { value: "KIDS", key: "nav.kids", art: { cut: "crew", main: C.mint, accent: C.forest, pattern: "dino", second: C.white } },
];
const HEIGHT: Answer[] = [
  { value: "no-show", key: "fd.noShow", hint: "fd.noShowS", art: { cut: "no-show", main: C.beige, accent: C.beige, heel: false } },
  { value: "ankle", key: "fd.ankle", hint: "fd.ankleS", art: { cut: "ankle", main: C.white, accent: C.grey } },
  { value: "crew", key: "fd.crew", hint: "fd.crewS", art: { cut: "crew", main: C.charcoal, accent: C.charcoal, pattern: "rib" } },
  { value: "mid-long", key: "fd.mid", hint: "fd.midS", art: { cut: "mid-long", main: C.brown, accent: C.brown, pattern: "rib" } },
  { value: "knee-high", key: "fd.knee", hint: "fd.kneeS", art: { cut: "knee-high", main: C.navy, accent: C.navy, pattern: "rib" } },
];
const FOR: Answer[] = [
  { value: "classic", key: "fd.everyday", hint: "fd.everydayS", art: { cut: "crew", main: C.grey, accent: C.grey, pattern: "rib" } },
  { value: "casual", key: "fd.fun", hint: "fd.funS", art: { cut: "crew", main: C.sky, accent: C.mustard, pattern: "multistripe", second: C.coral } },
  { value: "sport", key: "fd.sport", hint: "fd.sportS", art: { cut: "ankle", main: C.white, accent: C.navy, pattern: "stripes" } },
  { value: "thermal", key: "fd.warm", hint: "fd.warmS", art: { cut: "crew", main: C.oat, accent: C.beige, fluffy: true } },
  { value: "heritage", key: "fd.heritage", hint: "fd.heritageS", art: { cut: "crew", main: C.ivory, accent: C.red, pattern: "shyrdak", second: C.navy } },
];
const QUESTIONS: Array<{ key: MessageKey; answers: Answer[] }> = [
  { key: "fd.q1", answers: WHO }, { key: "fd.q2", answers: HEIGHT }, { key: "fd.q3", answers: FOR },
];

/**
 * Find your socks in three taps: who they are for, how high, and what for. The answers become a catalogue filter; if
 * nothing matches all three, the last answers are let go one by one, and the page says so.
 */
export function FinderPage() {
  const { t } = useT();
  const [answers, setAnswers] = useState<string[]>([]);
  const step = answers.length;
  const done = step === QUESTIONS.length;
  const choose = (v: string) => setAnswers((a) => [...a.slice(0, step), v]);

  return (
    <div className="av-container av-page av-quiz">
      <header className="av-page__head">
        <span className="av-eyebrow">{t("fd.eyebrow")}</span>
        <h1>{t("fd.title")}</h1>
        <p className="av-lead">{t("fd.lead")}</p>
      </header>
      <ol className="av-quiz__progress" aria-label={t("fd.progress")}>
        {QUESTIONS.map((q, i) => (
          <li key={q.key} className={i < step ? "is-done" : i === step ? "is-now" : undefined} aria-current={i === step ? "step" : undefined}>
            {i < step
              ? <button type="button" className="av-linkbtn" onClick={() => setAnswers((a) => a.slice(0, i))}>{t(QUESTIONS[i].answers.find((x) => x.value === answers[i])!.key)}</button>
              : <span>{i + 1}</span>}
          </li>
        ))}
      </ol>

      {!done ? (
        <section key={step} className="av-quiz__q" aria-labelledby="fd-q">
          <h2 id="fd-q">{t(QUESTIONS[step].key)}</h2>
          <div className="av-quiz__answers">
            {QUESTIONS[step].answers.map((a, i) => (
              <button key={a.value} type="button" className="av-quiz__answer" style={{ "--i": i } as React.CSSProperties} onClick={() => choose(a.value)}>
                <SockArt {...a.art} className="av-quiz__art" />
                <strong>{t(a.key)}</strong>
                {a.hint && <span className="av-small">{t(a.hint)}</span>}
              </button>
            ))}
          </div>
          {step > 0 && <Button variant="ghost" onClick={() => setAnswers((a) => a.slice(0, -1))}>{t("fd.back")}</Button>}
        </section>
      ) : (
        <Results category={answers[0] as Category} cut={answers[1]} section={answers[2]} onRestart={() => setAnswers([])} />
      )}
    </div>
  );
}

/** Tries the full filter, then without the purpose, then without the height: the first that finds socks wins. */
async function bestMatch(category: Category, cut: string, section: string, signal: AbortSignal) {
  const tries: Array<{ q: CatalogQuery; relaxed: MessageKey | null }> = [
    { q: { category, cut, section }, relaxed: null },
    { q: { category, cut }, relaxed: "fd.relaxedFor" },
    { q: { category, section }, relaxed: "fd.relaxedHeight" },
    { q: { category }, relaxed: "fd.relaxedAll" },
  ];
  for (const attempt of tries) {
    const page = await listProducts({ ...attempt.q, inStock: true, pageSize: 4 }, signal);
    if (page.items.length > 0) return { ...attempt, items: page.items as ProductSummary[], total: page.totalItems };
  }
  return { q: { category }, relaxed: "fd.relaxedAll" as MessageKey, items: [] as ProductSummary[], total: 0 };
}

function Results({ category, cut, section, onRestart }: { category: Category; cut: string; section: string; onRestart: () => void }) {
  const { t } = useT();
  const found = useAsync((signal) => bestMatch(category, cut, section, signal), [category, cut, section]);
  const r = found.data;
  const link = r ? `${CATEGORY_PATH[category]}?${new URLSearchParams(Object.entries({ cut: r.q.cut, section: r.q.section }).filter(([, v]) => v) as string[][])}` : CATEGORY_PATH[category];
  return (
    <section className="av-quiz__result" aria-labelledby="fd-r" aria-live="polite">
      <h2 id="fd-r">{t("fd.result")}</h2>
      {!r ? <Skeleton height={280} /> : (
        <>
          {r.relaxed && <p className="av-small">{t(r.relaxed)}</p>}
          <div className="av-grid-products">
            {r.items.map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={((i + 1) % 6) + 1} />)}
          </div>
          <div className="av-row">
            <Button to={link}>{t("fd.seeAll", { n: r.total })}</Button>
            <Button variant="secondary" onClick={onRestart}>{t("fd.again")}</Button>
          </div>
        </>
      )}
    </section>
  );
}
