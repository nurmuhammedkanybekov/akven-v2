# The AK&VEN Telegram bot: a plan

Status: **planned, not built.** The website comes first; this document is the agreed shape of the bot, so that it can
be built later without redesigning anything in the shop. Every piece it needs already exists in the backend (orders
and their private links, the email outbox, the shop's information, the language-model client with its rule-based
fallback, the PolicyValidator), so the bot is a new front door, not a new shop.

## What it is for

1. **Order messages in Telegram**, next to email: "your order is confirmed", "ready at 70-E", "on its way", "with the
   cargo carrier", "cancelled and refunded". Customers in Kyrgyzstan read Telegram faster than email.
2. **An assistant that answers questions** in English, Russian or Kyrgyz (sizes, opening hours, how to find
   container 70-E, delivery to Osh, cargo to Almaty, wholesale cases) and **sends links to the website** instead of
   long explanations: the right shelf, the size guide, the fitting room, the visit page, the wholesale form.
3. **Handing over to the family** when the assistant is not sure, when the customer asks for a person, or when the
   question is about money, a complaint or a big wholesale order: Akylbek or Venera answer from Telegram, through the
   bot, without giving out their own numbers.

Not for: taking payments, changing prices or discounts, or changing orders. Those stay on the website, where the
rules are enforced.

## How it fits the shop

```
Telegram  ──webhook──▶  bot module (Spring, inside the backend)  ──▶  the shop's services
   ▲                         │  conversation, language, links        (orders, shop info, catalog search,
   │                         │  hand-over queue                        the outbox, the LLM client)
   └──── family group chat ◀─┘  (the parents answer here)
```

- **One more module in the backend** (`telegram/`), not a separate service: it reuses the services directly, shares
  the database and the audit log, and needs nothing new to deploy. Telegram calls the shop at
  `https://your-domain/api/telegram/<secret-path>` (a webhook with Telegram's secret-token header checked on every
  call); the bot answers through the Bot API over HTTPS.
- **Order messages reuse the outbox.** A new channel `TELEGRAM` beside email: the same transaction that changes an
  order writes the message, and the same sender retries it. A customer who never linked Telegram simply gets email.
- **Linking an order to a chat** without asking for a phone or an account: the order page and the confirmation
  email show "Get updates in Telegram", a link to `t.me/<bot>?start=<order key>`. The order key is the same keyed hash
  as the private link (`OrderLinks`), so the bot knows which order it is and that the person holds its link. The chat
  id is stored with the order; `/stop` removes it.

## The assistant

- **Answers from the shop's own facts**, never from memory: the opening hours, the stall, the delivery areas and
  their prices, the size chart and the catalogue come from the same services the website uses, and are put in the
  model's context for each question. If a fact is not there, the answer is "let me ask the family", not a guess.
- **Links rather than paragraphs:** every answer ends with at most two links to the site (`/sizes`,
  `/men?size=...`, `/fitting?who=WOMEN&cut=ankle`, `/visit`, `/wholesale`), built by the bot from a fixed list so the
  model cannot invent an address.
- **Prices are said only as the shop shows them.** A request for a discount gets a link to the product page, where
  the existing price chat (and its PolicyValidator, which no proposal can get past) handles it. The bot never states
  a discount of its own; the same output check the price chat already uses (no price the shop did not say) runs on
  every bot message.
- **The same model switch** as the price chat: the rule-based assistant (keywords and fixed answers) works with no
  model at all, and a language model can be switched on by the super admin, with the rule-based one as the fallback
  when the model fails or is slow.
- **Languages:** the language of the customer's message, else their Telegram language, else Russian.

## Handing over to the family

The assistant hands over when any of these holds: the customer says "person", "оператор", "адам" or similar; the
model's answer is unsure or the question is outside the shop's facts; it is about money already paid, a complaint, a
lost parcel, or a wholesale order above a set number of pairs; or the same question comes back twice.

1. The customer is told "I've asked Venera and Akylbek; they usually answer within an hour between 8:00 and 16:00"
   (from the stall's real hours; after hours: "tomorrow morning").
2. The family's group chat gets a card: the question, the conversation so far, the order (reference, status, items)
   if one is linked, and buttons **Reply**, **Call me back** and **Done**.
3. A parent's reply in that thread goes to the customer through the bot, signed "Venera, AK&VEN". The customer never
   sees the parents' own accounts or numbers.
4. If nobody answers within the stall's hours plus one hour, the bot tells the customer and offers the shop's
   WhatsApp, so nobody waits in silence.
5. Every hand-over and reply is kept (who, when, what) and visible in the admin next to the order.

## Safety and privacy

- The webhook path and Telegram's secret token are in `.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`), never
  in the repository; the bot refuses calls without the token.
- Limits per chat (messages per minute, model calls per hour), like the price chat's.
- The bot shows an order only to the chat linked through the order's key, and only what the order page shows.
- Conversations are kept 90 days, like emails, then deleted; `/forget` deletes a customer's conversation at once.
- No personal data goes to the language model beyond the question itself: no names, phones or addresses.

## Building it, in order

| Step | What | Done when |
|---|---|---|
| 1 | Bot account (BotFather), webhook endpoint with the secret check, `/start` and `/help` in three languages | The bot answers in a test chat |
| 2 | `TELEGRAM` channel in the outbox, linking an order with `?start=<order key>`, `/stop` | A test order's messages arrive in Telegram and stop after `/stop` |
| 3 | Rule-based assistant: hours, location, delivery, sizes, wholesale, with links | The common questions answer with the right link, without a model |
| 4 | Hand-over to the family's group, replies relayed back, the "no answer" fallback | A parent answers a test customer from the group |
| 5 | Language-model answers from the shop's facts, with the output check and the fallback | A test set of 50 real questions: no invented prices or addresses |
| 6 | Admin: conversations and hand-overs next to the order; retention clean-up | The family can see what was said |

Tests follow the shop's existing pattern: each step has integration tests (a fake Telegram API, as the email tests
use a fake mail server), and step 5 gets an evaluation like the price chat's (`docs/evaluation/`).

## WhatsApp later

Many customers prefer WhatsApp. The WhatsApp Business Platform needs a verified Meta business account, approved
message templates for order updates, and is paid per conversation. The design above carries over: another outbox
channel and another webhook module, with the same assistant and the same hand-over.
