import { useRef, useState, type DragEvent } from "react";
import { ApiError } from "../api/client";
import { adminReplaceImages, adminUploadImage } from "../api/endpoints";
import type { AdminProduct } from "../api/types";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { useToast } from "../components/Toast";
import { useT } from "../i18n/I18n";

const MAX = 40;

/**
 * Photos for one product. Upload (or drop) as many as you like up to 40; the first is the cover. Each photo can belong
 * to one colour: choosing that colour in the shop shows its photos. Rearranging, renaming (the alt text that screen
 * readers and Google read), the colour and removing all save immediately.
 */
export function PhotoManager({ product, onChange }: { product: AdminProduct; onChange: (p: AdminProduct) => void }) {
  const toast = useToast();
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const images = product.images;

  async function upload(files: File[]) {
    setError(null);
    let current = product;
    for (const [i, file] of files.entries()) {
      if (current.images.length >= MAX) { setError(t("a.ph.max", { n: MAX })); break; }
      setBusy(t("a.ph.uploading", { i: i + 1, n: files.length }));
      try {
        current = await adminUploadImage(product.id, file, "");
        onChange(current);
      } catch (e) {
        setError(`${file.name}: ${e instanceof ApiError ? e.message : t("a.ph.failed")}`);
        break;
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
  }

  type Item = { url: string; alt: string; color: string | null };
  async function replace(next: Item[], message: string) {
    setBusy(t("a.saving")); setError(null);
    try { onChange(await adminReplaceImages(product.id, next)); toast(message); }
    catch (e) { setError(e instanceof ApiError ? e.message : t("a.ph.saveFailed")); }
    finally { setBusy(null); }
  }
  const asList = (): Item[] => images.map((i) => ({ url: i.url, alt: i.alt, color: i.color ?? null }));
  const colours = [...new Set(product.variants.map((v) => v.color).filter((c): c is string => !!c))];
  function recolour(index: number, color: string) {
    const list = asList(); list[index] = { ...list[index], color: color || null }; void replace(list, t("a.ph.recoloured"));
  }
  function move(index: number, by: -1 | 1) {
    const list = asList(); const [item] = list.splice(index, 1); list.splice(index + by, 0, item);
    void replace(list, t("a.ph.moved"));
  }
  function remove(index: number) { const list = asList(); list.splice(index, 1); void replace(list, t("a.ph.removed")); }
  function rename(index: number, alt: string) {
    if (!alt.trim() || alt === images[index].alt) return;
    const list = asList(); list[index] = { ...list[index], alt: alt.trim() }; void replace(list, t("a.ph.renamed"));
  }
  function drop(e: DragEvent) {
    e.preventDefault(); setOver(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    if (files.length) void upload(files);
  }

  return (
    <section className="av-card-form" id="photos" aria-labelledby="photos-h">
      <h2 className="av-formtitle" id="photos-h">{t("a.ph.title")}</h2>
      <p className="av-small">{t("a.ph.lead")}</p>
      {error && <Alert tone="danger">{error}</Alert>}

      {images.length > 0 && (
        <ul className="av-photos">
          {images.map((img, i) => (
            <li key={img.id} className="av-photo">
              <div className="av-photo__img"><img src={img.url} alt={img.alt} width={160} height={200} /></div>
              {i === 0 && <span className="av-badge av-badge--accent">{t("a.ph.cover")}</span>}
              <label className="av-visually-hidden" htmlFor={`alt-${img.id}`}>{t("a.ph.alt", { n: i + 1 })}</label>
              <input id={`alt-${img.id}`} className="av-input" defaultValue={img.alt} onBlur={(e) => rename(i, e.target.value)} />
              {colours.length > 0 && (
                <select className="av-select" aria-label={t("a.ph.colourFor", { n: i + 1 })} value={img.color ?? ""} disabled={!!busy} onChange={(e) => recolour(i, e.target.value)}>
                  <option value="">{t("a.ph.allColours")}</option>
                  {colours.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <div className="av-row">
                <Button size="sm" variant="ghost" disabled={i === 0 || !!busy} aria-label={t("a.ph.earlier", { n: i + 1 })} onClick={() => move(i, -1)}>←</Button>
                <Button size="sm" variant="ghost" disabled={i === images.length - 1 || !!busy} aria-label={t("a.ph.later", { n: i + 1 })} onClick={() => move(i, 1)}>→</Button>
                <Button size="sm" variant="ghost" disabled={!!busy} aria-label={t("a.ph.removeN", { n: i + 1 })} onClick={() => remove(i)}>{t("a.remove")}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length < MAX && (
        <div className={`av-drop${over ? " av-drop--over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
          <p>{t("a.ph.drop")}</p>
          <Button variant="secondary" loading={!!busy && busy !== t("a.saving")} onClick={() => input.current?.click()}>{t("a.ph.choose")}</Button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label={t("a.ph.chooseAria")}
                 onChange={(e) => e.target.files && void upload([...e.target.files])} />
          {busy && <p className="av-small" role="status">{busy}</p>}
        </div>
      )}
    </section>
  );
}
