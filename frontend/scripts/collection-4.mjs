/**
 * The fourth demo collection, which doubles every shelf: more classics in every height, more everyday casual socks,
 * sport, winter wool, home socks, the heritage line and six more gift boxes. Same rules as collection-2.mjs: one list
 * that both scripts read (generate-product-art.mjs draws the pictures, a picture per colour; generate-seed.mjs writes
 * backend/src/main/resources/db/seed/V31__seed_collection_4.sql for the demo profile only).
 *
 * Written compactly: each sock gives its colours (SOCK_COLOURS names, the first is the one drawn on the card) and the
 * variants follow from the shelf: men M and L, women S and M, children XS, S and M, single pairs, and a 3-pack for the
 * classics. Stock is made up but varied, with a few options low or on their way. Names, prices and stock are
 * examples; the owners replace them from the admin.
 */
import { SOCK_COLOURS as C } from "../src/brand/sockDrawing.ts";

const S = (cut, main, accent, pattern = "plain", extra = {}) => ({ cut, main: C[main], accent: C[accent], pattern, ...extra, ...(extra.second ? { second: C[extra.second] ?? extra.second } : {}) });

const COTTON = "80% combed cotton / 18% nylon / 2% elastane";
const SOFT = "Soft combed cotton";
const FAB = {
  cotton: [COTTON, SOFT],
  fine: ["70% mercerised cotton / 28% nylon / 2% elastane", "Mercerised cotton"],
  sport: ["70% cotton / 27% polyester / 3% elastane", "Cushioned sole"],
  wool: ["60% wool / 37% nylon / 3% elastane", "Warm wool blend"],
  bamboo: ["75% bamboo viscose / 22% nylon / 3% elastane", "Cool bamboo"],
  fleece: ["90% polyester / 8% nylon / 2% elastane", "Soft brushed yarn"],
};
const SIZES = { MEN: ["M", "L"], WOMEN: ["S", "M"], KIDS: ["XS", "S", "M"] };

function hex(c) { return C[c] ?? c; }
function tintOf(main) {
  const a = hex(main).slice(1).match(/../g).map((h) => parseInt(h, 16)), b = [0xf3, 0xee, 0xe5];
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * 0.84).toString(16).padStart(2, "0")).join("");
}

let n = 0;
/** One sock product. colours[0] is the colour on its card; every colour gets its own picture. */
function P(slug, name, category, section, cut, collection, price, sock, colours, description, { fab = "cotton", packs = [1] } = {}) {
  const variants = [];
  for (const colour of colours) for (const size of SIZES[category]) for (const pack of packs) {
    n++;
    const stock = n % 23 === 0 ? 0 : n % 11 === 0 ? 4 : 30 + ((n * 37) % 90);
    variants.push(stock === 0 ? [size, colour, pack, 0, 60, 7 + (n % 9)] : [size, colour, pack, stock]);
  }
  const [fabric, quality] = FAB[fab];
  return { slug, name, category, section, cut, collection, description, fabric, quality, price, tint: tintOf(colours[0]), sock: { ...sock, main: hex(colours[0]) }, variants };
}
/** A gift box: its colour, ribbon and emblem, and the pairs inside. */
function B(slug, name, collection, price, box, description, stock = 40) {
  return { slug, name, category: "BUNDLES", section: null, cut: null, collection, description, fabric: "Mixed, see each pair",
    quality: "Gift box", price, tint: tintOf(box.colourKey), box: { ...box, colour: hex(box.colourKey), ribbon: hex(box.ribbon) },
    variants: [[null, box.colourKey, 1, stock]] };
}

