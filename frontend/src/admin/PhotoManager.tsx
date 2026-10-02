import { useRef, useState, type DragEvent } from "react";
import { ApiError } from "../api/client";
import { adminReplaceImages, adminUploadImage } from "../api/endpoints";
import type { AdminProduct } from "../api/types";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { useToast } from "../components/Toast";

const MAX = 8;

/**
 * Photos for one product. Upload (or drop) as many as you like up to 8; the first is the cover. Rearranging,
 * renaming (the alt text that screen readers and Google read) and removing all save immediately.
 */
export function PhotoManager({ product, onChange }: { product: AdminProduct; onChange: (p: AdminProduct) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const images = product.images;

  async function upload(files: File[]) {
    setError(null);
    let current = product;
    for (const [i, file] of files.entries()) {
      if (current.images.length >= MAX) { setError(`A product can have at most ${MAX} photos.`); break; }
      setBusy(`Uploading ${i + 1} of ${files.length}…`);
      try {
        current = await adminUploadImage(product.id, file, "");
        onChange(current);
      } catch (e) {
        setError(`${file.name}: ${e instanceof ApiError ? e.message : "upload failed"}`);
        break;
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
  }

  async function replace(next: Array<{ url: string; alt: string }>, message: string) {
    setBusy("Saving…"); setError(null);
    try { onChange(await adminReplaceImages(product.id, next)); toast(message); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save the photos."); }
    finally { setBusy(null); }
  }
  const asList = () => images.map((i) => ({ url: i.url, alt: i.alt }));
  function move(index: number, by: -1 | 1) {
    const list = asList(); const [item] = list.splice(index, 1); list.splice(index + by, 0, item);
    void replace(list, "Photos rearranged");
  }
  function remove(index: number) { const list = asList(); list.splice(index, 1); void replace(list, "Photo removed"); }
  function rename(index: number, alt: string) {
    if (!alt.trim() || alt === images[index].alt) return;
    const list = asList(); list[index] = { ...list[index], alt: alt.trim() }; void replace(list, "Description saved");
  }
  function drop(e: DragEvent) {
    e.preventDefault(); setOver(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    if (files.length) void upload(files);
  }

  return (
    <section className="av-card-form" id="photos" aria-labelledby="photos-h">
      <h2 className="av-formtitle" id="photos-h">Photos</h2>
      <p className="av-small">The first photo is the cover in the shop. JPEG, PNG or WebP, up to 5 MB each. Until you add photos, the shop shows a neat placeholder.</p>
      {error && <Alert tone="danger">{error}</Alert>}

      {images.length > 0 && (
        <ul className="av-photos">
          {images.map((img, i) => (
            <li key={img.id} className="av-photo">
              <div className="av-photo__img"><img src={img.url} alt={img.alt} width={160} height={200} /></div>
              {i === 0 && <span className="av-badge av-badge--accent">Cover</span>}
              <label className="av-visually-hidden" htmlFor={`alt-${img.id}`}>Description of photo {i + 1}</label>
              <input id={`alt-${img.id}`} className="av-input" defaultValue={img.alt} onBlur={(e) => rename(i, e.target.value)} />
              <div className="av-row">
                <Button size="sm" variant="ghost" disabled={i === 0 || !!busy} aria-label={`Move photo ${i + 1} earlier`} onClick={() => move(i, -1)}>←</Button>
                <Button size="sm" variant="ghost" disabled={i === images.length - 1 || !!busy} aria-label={`Move photo ${i + 1} later`} onClick={() => move(i, 1)}>→</Button>
                <Button size="sm" variant="ghost" disabled={!!busy} aria-label={`Remove photo ${i + 1}`} onClick={() => remove(i)}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length < MAX && (
        <div className={`av-drop${over ? " av-drop--over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
          <p>Drop photos here, or</p>
          <Button variant="secondary" loading={!!busy && busy.startsWith("Uploading")} onClick={() => input.current?.click()}>Choose photos</Button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="Choose photos to upload"
                 onChange={(e) => e.target.files && void upload([...e.target.files])} />
          {busy && <p className="av-small" role="status">{busy}</p>}
        </div>
      )}
    </section>
  );
}
