# Manual test on real phones

Automated tests run AK&VEN in Chromium, WebKit and Firefox, but a real phone still behaves differently: the
keyboard covers the page, the address bar grows and shrinks, the connection drops, the wallet sheet is the phone's own.
This list takes one person about 30 minutes per phone.

**Phones:** at least one iPhone (Safari) and one Android phone (Chrome), ideally a small one (iPhone SE or a 5.5"
Android) and a recent one. Test once in Russian or Kyrgyz, once in English.

**Before you start:** open the shop's address on the phone. Bag empty, signed out. Write down the phone model,
the system version and the browser.

Mark every line ✅ (works), ⚠️ (works, but awkward: write what happened) or ❌ (broken: write the steps and attach a screenshot).

## 1. First look (no account)

- [ ] The home page opens in under ~3 seconds on mobile data (not Wi-Fi).
- [ ] Nothing on any page can be scrolled sideways; text is never cut off at the right edge.
- [ ] The top bar's message is fully readable (in Russian and Kyrgyz too).
- [ ] Rotate the phone to landscape and back: nothing breaks or overlaps.
- [ ] The menu (☰) opens and closes; every link in it works; the language switch is in it.
- [ ] Switch to Русский, then Кыргызча: the page changes language at once and stays in it after closing the browser.

## 2. Finding socks

- [ ] From the home page, "For him" opens the men's shelf.
- [ ] The shelf's rows of tabs and sections can be swiped sideways; a fade at the edge shows there is more.
- [ ] Filter by a size and a colour; the count changes; "Clear" removes the filters.
- [ ] Search (magnifier) finds a sock by part of its name.
- [ ] "Show 12 more" loads more socks without jumping to the top.
- [ ] The fitting room teaser on the home page reacts to "Her" / "Ankle", and "Open the fitting room" keeps those choices.

## 3. A sock, and the bag

- [ ] On a product page, the name and the price are visible without scrolling.
- [ ] Choose a colour and a size; the picture and the stock note change.
- [ ] "Add to bag": the sheet says it was added; the bag icon shows the number.
- [ ] Drag the price slider ("How the price falls"); the numbers are readable and do not overlap.
- [ ] In the bag, change the quantity with − and +; the total changes; "Remove" and "Save for later" work.
- [ ] The bag says what delivery costs before checkout ("delivery from …").
- [ ] Close the browser completely, open the shop again: the bag still holds the socks.

## 4. Account and checkout

- [ ] "Check out" asks to sign in; "Create an account" brings you back to the checkout afterwards.
- [ ] Press "Sign in" with empty fields: it says what is missing, and the keyboard opens on the email field.
- [ ] The phone's keyboard shows "@" on the email field and digits on the phone field.
- [ ] While typing in checkout, the field you type in is never hidden under the keyboard.
- [ ] Pickup / Delivery switch works; delivery shows the areas and the fee.
- [ ] "To pay" shows the amount before the Pay buttons.
- [ ] Pay (simulated wallet): the order page opens with a pickup code (for pickup).
- [ ] Take a screenshot of the pickup code; it is readable.
- [ ] "Question about this order?" opens Telegram or WhatsApp with the order number already typed.
- [ ] Cancel the order: it asks first, and then says it was cancelled.

## 5. When things go wrong

- [ ] Turn on airplane mode, open a shelf: it says the phone is offline and offers "Try again".
- [ ] Turn airplane mode off: the socks appear by themselves.
- [ ] With airplane mode on, the bag still opens and shows its socks.
- [ ] Press "Pay" twice quickly: only one order is created (check "My orders").
- [ ] Open an address that does not exist (/abc): a friendly "not here" page with a way back.

## 6. Wholesale and gifts

- [ ] Wholesale: press "Put this mix in my request" with an empty case: it explains what to do and jumps to the first "+".
- [ ] Fill the request form and send it: a reference number appears.
- [ ] Gift box: choose a box and ribbon, add socks, write a card, put it in the bag.

## 7. Installing (optional)

- [ ] iPhone: Share → "Add to Home Screen"; Android: menu → "Install app". The icon opens the shop full-screen.
- [ ] Open the installed app with no connection: the shop's frame opens and says it is offline.

## Reporting

For each ❌ or ⚠️: phone and browser, language, the page address, what you did, what you expected, what happened,
and a screenshot or a short screen recording.
