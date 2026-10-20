import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchProducts } from "../api/endpoints";
import type { ProductSummary } from "../api/types";
import { useT } from "../i18n/I18n";
import { CloseIcon, SearchIcon } from "./icons";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";

const RECENT = "akven-recent-searches";
const readRecent = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(RECENT) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : []; } catch { return []; }
};
const remember = (q: string) => {
  try { localStorage.setItem(RECENT, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 5))); } catch { /* fine */ }
};
const QUICK = ["argyle", "wool", "no-show", "kids", "gift"];

/**
 * Search as you type, the way a good shop does it: results appear after a short pause, arrow keys move through them,
 * Enter opens one (or all results in the catalogue), Escape closes. Recent searches and a few quick ideas fill the empty
 * state. Opens from the header's search button or with "/" anywhere on the page. A combobox with a listbox, for screen
 * readers.
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const navigate = useNavigate();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) { el.showModal?.(); setRecent(readRecent()); setTimeout(() => input.current?.focus(), 0); }
    if (!open && el.open) el.close?.();
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    setActive(-1);
    if (term.length < 2) { setResults(null); return; }
    const ctrl = new AbortController();
    const id = window.setTimeout(() => {
      searchProducts(term, ctrl.signal).then((page) => { setResults(page.items); setTotal(page.totalItems); }).catch(() => undefined);
    }, 180);
    return () => { window.clearTimeout(id); ctrl.abort(); };
  }, [q]);

  function go(path: string, term?: string) {
    if (term) remember(term);
    onClose();
    setQ("");
    navigate(path);
  }
  const all = (term: string) => go(`/shop?q=${encodeURIComponent(term)}`, term);

  function onKey(e: React.KeyboardEvent) {
    const n = results?.length ?? 0;
    if (e.key === "ArrowDown" && n) { e.preventDefault(); setActive((a) => (a + 1) % n); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); setActive((a) => (a <= 0 ? n - 1 : a - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (results && active >= 0) go(`/products/${results[active].slug}`, q.trim());
      else if (q.trim().length >= 2) all(q.trim());
    }
  }

  return (
    <dialog ref={ref} className="av-search" aria-label={t("search.label")} onClose={onClose} onCancel={onClose}
            onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      {open && (
        <div className="av-search__panel">
          <div className="av-search__bar">
            <SearchIcon />
            <input ref={input} className="av-search__input" type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
                   placeholder={t("search.placeholder")} aria-label={t("search.label")} role="combobox" aria-expanded={!!results?.length} aria-controls={listId} aria-autocomplete="list"
                   aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} maxLength={80} autoComplete="off" enterKeyHint="search" />
            <button type="button" className="av-icon-btn" aria-label={t("search.close")} onClick={onClose}><CloseIcon /></button>
          </div>

          {results === null ? (
            <div className="av-search__idle">
              {recent.length > 0 && (
                <div><span className="av-eyebrow">{t("search.recent")}</span>
                  <div className="av-row">{recent.map((r) => <button key={r} type="button" className="av-family__chip" onClick={() => all(r)}>{r}</button>)}</div></div>
              )}
              <div><span className="av-eyebrow">{t("search.try")}</span>
                <div className="av-row">{QUICK.map((r) => <button key={r} type="button" className="av-family__chip" onClick={() => setQ(r)}>{r}</button>)}</div></div>
            </div>
          ) : results.length === 0 ? (
            <p className="av-search__empty">{t("search.none", { q: q.trim() })} <Link to="/finder" onClick={onClose}>{t("fd.cta")}</Link></p>
          ) : (
            <>
              <ul id={listId} role="listbox" className="av-search__results" aria-label={t("search.results")}>
                {results.map((p, i) => (
                  <li key={p.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? "is-active" : undefined}
                      onMouseEnter={() => setActive(i)} onClick={() => go(`/products/${p.slug}`, q.trim())} style={{ "--i": i } as React.CSSProperties}>
                    <span className="av-search__img"><ProductImage image={p.image} /></span>
                    <span className="av-search__name"><strong>{p.name}</strong><span className="av-small av-muted">{[p.section?.name, p.cut?.name].filter(Boolean).join(" · ")}</span></span>
                    <Price amount={p.minPrice} from={p.variantCount > 1} />
                  </li>
                ))}
              </ul>
              <button type="button" className="av-search__all" onClick={() => all(q.trim())}>{t("search.all", { n: total, q: q.trim() })} →</button>
            </>
          )}
          <p className="av-search__keys av-small av-muted" aria-hidden="true">↑ ↓ · Enter · Esc</p>
        </div>
      )}
    </dialog>
  );
}
