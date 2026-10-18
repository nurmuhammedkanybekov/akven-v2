import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { codeFromPickupQr } from "../components/QrCode";
import { useT } from "../i18n/I18n";

interface Detector { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> }
type DetectorClass = new (options: { formats: string[] }) => Detector;

/** The browser's own QR reader (Chrome and Edge on phones and laptops); where there is none the button is not shown. */
const BarcodeDetectorImpl = (globalThis as { BarcodeDetector?: DetectorClass }).BarcodeDetector;

/**
 * Scans a customer's pickup QR code with the device camera and hands the six digits to the form. The camera stops as
 * soon as a code is read or the scanner is closed. The phone ending is still asked for, so a photo of someone else's
 * code is not enough to collect their order.
 */
export function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || !BarcodeDetectorImpl) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const detector = new BarcodeDetectorImpl({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const look = async () => {
          if (stopped || !video.current) return;
          const found = (await detector.detect(video.current).catch(() => [])).map((r) => codeFromPickupQr(r.rawValue)).find(Boolean);
          if (found) { onCode(found); setOpen(false); return; }
          timer = window.setTimeout(look, 250);
        };
        void look();
      } catch { setError(t("a.ho.noCamera")); }
    })();
    return () => { stopped = true; window.clearTimeout(timer); stream?.getTracks().forEach((tr) => tr.stop()); };
  }, [open, onCode, t]);

  if (!BarcodeDetectorImpl) return null;
  return (
    <div className="av-scan">
      {!open && <Button variant="secondary" onClick={() => { setError(null); setOpen(true); }}>{t("a.ho.scan")}</Button>}
      {open && (
        <div className="av-scan__view">
          <video ref={video} muted playsInline aria-label={t("a.ho.camera")} />
          <span className="av-scan__frame" aria-hidden="true" />
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("a.cancel")}</Button>
        </div>
      )}
      {error && <p className="av-small" role="alert">{error}</p>}
    </div>
  );
}
