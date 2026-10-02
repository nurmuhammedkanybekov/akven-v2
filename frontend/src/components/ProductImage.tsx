import { Logo } from "../brand/Logo";
import type { ImageView } from "../api/types";

/**
 * A product photo, or (until the owners have photographed the product) a calm branded placeholder. The real
 * image has explicit dimensions so the page never jumps while it loads.
 */
export function ProductImage({ image, eager }: { image: ImageView | null | undefined; eager?: boolean }) {
  if (!image) {
    return (
      <div className="av-imgplaceholder" role="img" aria-label="Photo coming soon">
        <Logo variant="mark" height={56} />
        <span className="av-eyebrow">Photo coming soon</span>
      </div>
    );
  }
  return <img src={image.url} alt={image.alt} width={800} height={1000} loading={eager ? "eager" : "lazy"} decoding="async" />;
}
