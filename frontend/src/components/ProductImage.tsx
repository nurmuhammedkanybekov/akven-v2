import { Logo } from "../brand/Logo";
import type { ImageView } from "../api/types";
import { useT } from "../i18n/I18n";

/** Drawn product art (SVG) or a real photograph: the shop moves drawn socks like socks on a line, photos stay still. */
export function imageKind(url: string): "art" | "photo" {
  return /\.svg(\?|#|$)/i.test(url) ? "art" : "photo";
}

/** The backdrops a product picture can stand on (CSS: img[data-stage]): two of Korean hanji paper, two of Kyrgyz felt
 * with a ram's horn pressed into it, and two quiet bojagi patchworks. */
export const STAGES = ["hanji", "hanji-rose", "felt-sage", "felt-sky", "bojagi", "bojagi-celadon"] as const;

/** The same picture always gets the same backdrop; neighbouring socks on a shelf mostly get different ones. */
export function stageFor(url: string): (typeof STAGES)[number] {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 16777619); }
  return STAGES[(h >>> 0) % STAGES.length];
}

/**
 * A product photo, or (until the owners have photographed the product) a calm branded placeholder. The real
 * image has explicit dimensions so the page never jumps while it loads; every frame is 4:5 and crops with cover, so a
 * photograph replaces a drawing without any change to the layout.
 */
export function ProductImage({ image, eager }: { image: ImageView | null | undefined; eager?: boolean }) {
  const { t } = useT();
  if (!image) {
    return (
      <div className="av-imgplaceholder" role="img" aria-label={t("img.soon")}>
        <Logo variant="mark" height={56} />
        <span className="av-eyebrow">{t("img.soon")}</span>
      </div>
    );
  }
  return <img src={image.url} alt={image.alt} width={800} height={1000} loading={eager ? "eager" : "lazy"} decoding="async" data-kind={imageKind(image.url)} data-stage={stageFor(image.url)} />;
}
