# How the shop is used

## For the shop team (owners, staff and the super admin)

Sign in at `/login`; the team is sent to the admin at `/admin`. The admin speaks English, Russian and Kyrgyz (switch at
the bottom of the menu) and the menu is grouped by who uses it: **Shop** (everyone), **Owners** and **System**.
Nothing here needs a developer.

There are three roles. **Staff** (a helper at the stall) handle products, stock, orders and the hand-over. **Owners**
(Akylbek and Venera) can also change prices, contacts, the size chart and trusted customers. The **super admin** (Nur,
who runs the system) can do everything an owner can, plus the accounts, the AI assistant and the audit log.

| Task | Where |
|---|---|
| Add, rename, hide, reorder or delete a **section** (Classic, Sport, "Premium Gold Line") or a **cut** (Crew, Mid-long) | Sections and cuts, or "+ Add a new section" inside the product form |
| Add a product: name, who it is for, section, cut, quality, fabric, care, origin | Products, Add a product |
| Add each **colour and size** with a swatch, price, stock, cost and the biggest discount the assistant may give | The product form, or later on the product's page |
| Upload **photos** when they exist (JPEG, PNG or WebP, up to 5 MB, 40 per product; the first is the cover). A photo can belong to **one colour**: customers who choose that colour see its photos | The product's page, Photos |
| **Remove** a product from the shop (immediate, reversible) and **put it back** | The product's page. Nothing is ever hard-deleted, so past orders stay intact |
| See who changed what (admins) | The product's page, History |
| Handle orders: see what is waiting, mark it completed, or cancel and refund | Orders |
| Read what the assistant offered customers, next to what the policy allowed | Negotiations |
| Record stock **on the way**, its arrival date and the **pairs in a wholesale case** (the shop then says "arrives in about N days") | The product's page, each colour and size |
| See **paid orders, revenue and pairs sold**, how many paid orders wait at the stall, **which socks are running out** (and what is on the way), **who is waiting for a sold-out option** (write to them when it is back, then mark them as told); and offers per day, how often the limit stepped in, offers that became orders, best sellers, and the **rule-based against AI comparison** | Dashboard |
| **Hand over a pickup order** at the stall: the customer says the six-digit code or shows its QR code (scan it with the button, in Chrome or Edge), and says the last four digits of their phone | Hand over an order |
| Set the **minimum order** in pairs, the minimum for trusted customers, when "only N left" appears, the **price ladder**, and the **som and rouble rates** (how many for one dollar, and how prices are rounded) (owners) | Pricing |
| Enter **WhatsApp, phone, Telegram, Instagram, email and Facebook**, and the stall: market, passage, container, and the **opening hours** (opening and closing time, and the days it is open) (owners) | Contacts and the stall |
| Edit the **size chart** (owners) | Size chart |
| Find a customer by email and mark them as **trusted** (they may order from the lower minimum), **set a new password** for a customer who forgot theirs, or **switch off** a fake account (owners) | Customers |
| Add an owner or a staff account, change a role, **disable** an account (it is signed out at once) or **set a new password** (super admin) | Accounts |
| Choose who answers the price chat, the **AI assistant** or the built-in rules; see whether the AI has its key and how often each answered; **try a message** without storing it; run the **comparison against the live AI** (super admin) | AI assistant |
| Read the **audit log**: every change, who made it, and the values before and after (super admin) | Audit log |

Staff can do everything except create colours and sizes, change the cost price and the discount limit, and change
pricing, contacts, customers or the size chart; those are for the owners because they decide what the shop charges
and says.

**The shop's real contacts and the super admin account** are set once on the server, in the `.env` file next to
`docker-compose.yml` (never in the code; see `.env.example`): `SHOP_CONTACTS` lists the contacts in the order they
appear on the site, and `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` create the super admin on the first start. After
that the owners change contacts in the admin; the list in `.env` is applied again only when it changes. Until a product has photos the shop shows a branded placeholder.

## For customers

The shop speaks English, Russian and Kyrgyz (EN · РУС · КЫР in the top bar, or in the menu on a phone) and shows prices
in US dollars, Kyrgyz som or Russian roubles ($ · СОМ · ₽; som by default in Russian and Kyrgyz). The light and dark
switch is in the top bar too. These choices are remembered on the device. Prices are kept in dollars, which is what
the wallet charges; som and roubles are worked out with the owners' rates and rounding, and checkout says what the
wallet will charge in dollars. Choosing a colour changes the sock's picture. A sold-out option offers **"Tell me when
it's back"** (signed in): the owners see who is waiting and write when it arrives. Every sock card has a **Quick view** to choose
and add a sock without leaving the shelf. Collections are mixed freely: the minimum order and the price ladder count pairs across
the whole bag, and the bag says how many more pairs reach the next step. `/visit` explains how to find container
70-E at Dordoi, `/sizes` has the size chart and a size finder, and `/wholesale` explains packs and cases.

