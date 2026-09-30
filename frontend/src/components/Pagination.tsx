export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="av-pagination" aria-label="Pages">
      <button type="button" className="av-btn av-btn--secondary av-btn--sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="av-small" aria-live="polite">Page {page + 1} of {totalPages}</span>
      <button type="button" className="av-btn av-btn--secondary av-btn--sm" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}
