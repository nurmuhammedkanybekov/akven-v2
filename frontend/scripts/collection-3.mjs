/**
 * The classic line: plain and ribbed socks in one colour, in every height, for men, women and children, in the
 * colours people actually buy by the dozen (white, black, grey, navy, beige...), as single pairs and in packs.
 * The demo's everyday basics, next to the patterned collections. Read by generate-product-art.mjs (images, one set
 * per colour) and generate-seed.mjs (V28__seed_classics_and_colour_pictures.sql).
 *
 * `solid: true` means the heel and toe are knitted in a shade of the same colour, so the drawing follows any colour.
 * Variants are made from sizes × colours × packs; stock is a fixed spread of numbers, so the seed is the same every time.
 */
import { SOCK_COLOURS as C } from "../src/brand/sockDrawing.ts";

const SOLID = (cut, pattern = "plain", extra = {}) => ({ cut, main: C.white, accent: C.white, pattern, solid: true, ...extra });

/** Every size in every colour in every pack; a few run low or out, with stock on the way. */
function variants(sizes, colours, packs = [1]) {
  const out = [];
  colours.forEach((colour, ci) => sizes.forEach((size, si) => packs.forEach((pack, pi) => {
    const k = (ci * 7 + si * 13 + pi * 5) % 23;
    const stock = k === 4 ? 0 : k === 9 ? 3 : 30 + ((ci * 31 + si * 17 + pi * 11) % 12) * 10;
    out.push(stock === 0 ? [size, colour, pack, 0, 120, 10 + ci] : [size, colour, pack, stock]);
  })));
  return out;
}

const COTTON = "80% combed cotton / 18% nylon / 2% elastane";
const MEN = ["M", "L"], WOMEN = ["S", "M"], KIDS = ["XS", "S", "M"];

