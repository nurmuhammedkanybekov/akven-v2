import qrcode from "qrcode-generator";
import { useMemo } from "react";

/** A QR code drawn as one SVG path (crisp at any size, no image file). The text is also given as the label. */
export function QrCode({ text, label, size = 168 }: { text: string; label: string; size?: number }) {
  const { d, n } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { d: path, n: count + 8 };
  }, [text]);
  return (
    <svg className="av-qr" viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#0f1930" />
    </svg>
  );
}

/** What a pickup QR code holds: the shop's prefix and the six digits, so a scanner can tell it from any other code. */
export const pickupQrText = (code: string) => `AKVEN-PICKUP:${code}`;

/** The six digits from a scanned pickup code, or null if it is some other code. */
export function codeFromPickupQr(text: string): string | null {
  const m = /^AKVEN-PICKUP:(\d{6})$/.exec(text.trim());
  return m ? m[1] : null;
}
