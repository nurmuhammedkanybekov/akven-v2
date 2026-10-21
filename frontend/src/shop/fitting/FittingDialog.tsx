import { useEffect, useRef } from "react";
import type { Category, ProductSummary } from "../../api/types";
import type { SockCut } from "../../brand/SockArt";
import { CloseIcon } from "../../components/icons";
import { useT } from "../../i18n/I18n";
import { FittingRoom } from "./FittingRoom";

/** The fitting room over the product page, opened on that sock in the colour being looked at. */
export function FittingDialog({ initial, onClose }: {
  initial: { slug: string; cut: SockCut; hex: string | null; category: Category; product?: ProductSummary };
  onClose: () => void;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (el && !el.open) el.showModal?.(); }, []);
  return (
    <dialog ref={ref} className="av-frdialog" aria-labelledby="fr-dialog-title" onClose={onClose} onCancel={onClose}
            onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="av-frdialog__panel">
        <header className="av-frdialog__head">
          <div><span className="av-hand">{t("fr.eyebrow")}</span><h2 id="fr-dialog-title">{t("fr.title")}</h2></div>
          <button type="button" className="av-icon-btn" aria-label={t("qv.close")} onClick={onClose}><CloseIcon /></button>
        </header>
        <FittingRoom initial={initial} onPick={onClose} />
      </div>
    </dialog>
  );
}