export const COLLECTION_3 = [
  // ---- Men ----
  { slug: "classic-no-show-men", name: "Classic No-Show", category: "MEN", section: "classic", cut: "no-show", collection: "Classics",
    description: "A plain no-show liner with a silicone heel grip, invisible in loafers and trainers. The one to buy by the pack.",
    fabric: "75% cotton / 22% nylon / 3% elastane", quality: "Breathable cotton", price: 3.5, packPrices: { 3: 9, 6: 16 }, tint: "#ebebe9",
    sock: SOLID("no-show"), variants: variants(MEN, ["black", "white", "grey", "navy", "beige"], [1, 3, 6]) },
  { slug: "classic-ankle-men", name: "Classic Ankle", category: "MEN", section: "classic", cut: "ankle", collection: "Classics",
    description: "A plain ankle sock with a soft cuff that stays up. For trainers, the gym and every day in summer.",
    fabric: COTTON, quality: "Soft combed cotton", price: 4, packPrices: { 3: 10.5, 6: 19 }, tint: "#ebebe9",
    sock: SOLID("ankle"), variants: variants(MEN, ["black", "white", "grey", "navy", "charcoal"], [1, 3, 6]) },
  { slug: "classic-rib-crew-men", name: "Classic Rib Crew", category: "MEN", section: "classic", cut: "crew", collection: "Classics",
    description: "The everyday crew in fine rib, in ten colours. Goes under jeans, chinos and suits alike.",
    fabric: COTTON, quality: "Soft combed cotton", price: 5, packPrices: { 3: 13, 10: 40 }, tint: "#ecebe7",
    sock: SOLID("crew", "rib"), variants: variants(MEN, ["black", "white", "grey", "navy", "charcoal", "brown", "beige", "olive", "burgundy", "denim"], [1, 3, 10]) },
  { slug: "classic-dress-crew-men", name: "Classic Dress Sock", category: "MEN", section: "classic", cut: "crew", collection: "Office",
    description: "Thin mercerised cotton with a smooth finish and no visible heel. For shoes, suits and long office days.",
    fabric: "70% mercerised cotton / 28% nylon / 2% elastane", quality: "Mercerised cotton", price: 6, packPrices: { 5: 27 }, tint: "#e8e8ea",
    sock: SOLID("crew", "plain", { heel: false }), variants: variants(MEN, ["black", "navy", "charcoal", "grey", "brown", "burgundy"], [1, 5]) },
  { slug: "classic-mid-calf-men", name: "Classic Mid-Calf", category: "MEN", section: "classic", cut: "mid-long", collection: "Classics",
    description: "A ribbed sock that reaches the middle of the calf, so no skin shows when you sit. For boots and trousers.",
    fabric: COTTON, quality: "Soft combed cotton", price: 5.5, packPrices: { 3: 14.5 }, tint: "#e9e8e4",
    sock: SOLID("mid-long", "rib"), variants: variants(MEN, ["black", "navy", "charcoal", "grey", "brown"], [1, 3]) },
  { slug: "classic-knee-high-men", name: "Classic Over-the-Calf", category: "MEN", section: "classic", cut: "knee-high", collection: "Office",
    description: "Fine-rib knee-highs that never slide down. The tailor's choice under a suit.",
    fabric: "70% mercerised cotton / 28% nylon / 2% elastane", quality: "Mercerised cotton", price: 7, tint: "#e8e8ea",
    sock: SOLID("knee-high", "rib", { heel: false }), variants: variants(MEN, ["black", "navy", "charcoal"]) },
  { slug: "classic-sport-crew-men", name: "Cushioned Sport Crew", category: "MEN", section: "sport", cut: "crew", collection: "Active",
    description: "A plain cushioned crew with a terry sole and arch support. White for the court, black for the gym.",
    fabric: "70% cotton / 27% polyester / 3% elastane", quality: "Cushioned sole", price: 5, packPrices: { 3: 13, 6: 24 }, tint: "#ebebea",
    sock: SOLID("crew", "rib", { grip: false }), variants: variants(MEN, ["white", "black", "grey"], [1, 3, 6]) },
  { slug: "classic-thermal-crew-men", name: "Thermal Crew", category: "MEN", section: "thermal", cut: "crew", collection: "Winter",
    description: "A thick brushed crew in one colour, warm enough for Bishkek in January.",
    fabric: "55% wool / 40% acrylic / 5% elastane", quality: "Warm wool blend", price: 7.5, tint: "#ece6dc",
    sock: SOLID("crew", "plain", { fluffy: true }), variants: variants(MEN, ["charcoal", "navy", "brown", "olive", "grey"]) },

  // ---- Women ----
  { slug: "classic-no-show-women", name: "Classic No-Show", category: "WOMEN", section: "classic", cut: "no-show", collection: "Classics",
    description: "A plain no-show with a silicone heel, cut low for ballet flats and sneakers.",
    fabric: "75% cotton / 22% nylon / 3% elastane", quality: "Breathable cotton", price: 3.5, packPrices: { 3: 9, 6: 16 }, tint: "#f1ebe7",
    sock: SOLID("no-show"), variants: variants(WOMEN, ["beige", "white", "black", "blush", "grey"], [1, 3, 6]) },
  { slug: "classic-ankle-women", name: "Classic Ankle", category: "WOMEN", section: "classic", cut: "ankle", collection: "Classics",
    description: "Plain ankle socks in soft colours. Mix them: the whole bag counts towards the next price step.",
    fabric: COTTON, quality: "Soft combed cotton", price: 4, packPrices: { 3: 10.5 }, tint: "#f1ebe7",
    sock: SOLID("ankle"), variants: variants(WOMEN, ["white", "black", "grey", "pink", "lilac", "sage", "sky"], [1, 3]) },
  { slug: "classic-rib-crew-women", name: "Classic Rib Crew", category: "WOMEN", section: "classic", cut: "crew", collection: "Classics",
    description: "Fine-rib crew socks in nine colours, from cream to navy. Turn them down or wear them straight.",
    fabric: COTTON, quality: "Soft combed cotton", price: 5, packPrices: { 3: 13 }, tint: "#f0ebe6",
    sock: SOLID("crew", "rib"), variants: variants(WOMEN, ["white", "black", "cream", "oat", "blush", "sage", "lilac", "grey", "navy"], [1, 3]) },
  { slug: "classic-mid-calf-women", name: "Classic Mid-Calf", category: "WOMEN", section: "classic", cut: "mid-long", collection: "Classics",
    description: "A plain mid-calf sock for boots and long skirts, in calm colours.",
    fabric: COTTON, quality: "Soft combed cotton", price: 5.5, tint: "#efe9e4",
    sock: SOLID("mid-long"), variants: variants(WOMEN, ["black", "cream", "grey", "camel", "burgundy"]) },
  { slug: "classic-knee-high-women", name: "Classic Knee-High", category: "WOMEN", section: "classic", cut: "knee-high", collection: "Classics",
    description: "Plain ribbed knee-highs for skirts and dresses, in five colours that go with any coat.",
    fabric: "70% cotton / 28% nylon / 2% elastane", quality: "Soft combed cotton", price: 6.5, packPrices: { 2: 12 }, tint: "#efe9e4",
    sock: SOLID("knee-high", "rib"), variants: variants(WOMEN, ["black", "camel", "cream", "grey", "navy"], [1, 2]) },
  { slug: "classic-thermal-crew-women", name: "Soft Thermal Crew", category: "WOMEN", section: "thermal", cut: "crew", collection: "Winter",
    description: "Brushed, thick and soft, in one colour. For the cold walk to the bazaar and the evening at home.",
    fabric: "45% wool / 50% acrylic / 5% elastane", quality: "Brushed, extra soft", price: 7, tint: "#f0e8e6",
    sock: SOLID("crew", "plain", { fluffy: true }), variants: variants(WOMEN, ["oat", "blush", "lilac", "grey", "cream"]) },

  // ---- Kids ----
  { slug: "classic-crew-kids", name: "Classic Crew", category: "KIDS", section: "classic", cut: "crew", collection: "Back to School",
    description: "Plain school socks in soft cotton with a reinforced heel and toe. Five pairs in a pack, or one at a time.",
    fabric: "80% combed cotton / 18% polyester / 2% elastane", quality: "Soft combed cotton", price: 3.5, packPrices: { 5: 15 }, tint: "#ebeef1",
    sock: SOLID("crew", "rib"), variants: variants(KIDS, ["white", "navy", "grey", "black", "pink", "sky"], [1, 5]) },
  { slug: "classic-ankle-kids", name: "Classic Ankle", category: "KIDS", section: "classic", cut: "ankle", collection: "Little Ones",
    description: "Plain ankle socks in bright, easy colours, for summer and for sport class.",
    fabric: "80% combed cotton / 18% polyester / 2% elastane", quality: "Soft combed cotton", price: 3, packPrices: { 5: 13 }, tint: "#eef0ea",
    sock: SOLID("ankle"), variants: variants(KIDS, ["white", "pink", "sky", "mint", "lemon", "grey"], [1, 5]) },
  { slug: "classic-knee-high-kids", name: "School Knee-High", category: "KIDS", section: "classic", cut: "knee-high", collection: "Back to School",
    description: "Plain knee-highs for school uniforms, in the four colours schools ask for.",
    fabric: "75% cotton / 23% nylon / 2% elastane", quality: "Soft combed cotton", price: 4.5, packPrices: { 3: 12 }, tint: "#e9ebf0",
    sock: SOLID("knee-high", "rib"), variants: variants(KIDS, ["white", "navy", "grey", "black"], [1, 3]) },
  { slug: "classic-no-show-kids", name: "Classic No-Show", category: "KIDS", section: "classic", cut: "no-show", collection: "Little Ones",
    description: "Low socks with a heel grip for children's trainers and sandals.",
    fabric: "80% cotton / 17% polyester / 3% elastane", quality: "Breathable cotton", price: 2.5, packPrices: { 5: 11 }, tint: "#f1ece8",
    sock: SOLID("no-show"), variants: variants(KIDS, ["white", "pink", "sky", "grey"], [1, 5]) },
];