1. **Bag.** "Add to bag" on any product. The bag lives in the browser: no account needed, it survives a reload, works
   offline and is shared between tabs. It remembers which item and how many; prices are always asked from the server.
2. **Negotiating.** Signed-in customers can chat on a product page ("Want a better price?"), in their own language. It
   is a real conversation: the assistant remembers what was said and offered, answers questions about the sock, and
   may offer a discount; "Add to bag at this price" puts exactly that offer in the bag. An offer is for one item, for
   at least the number of pairs it was negotiated for, and lasts 24 hours.
3. **Checkout.** Signing in (or creating an account) is needed here. The customer gives a name and phone, chooses
   pick-up or delivery, and pays with Apple Pay or Google Pay. In this project the wallet is **simulated**: it returns a
   one-time token, never a card number, and no money moves. A switch in the sheet makes the "bank" decline, to show a
   failed payment. A real payment provider would sit behind the same `PaymentProvider` interface.
4. **Order.** A confirmation page, then the order under "Your orders". A paid pickup order shows a six-digit pickup
   code to say at the stall, and a QR code the stall can scan instead. **"Order these again"** puts the same socks back
   in the bag at today's prices. A line of four steps (placed, paid, ready at 70-E or on its way, collected) shows
   where the order is. A customer can cancel while the order is paid
   and not yet completed: the payment is refunded and the socks go back on the shelf.
5. **Your account** (the person icon, signed in). The family the customer buys for: a name, who they are (dad, mom,
   son ...), shoe size, how many pairs and, if they like, a birthday. The sock size is worked out from the shop's chart.
   Saved once, the family is used everywhere: the family planner on the home page starts from it, a product page says
   who in the family the shelf fits ("this shelf fits: Venera (38)"), and a birthday within a month shows at the top
   with **"Make a gift box"**. The account also lists the sold-out socks the customer is waiting for and the latest orders.
6. **Gift box** (`/gift`, from **Gift Sets** in the menu, which also has the ready-made boxes and the holiday calendar). Choose the box (kraft, navy or red) and the ribbon (gold, red or
   white), put socks in from the shelves on the same page (they go straight into the bag), and write the card: to, from
   and up to 300 characters. The drawing shows the box with the socks in it; the lid comes down while the card is
   written. "Put the gift box in my bag" keeps the choice with the bag; checkout sends it with the order and the family
   sees it on the order to pack it. The box, ribbon and card are free, and the receipt can be left out of the box.
7. **Sock finder** (`/finder`). Three taps (who, how high, what for) and the socks on the shelf that match. If nothing
   matches all three, the page lets go of the last answers one by one and says so.
8. **Search** (the magnifier, or "/" anywhere): results appear while typing; arrow keys and Enter open one, or all
   results in the catalogue. **The bag drawer** slides in when a sock is added: what went in, how far the bag is from
   the next collection price, and the same design for someone else in the family.
9. **Reviews.** After an order is handed over, the customer can review each sock in it on its page (stars, a first
   name if they like, a few words). The family reads every review before it appears; product pages show the average,
   how the stars spread and what people wrote, and the home page shows the best ones. Product pages also show **Match
   the whole family** (the same design on the other shelves) and, when it is true, how many pairs sold this week.
10. **Saved socks** (the heart) follow a signed-in customer from phone to laptop and can be shared as a link ("Share my list"); whoever opens it sees those socks and can save
   them all.

## The assistant and why it cannot lose money

The assistant proposes a discount; it never sets a price. Whatever it proposes is clamped by the `PolicyValidator` to
the variant's margin floor before it is stored or shown, and the checkout re-checks the offer once more. Both the
proposal and the validated value are kept for every conversation, so the shop team can see exactly what was asked and
what was allowed.

- The assistant is never told the cost price or the margin floor.
- Its reply is a template filled with the validated numbers. A reply that states any price, percentage or number of its
  own (in digits or in words) is replaced by a safe sentence.
- By default a deterministic rule-based assistant answers. With `NEGOTIATION_PROVIDER=llm`, or when the super admin
  switches it on in the admin, a language model answers, in the customer's language, using product facts and the
  shop's public price ladder; if it is down, busy, slow or returns something unusable, the rule-based assistant answers
  instead. Every turn records which one answered.
- The number check works in English, Russian and Kyrgyz (digits, number words, percent and money words), so the model
  cannot slip a price past the shop in any of the three languages.
- Customers only ever see the validated discount. For a demonstration, `AKVEN_DEMO_EXPOSE_PROPOSAL=true` shows the
  raw proposal next to it, so you can ask for "50% off" and watch the cap work.

## Safety rules built into checkout

The server decides every price. The last pair can only be sold once, because rows are locked while stock is checked.
Pressing pay twice cannot pay twice (idempotency key). An order is only paid with a payment reference from a confirmed
token, and a declined payment releases the stock. Every change is in the audit log. The words on a gift card are
stored and shown as plain text, never as markup; everything kept in the browser (the bag, the gift box, saved socks)
is checked when it is read back, and a value that does not fit is dropped rather than trusted.
