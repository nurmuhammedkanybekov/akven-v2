import { useT } from "../i18n/I18n";

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const { t } = useT();
  if (totalPages <= 1) return null;
  return (
    <nav className="av-pagination" aria-label={t("page.aria")}>
      <button type="button" className="av-btn av-btn--secondary av-btn--sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>{t("page.prev")}</button>
      <span className="av-small" aria-live="polite">{t("page.of", { n: page + 1, total: totalPages })}</span>
      <button type="button" className="av-btn av-btn--secondary av-btn--sm" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>{t("page.next")}</button>
    </nav>
  );
}
