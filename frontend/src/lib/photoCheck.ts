/**
 * What the shop does with a photo of a given size, said before it surprises anyone: every frame in the shop is 4:5
 * upright (3:4 or 1:1 on a phone's product page), so a wide photo loses its sides and a small one looks soft.
 * Advice only: the photo is uploaded either way.
 */
export type PhotoNote = "wide" | "small";

export function photoNotes(width: number, height: number): PhotoNote[] {
  const notes: PhotoNote[] = [];
  if (width > height * 1.05) notes.push("wide");
  if (Math.min(width, height) < 1000) notes.push("small");
  return notes;
}

/** The pixel size of an image file, or null where the browser cannot tell (then no advice is given). */
export async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch { return null; }
}
