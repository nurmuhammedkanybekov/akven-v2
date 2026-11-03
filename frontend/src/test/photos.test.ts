import { describe, expect, it } from "vitest";
import { imageKind } from "../components/ProductImage";
import { photoNotes } from "../lib/photoCheck";

describe("getting ready for real photographs", () => {
  it("tells drawn art from a photograph by its file, so only drawn socks swing on the line", () => {
    expect(imageKind("/media/products/ala-too-kids-1.svg")).toBe("art");
    expect(imageKind("/media/products/ala-too-kids-1.svg?v=2")).toBe("art");
    expect(imageKind("/media/uploads/3f2a.jpg")).toBe("photo");
    expect(imageKind("/media/uploads/3f2a.webp")).toBe("photo");
  });

  it("warns about a wide or small photo before the shop crops or stretches it, and is quiet about a good one", () => {
    expect(photoNotes(1200, 1500)).toEqual([]);
    expect(photoNotes(1600, 1000)).toEqual(["wide"]);
    expect(photoNotes(640, 800)).toEqual(["small"]);
    expect(photoNotes(900, 600)).toEqual(["wide", "small"]);
    expect(photoNotes(1500, 1500)).toEqual([]);
  });
});