export const COLLECTION_4 = [
  // ---- Classic: the everyday colours, in every height ----
  P("fine-rib-dress-men", "Fine Rib Dress Sock", "MEN", "classic", "crew", "Office", 6.5, S("crew", "navy", "navy", "rib", { heel: false }), ["navy", "black", "charcoal", "brown"], "A thin rib that sits flat under suit trousers and stays up through a long day.", { fab: "fine", packs: [1, 3] }),
  P("over-calf-business", "Over-the-Calf Business Sock", "MEN", "classic", "knee-high", "Office", 7.5, S("knee-high", "black", "black", "rib", { heel: false }), ["black", "navy", "charcoal"], "Reaches just below the knee, so no skin shows when you cross your legs at a meeting.", { fab: "fine" }),
  P("bird-eye-crew", "Bird's-Eye Crew", "MEN", "classic", "crew", "Office", 7, S("crew", "charcoal", "grey", "pinstripe", { heel: false }), ["charcoal", "navy", "brown"], "A tiny two-colour dot pattern, the way a good suit cloth is woven.", { fab: "fine" }),
  P("classic-mid-men", "Classic Mid-Calf", "MEN", "classic", "mid-long", "Classics", 5.5, S("mid-long", "black", "grey"), ["black", "navy", "grey", "brown"], "A plain sock that ends at mid-calf, for boots and trousers alike.", { packs: [1, 3] }),
  P("grip-no-show-men", "Grip No-Show", "MEN", "classic", "no-show", "Classics", 3.5, S("no-show", "black", "charcoal"), ["black", "white", "grey"], "Cut low under loafers and trainers, with a silicone grip at the heel so it stays on.", { packs: [1, 3] }),
  P("cotton-ankle-men", "Everyday Cotton Ankle", "MEN", "classic", "ankle", "Classics", 4, S("ankle", "white", "grey"), ["white", "black", "grey", "navy"], "Just over the ankle bone, in soft cotton that does not slip down.", { packs: [1, 3] }),
  P("pin-dot-dress", "Pin Dot Dress Sock", "MEN", "classic", "crew", "Office", 7, S("crew", "navy", "gold", "dots", { heel: false }), ["navy", "burgundy", "black"], "Small gold dots on a dark ground: plain from across the room, a detail up close.", { fab: "fine" }),
  P("herringbone-crew", "Herringbone Crew", "MEN", "classic", "crew", "Office", 7.5, S("crew", "brown", "camel", "zigzag", { heel: false }), ["brown", "charcoal", "olive"], "The tweed jacket's pattern, in fine cotton, for brown shoes and autumn colours.", { fab: "fine" }),
  P("classic-crew-women", "Classic Crew", "WOMEN", "classic", "crew", "Classics", 4.5, S("crew", "white", "grey"), ["white", "black", "oat", "blush", "grey"], "The sock every drawer needs, in the colours bought by the dozen.", { packs: [1, 3] }),
  P("fine-knee-high-women", "Fine Knee-High", "WOMEN", "classic", "knee-high", "Classics", 6, S("knee-high", "black", "black", "rib", { heel: false }), ["black", "navy", "camel", "burgundy"], "A thin ribbed knee sock for skirts and dresses in the colder months.", { fab: "fine" }),
  P("classic-mid-women", "Classic Mid-Calf", "WOMEN", "classic", "mid-long", "Classics", 5, S("mid-long", "oat", "beige"), ["oat", "black", "grey", "rose"], "Ends at mid-calf, for ankle boots and wide trousers.", { packs: [1, 3] }),
  P("cotton-ankle-women", "Everyday Cotton Ankle", "WOMEN", "classic", "ankle", "Classics", 3.5, S("ankle", "white", "beige"), ["white", "black", "blush", "sky", "sage"], "Soft cotton just over the ankle, for trainers and summer shoes.", { packs: [1, 3] }),
  P("lace-no-show", "Lace-Edge No-Show", "WOMEN", "classic", "no-show", "Classics", 3.5, S("no-show", "beige", "beige", "plain", { lace: true, second: "#ffffff" }), ["beige", "black", "white"], "Hidden in ballet flats, with a soft lace edge and a grip at the heel."),
  P("ribbed-crew-women", "Ribbed Crew", "WOMEN", "classic", "crew", "Classics", 5, S("crew", "cream", "cream", "rib", { heel: false }), ["cream", "black", "camel", "lilac"], "A wide rib in soft cotton, worn pushed down over the ankle or pulled straight.", { packs: [1, 3] }),
  P("dot-dress-women", "Little Dot Crew", "WOMEN", "classic", "crew", "Office", 5.5, S("crew", "black", "white", "dots"), ["black", "navy", "burgundy"], "White pin dots on a dark sock: the quiet detail for office shoes.", { fab: "fine" }),
  P("classic-crew-kids-2", "School Crew", "KIDS", "classic", "crew", "School", 3, S("crew", "white", "grey"), ["white", "navy", "grey", "black"], "The school sock, in white and the uniform colours, with a reinforced heel.", { packs: [1, 3] }),
  P("classic-ankle-kids-2", "Everyday Ankle", "KIDS", "classic", "ankle", "Classics", 2.5, S("ankle", "white", "sky"), ["white", "sky", "pink", "mint"], "Short and soft, for trainers and the playground.", { packs: [1, 3] }),
  P("school-tights-sock", "School Knee Sock", "KIDS", "classic", "knee-high", "School", 4, S("knee-high", "white", "white", "rib", { heel: false }), ["white", "navy", "grey"], "A knee sock for the school uniform, with a cuff that stays up all day."),
  P("classic-mid-kids", "Classic Mid-Calf", "KIDS", "classic", "mid-long", "Classics", 3.5, S("mid-long", "navy", "grey"), ["navy", "grey", "red"], "A little higher on the leg, for boots and cold mornings."),
  P("no-show-kids", "Little No-Show", "KIDS", "classic", "no-show", "Classics", 2.5, S("no-show", "white", "grey"), ["white", "pink", "sky"], "Hidden in summer sandals and slip-ons, with a heel grip that holds."),
  P("navy-gold-argyle-men", "Navy Argyle", "MEN", "classic", "crew", "Office", 7.5, S("crew", "navy", "gold", "argyle", { second: "cream" }), ["navy", "charcoal"], "The argyle in navy and gold, a little bolder, for the man who wears it on Fridays.", { fab: "fine" }),
  P("argyle-knee-women", "Argyle Knee-High", "WOMEN", "classic", "knee-high", "Classics", 7, S("knee-high", "camel", "burgundy", "argyle", { second: "cream" }), ["camel", "grey"], "A schoolgirl classic grown up: argyle knee socks for skirts and loafers."),
  P("argyle-kids-crew", "Little Argyle", "KIDS", "classic", "crew", "Classics", 4, S("crew", "red", "navy", "argyle", { second: "white" }), ["red", "navy"], "A small argyle for small feet, for holidays and the family photo."),
  P("pinstripe-women", "Pinstripe Crew", "WOMEN", "classic", "crew", "Office", 5.5, S("crew", "navy", "white", "pinstripe", { heel: false }), ["navy", "black", "grey"], "A fine stripe for trouser suits and loafers.", { fab: "fine" }),

  // ---- Casual: colour and pattern for every day ----
  P("breton-stripe-crew", "Breton Stripe Crew", "MEN", "casual", "crew", "Riviera", 6.5, S("crew", "white", "navy", "stripes"), ["white", "cream"], "Navy stripes on white, like a sailor's top, with jeans rolled at the ankle."),
  P("breton-stripe-women", "Breton Stripe Ankle", "WOMEN", "casual", "ankle", "Riviera", 5, S("ankle", "white", "navy", "stripes"), ["white", "cream"], "The sailor stripe, cut short for summer trainers."),
  P("gingham-crew-women", "Gingham Crew", "WOMEN", "casual", "crew", "Garden", 6, S("crew", "white", "rose", "gingham"), ["white", "ice"], "A picnic-cloth check in rose on white, soft and a little old-fashioned."),
  P("cherry-ankle-women", "Cherry Ankle", "WOMEN", "casual", "ankle", "Garden", 5, S("ankle", "cream", "red", "cherries"), ["cream", "blush"], "Little red cherries on cream, for summer dresses and white trainers."),
  P("lemon-crew-women", "Lemon Crew", "WOMEN", "casual", "crew", "Garden", 6, S("crew", "sky", "lemon", "lemons"), ["sky", "white"], "Lemons on pale blue: a sock that looks like a holiday."),
  P("daisy-crew-women", "Daisy Crew", "WOMEN", "casual", "crew", "Garden", 6, S("crew", "sage", "white", "flowers", { second: "lemon" }), ["sage", "lilac"], "White daisies scattered on soft green, for spring."),
  P("star-crew-men", "Little Stars Crew", "MEN", "casual", "crew", "Night", 6.5, S("crew", "ink", "gold", "stars"), ["ink", "charcoal"], "Gold stars on ink blue, a small surprise when you sit down."),
  P("moon-crew-women", "Moon Crew", "WOMEN", "casual", "crew", "Night", 6, S("crew", "plum", "lemon", "moons"), ["plum", "ink"], "Crescent moons on deep plum, for night owls."),
  P("pastel-tie-dye-crew", "Pastel Tie-Dye Crew", "WOMEN", "casual", "crew", "Summer", 6.5, S("crew", "lilac", "sky", "tiedye", { second: "peach" }), ["lilac", "peach"], "Soft swirls of lilac, sky and peach, every pair a little different."),
  P("tie-dye-men", "Tie-Dye Crew", "MEN", "casual", "crew", "Summer", 7, S("crew", "teal", "lemon", "tiedye", { second: "orange" }), ["teal", "denim"], "Summer festival colours in soft cotton, for sandals and shorts."),
  P("ombre-crew-women", "Sunset Ombre Crew", "WOMEN", "casual", "crew", "Summer", 6.5, S("crew", "peach", "coral", "ombre", { second: "plum" }), ["peach", "ice"], "Fades from peach to plum, like the sky over Issyk-Kul in the evening."),
  P("three-block-crew", "Three Block Crew", "MEN", "casual", "crew", "Studio", 7, S("crew", "mustard", "navy", "colorblock", { second: "terracotta" }), ["mustard", "teal"], "Three bold blocks of colour, cuff, leg and foot."),
  P("colour-block-ankle", "Colour Block Ankle", "WOMEN", "casual", "ankle", "Studio", 5, S("ankle", "blush", "berry", "colorblock", { second: "lemon" }), ["blush", "sky"], "Pastel blocks for a plain outfit that wants one bright thing."),
  P("waves-crew", "Waves Crew", "MEN", "casual", "crew", "Issyk-Kul", 7, S("crew", "denim", "ice", "waves", { second: "ivory" }), ["denim", "teal"], "White waves on lake blue, from summers at Issyk-Kul."),
  P("leopard-ankle", "Leopard Ankle", "WOMEN", "casual", "ankle", "Studio", 5.5, S("ankle", "camel", "brown", "leopard", { second: "black" }), ["camel", "blush"], "A small leopard spot, for loafers and black trousers."),
  P("night-leopard-crew", "Night Leopard Crew", "WOMEN", "casual", "crew", "Studio", 6.5, S("crew", "black", "camel", "leopard", { second: "brown" }), ["black", "camel"], "Leopard on black, the bolder one."),
  P("arcade-heart-crew", "Arcade Heart Crew", "MEN", "casual", "crew", "Arcade", 6.5, S("crew", "black", "red", "pixel"), ["black", "navy"], "Eight-bit hearts, for the gamer who gets cold feet."),
  P("checker-ankle", "Checkerboard Ankle", "WOMEN", "casual", "ankle", "Retro", 5, S("ankle", "white", "black", "checker"), ["white", "lilac"], "Black and white checks cut short, for skate shoes."),
  P("bands-crew", "Varsity Bands Crew", "MEN", "casual", "crew", "Retro", 6, S("crew", "white", "burgundy", "bands", { second: "navy" }), ["white", "cream"], "Two bands at the top, the college sock from old photographs.", { packs: [1, 3] }),
  P("bands-ankle-women", "Varsity Ankle", "WOMEN", "casual", "ankle", "Retro", 4.5, S("ankle", "white", "forest", "bands", { second: "lemon" }), ["white"], "Short white socks with green and yellow bands, for tennis shoes."),
  P("multistripe-crew-men", "Bazaar Stripe Crew", "MEN", "casual", "crew", "Bazaar", 7, S("crew", "navy", "mustard", "multistripe", { second: "terracotta" }), ["navy", "charcoal"], "Every colour on the stall, in narrow stripes."),
  P("houndstooth-women", "Houndstooth Crew", "WOMEN", "casual", "crew", "Office", 6.5, S("crew", "black", "ivory", "houndstooth"), ["black", "camel"], "The tailor's check in black and ivory, for a wool coat and boots.", { fab: "fine" }),
  P("cat-crew-women", "Cat Crew", "WOMEN", "casual", "crew", "Pets", 6, S("crew", "grey", "pink", "cat"), ["grey", "black"], "A cat face at the cuff, ears and all."),
  P("paws-ankle-women", "Paws Ankle", "WOMEN", "casual", "ankle", "Pets", 5, S("ankle", "oat", "brown", "paws"), ["oat", "grey"], "Little paw prints walking up the ankle."),
  P("mountain-crew-women", "Ala-Too Crew", "WOMEN", "casual", "crew", "Ala-Too", 7, S("crew", "ice", "slate", "mountains", { second: "ivory" }), ["ice", "sage"], "The mountains above Bishkek on a pale blue morning."),
  P("skyline-crew-women", "Night City Crew", "WOMEN", "casual", "crew", "Seoul", 7, S("crew", "plum", "ink", "skyline", { second: "lemon" }), ["plum", "indigo"], "Lit windows of a city at night, on plum."),
  P("sparkle-crew", "Sparkle Crew", "WOMEN", "casual", "crew", "Evening", 7.5, S("crew", "black", "gold", "sparkle", { second: "#ffffff" }), ["black", "burgundy"], "A thread of gold that catches the light, for the theatre and the toi."),
  P("cherry-kids", "Cherry Crew", "KIDS", "casual", "crew", "Garden", 4, S("crew", "white", "red", "cherries"), ["white", "pink"], "Red cherries for little feet."),
  P("rainbow-kids", "Rainbow Crew", "KIDS", "casual", "crew", "Play", 4, S("crew", "white", "red", "rainbow"), ["white", "sky"], "A rainbow round the leg, for rainy days.", { packs: [1, 3] }),
  P("star-kids", "Star Crew", "KIDS", "casual", "crew", "Night", 4, S("crew", "navy", "lemon", "stars"), ["navy", "lilac"], "Yellow stars for bedtime stories and school days."),
  P("lemon-kids", "Lemon Ankle", "KIDS", "casual", "ankle", "Garden", 3.5, S("ankle", "mint", "lemon", "lemons"), ["mint", "white"], "Lemons on mint, for summer sandals."),
  P("tie-dye-kids", "Tie-Dye Crew", "KIDS", "casual", "crew", "Summer", 4, S("crew", "sky", "pink", "tiedye", { second: "lemon" }), ["sky", "lilac"], "Swirls of colour, no two pairs alike."),

  // ---- Sport ----
  P("run-light-no-show", "Run Light No-Show", "MEN", "sport", "no-show", "Active", 5, S("no-show", "black", "orange", "plain", { grip: true, second: "white" }), ["black", "white"], "Thin and quick-drying for running shoes, with a heel tab against rubbing.", { fab: "sport", packs: [1, 3] }),
  P("run-light-women", "Run Light Ankle", "WOMEN", "sport", "ankle", "Active", 5, S("ankle", "white", "coral", "stripes"), ["white", "black", "lilac"], "A running sock with a mesh top and a padded heel.", { fab: "sport", packs: [1, 3] }),
  P("trail-mid-men", "Trail Mid Sock", "MEN", "sport", "mid-long", "Active", 8, S("mid-long", "olive", "orange", "compression"), ["olive", "charcoal"], "Thick under the foot and firm round the arch, for the trails above Ala-Archa.", { fab: "sport" }),
  P("trail-mid-women", "Trail Mid Sock", "WOMEN", "sport", "mid-long", "Active", 8, S("mid-long", "slate", "coral", "compression"), ["slate", "sage"], "A hiking sock with cushioning where the boot presses.", { fab: "sport" }),
  P("tennis-crew", "Tennis Crew", "MEN", "sport", "crew", "Club", 5.5, S("crew", "white", "forest", "bands", { second: "navy" }), ["white"], "White with two club bands, cushioned for the court.", { fab: "sport", packs: [1, 3] }),
  P("tennis-ankle-women", "Tennis Ankle", "WOMEN", "sport", "ankle", "Club", 4.5, S("ankle", "white", "pink", "bands", { second: "navy" }), ["white"], "A short court sock with a pom-pom at the heel.", { fab: "sport" }),
  P("football-knee", "Football Knee Sock", "MEN", "sport", "knee-high", "Fan", 7, S("knee-high", "red", "white", "stripes", { heel: false }), ["red", "navy", "forest"], "A long team sock with bands at the top, for Sunday matches.", { fab: "sport" }),
  P("football-kids-knee", "Junior Football Sock", "KIDS", "sport", "knee-high", "Fan", 5, S("knee-high", "denim", "white", "stripes", { heel: false }), ["denim", "red", "forest"], "The long sock for the school football team, over the shin guards.", { fab: "sport" }),
  P("compression-run-women", "Compression Run", "WOMEN", "sport", "knee-high", "Active", 11, S("knee-high", "black", "coral", "compression"), ["black", "lilac"], "Graduated support up the calf for long runs and long flights.", { fab: "sport" }),
  P("yoga-grip-toe", "Yoga Toe Grip", "WOMEN", "sport", "no-show", "Studio", 6, S("no-show", "blush", "blush", "plain", { toes: true, grip: true, second: "white" }), ["blush", "sage", "black"], "Five toes and a grip sole, for yoga and pilates on a smooth floor.", { fab: "sport" }),
  P("sport-crew-kids", "Kids Sport Crew", "KIDS", "sport", "crew", "Active", 3.5, S("crew", "white", "denim", "stripes"), ["white", "grey"], "Cushioned for P.E. and the playground.", { fab: "sport", packs: [1, 3] }),
  P("cycling-crew", "Cycling Crew", "MEN", "sport", "crew", "Active", 6.5, S("crew", "black", "lemon", "bands", { second: "white" }), ["black", "white"], "A thin, tall cycling sock with a yellow band that cars see.", { fab: "sport" }),
  P("ski-sock", "Ski Sock", "MEN", "sport", "knee-high", "Winter", 13, S("knee-high", "charcoal", "orange", "compression"), ["charcoal", "navy"], "Padded at the shin and the heel, for Karakol and Chunkurchak.", { fab: "wool" }),
  P("ski-sock-women", "Ski Sock", "WOMEN", "sport", "knee-high", "Winter", 12, S("knee-high", "ice", "berry", "compression"), ["ice", "lilac"], "A padded wool ski sock for the slopes and the walk back.", { fab: "wool" }),

  // ---- Thermal ----
  P("wool-crew-heavy", "Heavy Wool Crew", "MEN", "thermal", "crew", "Winter", 9, S("crew", "charcoal", "grey", "rib"), ["charcoal", "oat", "navy"], "Thick wool for January in Bishkek, under any boot.", { fab: "wool" }),
  P("wool-crew-women", "Soft Wool Crew", "WOMEN", "thermal", "crew", "Winter", 8.5, S("crew", "oat", "beige", "rib"), ["oat", "grey", "blush"], "A softer wool for cold offices and cold flats.", { fab: "wool" }),
  P("thermal-mid-men", "Thermal Mid-Calf", "MEN", "thermal", "mid-long", "Winter", 8, S("mid-long", "black", "grey", "rib"), ["black", "navy"], "Brushed on the inside, for the bus stop at seven in the morning.", { fab: "fleece" }),
  P("cable-knee-women", "Cable Knee-High", "WOMEN", "thermal", "knee-high", "Winter", 11, S("knee-high", "cream", "cream", "cable", { heel: false }), ["cream", "camel", "grey"], "Thick cables up the leg, to wear over tights with boots.", { fab: "wool" }),
  P("snowflake-crew-men", "Snowflake Crew", "MEN", "thermal", "crew", "Winter", 8.5, S("crew", "navy", "white", "snow"), ["navy", "red"], "Snowflakes on navy, the New Year sock.", { fab: "wool" }),
  P("fair-isle-crew-women", "Fair Isle Crew", "WOMEN", "thermal", "crew", "Winter", 9.5, S("crew", "burgundy", "cream", "fairisle", { second: "ivory" }), ["burgundy", "forest"], "A Nordic yoke on deep red wool.", { fab: "wool" }),
  P("thermal-kids", "Warm Kids Crew", "KIDS", "thermal", "crew", "Winter", 5, S("crew", "red", "white", "snow"), ["red", "navy"], "Warm wool socks with snowflakes, for sledging.", { fab: "wool" }),
  P("thermal-kids-knee", "Warm Knee Sock", "KIDS", "thermal", "knee-high", "Winter", 6, S("knee-high", "grey", "grey", "rib", { heel: false }), ["grey", "navy"], "A wool knee sock for felt boots and long walks to school.", { fab: "wool" }),
  P("alpaca-touch-crew", "Alpaca-Touch Crew", "WOMEN", "thermal", "crew", "Winter", 10, S("crew", "camel", "camel", "plain", { fluffy: true }), ["camel", "cream"], "A brushed, fluffy yarn that feels like alpaca, for the softest winter.", { fab: "fleece" }),
  P("boot-sock-men", "Work Boot Sock", "MEN", "thermal", "mid-long", "Winter", 9, S("mid-long", "grey", "red", "bands", { second: "white" }), ["grey", "oat"], "The heavy grey sock with a red band, for work boots and the dacha.", { fab: "wool" }),
  P("leg-warm-knee", "Thermal Knee-High", "MEN", "thermal", "knee-high", "Winter", 10, S("knee-high", "charcoal", "charcoal", "rib", { heel: false }), ["charcoal", "black"], "A brushed knee sock for fishing and long winter shifts outdoors.", { fab: "fleece" }),
  P("thermal-ankle-women", "Thermal Ankle", "WOMEN", "thermal", "ankle", "Winter", 6, S("ankle", "rose", "rose", "plain", { fluffy: true }), ["rose", "grey"], "A short, brushed sock for indoor shoes in winter.", { fab: "fleece" }),

  // ---- Home ----
  P("cosy-house-socks", "Cosy House Socks", "WOMEN", "home", "mid-long", "Home", 8, S("mid-long", "blush", "white", "plain", { fluffy: true, grip: true, heel: false }), ["blush", "sage", "oat"], "Thick, fluffy and with a grip sole, for the kitchen tiles.", { fab: "fleece" }),
  P("cosy-house-men", "House Socks", "MEN", "home", "crew", "Home", 8, S("crew", "charcoal", "grey", "plain", { fluffy: true, grip: true }), ["charcoal", "navy"], "Warm, soft and non-slip, for the evening at home.", { fab: "fleece" }),
  P("pompom-home", "Pom-Pom Ankle", "WOMEN", "home", "ankle", "Home", 6.5, S("ankle", "cream", "rose", "plain", { pompom: true, fluffy: true }), ["cream", "lilac"], "A fluffy ankle sock with a pom-pom at the heel."),
  P("bear-home-kids", "Bear House Socks", "KIDS", "home", "crew", "Home", 5.5, S("crew", "brown", "beige", "bear", { grip: true, second: "cream" }), ["brown", "oat"], "Bear ears at the cuff and grips on the sole.", { fab: "fleece" }),
  P("bunny-home-kids", "Bunny House Socks", "KIDS", "home", "crew", "Home", 5.5, S("crew", "white", "pink", "bunny", { grip: true, second: "pink" }), ["white", "lilac"], "Bunny ears and a non-slip sole, for running around the flat.", { fab: "fleece" }),
  P("sleep-socks", "Sleep Socks", "WOMEN", "home", "mid-long", "Home", 7, S("mid-long", "lilac", "white", "moons", { fluffy: true, heel: false }), ["lilac", "ice"], "Loose at the top and soft as a blanket, for cold nights.", { fab: "fleece" }),

  // ---- Heritage: Kyrgyz patterns, knitted in Korea ----
  P("oimo-ankle-women", "Oimo Ankle", "WOMEN", "heritage", "ankle", "Heritage", 5.5, S("ankle", "ivory", "brick", "oimo", { second: "gold" }), ["ivory", "navy"], "The oimo diamond band round the ankle."),
  P("shyrdak-knee", "Shyrdak Knee-High", "WOMEN", "heritage", "knee-high", "Heritage", 9, S("knee-high", "red", "ivory", "shyrdak", { second: "navy" }), ["red", "navy"], "The ram's-horn curl of a felt carpet, all the way up the leg."),
  P("shyrdak-kids", "Little Shyrdak", "KIDS", "heritage", "crew", "Heritage", 4.5, S("crew", "ivory", "red", "shyrdak", { second: "navy" }), ["ivory", "sky"], "Our grandmothers' pattern, for the smallest feet."),
  P("oimo-mid-men", "Oimo Mid-Calf", "MEN", "heritage", "mid-long", "Heritage", 8, S("mid-long", "navy", "gold", "oimo", { second: "brick" }), ["navy", "black"], "A tall sock with the oimo band in gold, for a suit on Independence Day."),
  P("tunduk-crew", "Tunduk Crew", "MEN", "heritage", "crew", "Heritage", 8.5, S("crew", "brick", "gold", "oimo", { second: "ivory" }), ["brick", "forest"], "Brick red with the yurt's crown pattern, warm as the hearth under it."),
  P("ala-too-kids", "Ala-Too Ankle", "KIDS", "heritage", "ankle", "Ala-Too", 3.5, S("ankle", "sky", "slate", "mountains", { second: "ivory" }), ["sky", "mint"], "Snowy mountains for little hikers."),

  // ---- Gift boxes ----
  B("office-classics-box", "Office Classics Box", "Office", 30, { colourKey: "navy", ribbon: "gold", emblem: "week",
    socks: [S("crew", "navy", "gold", "dots", { heel: false }), S("crew", "brown", "camel", "zigzag", { heel: false }), S("knee-high", "black", "black", "rib", { heel: false }), S("crew", "charcoal", "grey", "pinstripe", { heel: false })] },
    "Four office socks for a new job or a promotion: dots, herringbone, an over-the-calf and a bird's-eye."),
  B("garden-party-box", "Garden Party Box", "Garden", 22, { colourKey: "sage", ribbon: "blush", emblem: "tulip",
    socks: [S("crew", "sage", "white", "flowers", { second: "lemon" }), S("ankle", "cream", "red", "cherries"), S("crew", "sky", "lemon", "lemons")] },
    "Daisies, cherries and lemons, for a friend's birthday in spring."),
  B("winter-wool-box", "Winter Wool Box", "Winter", 34, { colourKey: "forest", ribbon: "cream", emblem: "snow",
    socks: [S("crew", "charcoal", "grey", "rib"), S("knee-high", "cream", "cream", "cable", { heel: false }), S("crew", "navy", "white", "snow")] },
    "Three thick wool pairs for someone who is always cold."),
  B("little-explorer-box", "Little Explorer Box", "Play", 15, { colourKey: "mustard", ribbon: "navy", emblem: "mountain",
    socks: [S("ankle", "sky", "slate", "mountains", { second: "ivory" }), S("crew", "navy", "lemon", "stars"), S("crew", "white", "red", "rainbow"), S("crew", "brown", "beige", "bear", { second: "cream" })] },
    "Mountains, stars, a rainbow and a bear: four pairs for a curious child."),
  B("runner-box", "Runner's Box", "Active", 20, { colourKey: "charcoal", ribbon: "orange", emblem: "foot",
    socks: [S("no-show", "black", "orange", "plain", { grip: true, second: "white" }), S("mid-long", "olive", "orange", "compression"), S("crew", "black", "lemon", "bands", { second: "white" })] },
    "Three pairs for someone training for their first marathon."),
  B("heritage-box", "Heritage Box", "Heritage", 26, { colourKey: "brick", ribbon: "gold", emblem: "oimo",
    socks: [S("knee-high", "red", "ivory", "shyrdak", { second: "navy" }), S("mid-long", "navy", "gold", "oimo", { second: "brick" }), S("ankle", "ivory", "brick", "oimo", { second: "gold" })] },
    "The Kyrgyz patterns in one box, for guests from abroad and friends far from home."),
];
