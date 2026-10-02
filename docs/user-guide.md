# How the shop is used

## For the owners (Admin and Staff)

Sign in at `/login`; staff are sent to the admin at `/admin`. Nothing here needs a developer.

| Task | Where |
|---|---|
| Add, rename, hide, reorder or delete a **section** (Classic, Sport, "Premium Gold Line") or a **cut** (Crew, Mid-long) | Sections and cuts, or "+ Add a new section" inside the product form |
| Add a product: name, who it is for, section, cut, quality, fabric, care, origin | Products, Add a product |
| Add each **colour and size** with a swatch, price, stock, cost and the biggest discount the assistant may give | The product form, or later on the product's page |
| Upload **photos** when they exist (JPEG, PNG or WebP, up to 5 MB, 8 per product; the first is the cover) | The product's page, Photos |
| **Remove** a product from the shop (immediate, reversible) and **put it back** | The product's page. Nothing is ever hard-deleted, so past orders stay intact |
| See who changed what (admins) | The product's page, History |
| Handle orders: see what is waiting, mark it completed, or cancel and refund | Orders |
| Read what the assistant offered customers, next to what the policy allowed | Negotiations |

Staff can do everything except create colours and sizes or change the cost price and the discount limit; those are
admin-only because they drive the pricing guardrail. Until a product has photos the shop shows a branded placeholder.

## For customers

1. **Bag.** "Add to bag" on any product. The bag lives in the browser: no account needed, it survives a reload, works
   offline and is shared between tabs. It remembers which item and how many; prices are always asked from the server.
2. **Negotiating.** Signed-in customers can chat on a product page ("Want a better price?"). The assistant replies and
   may offer a discount; "Add to bag at this price" puts exactly that offer in the bag. An offer is for one item, for
   at least the number of pairs it was negotiated for, and lasts 24 hours.
3. **Checkout.** Signing in (or creating an account) is needed here. The customer gives a name and phone, chooses
   pick-up or delivery, and pays with Apple Pay or Google Pay. In this project the wallet is **simulated**: it returns a
   one-time token, never a card number, and no money moves. A switch in the sheet makes the "bank" decline, to show a
   failed payment. A real payment provider would sit behind the same `PaymentProvider` interface.
4. **Order.** A confirmation page, then the order under "Your orders". A customer can cancel while the order is paid
   and not yet completed: the payment is refunded and the socks go back on the shelf.

## The assistant and why it cannot lose money

The assistant proposes a discount; it never sets a price. Whatever it proposes is clamped by the `PolicyValidator` to
the variant's margin floor before it is stored or shown, and the checkout re-checks the offer once more. Both the
proposal and the validated value are kept for every conversation, so the shop team can see exactly what was asked and
what was allowed.

- The assistant is never told the cost price or the margin floor.
- Its reply is a template filled with the validated numbers. A reply that states any price, percentage or number of its
  own (in digits or in words) is replaced by a safe sentence.
- By default a deterministic rule-based assistant answers. With `NEGOTIATION_PROVIDER=llm` a language model answers,
  using product facts from the catalog; if it is down, slow or returns something unusable, the rule-based assistant
  answers instead. The transcript records which one answered.
- Customers only ever see the validated discount. For a demonstration, `AKVEN_DEMO_EXPOSE_PROPOSAL=true` shows the
  raw proposal next to it, so you can ask for "50% off" and watch the cap work.

## Safety rules built into checkout

The server decides every price. The last pair can only be sold once, because rows are locked while stock is checked.
Pressing pay twice cannot pay twice (idempotency key). An order is only paid with a payment reference from a confirmed
token, and a declined payment releases the stock. Every change is in the audit log.
