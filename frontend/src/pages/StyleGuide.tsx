import { useState } from "react";
import { Logo } from "../brand/Logo";
import { Alert, Skeleton } from "../components/Alert";
import { Badge, StockBadge } from "../components/Badge";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Input, Select } from "../components/Field";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { ChatBubble, NegotiationOffer } from "../components/Negotiation";
import { Price } from "../components/Price";
import { ProductCard } from "../components/ProductCard";
import { QuantityStepper } from "../components/QuantityStepper";
import { ThemeToggle, useTheme } from "../components/useTheme";
import { SAMPLE_PRODUCTS } from "./sampleProducts";

const SWATCHES: Array<[string, string]> = [
  ["--paper", "Paper"], ["--surface", "Surface"], ["--surface-2", "Surface 2"], ["--line", "Line"],
  ["--ink", "Ink"], ["--ink-2", "Ink 2"], ["--ink-3", "Ink 3"],
  ["--accent", "Gold"], ["--accent-ink", "Gold text"],
  ["--ai", "Assistant (lilac)"], ["--validated", "Validated"], ["--danger", "Danger"],
];

function Section({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="av-section" id={id} aria-labelledby={`${id}-h`}>
      <div className="av-container">
        <header>
          <span className="av-eyebrow">{eyebrow}</span>
          <h2 id={`${id}-h`}>{title}</h2>
          {lead && <p className="av-lead">{lead}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

/** Living reference for the Ak&Ven design system. Every component here is the real one the shop uses. */
export function StyleGuide() {
  const { theme, toggle } = useTheme();
  const [qty, setQty] = useState(2);
  const [chips, setChips] = useState<Record<string, boolean>>({ Sport: true });

  return (
    <>
      <a className="av-skip-link" href="#main">Skip to content</a>
      <Header cartCount={2} current="/women" extra={<ThemeToggle theme={theme} onToggle={toggle} />} />
      <main id="main">
        <section style={{ background: "var(--black)", color: "var(--on-black)" }}>
          <div className="av-container" style={{ paddingBlock: "var(--space-9)", display: "grid", gap: "var(--space-6)", justifyItems: "start" }}>
            <span className="av-eyebrow" style={{ color: "var(--accent)" }}>Design system · v1</span>
            <div style={{ color: "var(--accent)" }}><Logo metallic height="clamp(56px, 12vw, 132px)" /></div>
            <p className="av-lead" style={{ color: "var(--on-black-2)" }}>
              Korean-made socks, sold with conversation. A quiet, confident shop in white, ink and gold,
              where the only loud thing is a fair price.
            </p>
            <div className="av-row">
              <Button variant="accent" size="lg" href="#components">See the components</Button>
              <Button variant="secondary" size="lg" href="#colour" style={{ color: "var(--on-black)", borderColor: "var(--on-black)" }}>Colour and type</Button>
            </div>
          </div>
        </section>

        <Section id="logo" eyebrow="01 · Brand" title="The mark" lead="A heart that is also an ampersand: Akyl and Venera, and the warmth of a bargain made in person. Drawn from the shop sign, rebuilt as clean vector.">
          <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div style={{ background: "var(--black)", border: "1px solid var(--line)", color: "var(--accent)", padding: "var(--space-7)", borderRadius: "var(--radius-lg)", display: "grid", placeItems: "center" }}><Logo metallic height={44} /></div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)", padding: "var(--space-7)", borderRadius: "var(--radius-lg)", display: "grid", placeItems: "center" }}><Logo height={44} /></div>
            <div style={{ background: "var(--accent)", color: "var(--on-accent)", padding: "var(--space-7)", borderRadius: "var(--radius-lg)", display: "grid", placeItems: "center" }}><Logo height={44} /></div>
            <div style={{ background: "var(--surface-2)", color: "var(--ink)", padding: "var(--space-7)", borderRadius: "var(--radius-lg)", display: "grid", placeItems: "center" }}><Logo variant="mark" height={84} /></div>
          </div>
        </Section>

        <Section id="colour" eyebrow="02 · Colour" title="White, ink and gold" lead="Gold is an accent, never a background wash. Every text pair is checked against WCAG AA in both themes by an automated test.">
          <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {SWATCHES.map(([token, name]) => (
              <div key={token}>
                <div style={{ height: 72, background: `var(${token})`, border: "1px solid var(--line)", borderRadius: "var(--radius-md)" }} />
                <div className="av-small" style={{ marginTop: 6, color: "var(--ink)" }}>{name}</div>
                <div className="av-eyebrow">{token}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" eyebrow="03 · Type" title="Serif for voice, sans for work, mono for numbers">
          <div className="av-stack" style={{ gap: "var(--space-6)" }}>
            <div><span className="av-eyebrow">Display · Instrument Serif</span><p className="av-display">Socks, fairly priced.</p></div>
            <div><span className="av-eyebrow">Heading 1</span><h1>Wool Crew Classic</h1></div>
            <div><span className="av-eyebrow">Heading 2</span><h2>Made in Korea, chosen in Bishkek</h2></div>
            <div><span className="av-eyebrow">Body · IBM Plex Sans</span><p className="av-lead">Mid-weight crew socks knitted on our partner's machines for the Ak&amp;Ven label. Soft, durable, and honest about the fabric.</p></div>
            <div><span className="av-eyebrow">Numbers · IBM Plex Mono</span><p><Price amount={17.5} large /> <Price amount={12} was={15} /></p></div>
          </div>
        </Section>

        <Section id="components" eyebrow="04 · Components" title="Buttons, inputs, badges">
          <div className="av-stack" style={{ gap: "var(--space-6)" }}>
            <div className="av-row">
              <Button>Add to bag</Button><Button variant="secondary">Negotiate a price</Button>
              <Button variant="accent">Checkout</Button><Button variant="ghost">Cancel</Button>
              <Button loading>Saving</Button><Button disabled>Unavailable</Button>
            </div>
            <div className="av-row"><Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button></div>
            <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", maxWidth: 820 }}>
              <Input label="Email" type="email" placeholder="you@example.com" hint="We only use it for your order." />
              <Input label="Password" type="password" error="Use at least 8 characters." defaultValue="short" />
              <Select label="Size" defaultValue="M"><option>S</option><option>M</option><option>L</option></Select>
            </div>
            <div className="av-row">
              {["Everyday", "Sport", "Thermal", "Dress"].map((o) => (
                <Chip key={o} label={o} count={o === "Dress" ? 0 : 4} pressed={!!chips[o]} onToggle={() => setChips({ ...chips, [o]: !chips[o] })} />
              ))}
            </div>
            <div className="av-row">
              <StockBadge available={40} /><StockBadge available={3} /><StockBadge available={0} />
              <Badge tone="ai">Proposed</Badge><Badge tone="success">Validated</Badge><Badge>Bundle</Badge>
              <QuantityStepper value={qty} max={5} onChange={setQty} />
            </div>
            <Alert tone="success">Your order is confirmed. A receipt is on its way.</Alert>
            <Alert tone="danger">We could not reach the payment provider. You have not been charged.</Alert>
            <div className="av-row"><Skeleton width={160} height={20} /><Skeleton width={96} height={20} /></div>
          </div>
        </Section>

        <Section id="catalog" eyebrow="05 · Catalog" title="Product cards" lead="Real data shapes from the API, real illustrations, and an honest sold-out state.">
          <div className="av-grid-products">
            {SAMPLE_PRODUCTS.map((p) => <ProductCard key={p.slug} product={p} href={`/products/${p.slug}`} />)}
          </div>
        </Section>

        <Section id="negotiate" eyebrow="06 · Negotiation" title="The assistant proposes, the policy decides"
                 lead="The language model can ask for any discount it likes. A deterministic policy clamps it to the margin floor, and only the validated price can reach a cart. The demo view shows both on purpose.">
          <div style={{ display: "grid", gap: "var(--space-6)", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start" }}>
            <div className="av-chat">
              <ChatBubble from="customer">I'll take three pairs. Can you do 30% off?</ChatBubble>
              <ChatBubble from="seller">Three pairs, good choice. 30% is more than I can do, but I can offer you 15% on the three.</ChatBubble>
              <ChatBubble from="customer">Deal.</ChatBubble>
            </div>
            <div className="av-stack">
              <NegotiationOffer listPrice={17.5} validatedDiscountPct={15} proposedDiscountPct={30} />
              <NegotiationOffer listPrice={9} validatedDiscountPct={10} />
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
