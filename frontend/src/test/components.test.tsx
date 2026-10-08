import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

/** Every component can contain router links, so tests render inside a MemoryRouter. */
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
import { Button } from "../components/Button";
import { StockBadge } from "../components/Badge";
import { Input } from "../components/Field";
import { NegotiationOffer } from "../components/Negotiation";
import { Price } from "../components/Price";
import { ProductCard } from "../components/ProductCard";
import { QuantityStepper } from "../components/QuantityStepper";
import { Logo } from "../brand/Logo";
import { discountedPrice, formatPrice } from "../lib/format";
import { productMeta } from "../lib/labels";
import { SAMPLE_PRODUCTS } from "../pages/sampleProducts";

describe("format helpers", () => {
  it("formats prices and rounds discounts to cents", () => {
    expect(formatPrice(6.5)).toBe("$6.50");
    expect(discountedPrice(17.5, 15)).toBe(14.88);   // 14.875 rounds up, as a shop would
    expect(discountedPrice(9, 0)).toBe(9);
  });
  it("describes a product without inventing a section or cut for bundles", () => {
    expect(productMeta({ category: "MEN", section: { slug: "sport", name: "Sport" }, cut: { slug: "crew", name: "Crew" } })).toBe("Men · Sport · Crew");
    expect(productMeta({ category: "BUNDLES", section: null, cut: null })).toBe("Bundles");
  });
});

describe("Button", () => {
  it("is disabled and busy while loading, and does not fire clicks", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Saving</Button>);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
  it("renders a real link when given an href", () => {
    render(<Button href="/cart">Go to bag</Button>);
    expect(screen.getByRole("link", { name: "Go to bag" })).toHaveAttribute("href", "/cart");
  });
});

describe("Input", () => {
  it("connects label, hint and error for screen readers", () => {
    render(<Input label="Email" error="Enter a valid email." />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email.");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
  });
});

describe("QuantityStepper", () => {
  it("cannot go below the minimum or above the available stock", () => {
    const onChange = vi.fn();
    const { rerender } = render(<QuantityStepper value={1} max={3} onChange={onChange} />);
    expect(screen.getByLabelText("Decrease quantity")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Increase quantity"));
    expect(onChange).toHaveBeenCalledWith(2);
    rerender(<QuantityStepper value={3} max={3} onChange={onChange} />);
    expect(screen.getByLabelText("Increase quantity")).toBeDisabled();
  });
});

describe("Stock and price wording", () => {
  it("shows exact numbers only when stock is about to run out", () => {
    const { rerender } = render(<StockBadge available={40} />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
    rerender(<StockBadge available={3} />);
    expect(screen.getByText("Only 3 left")).toBeInTheDocument();
    rerender(<StockBadge available={0} />);
    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });
  it("follows the server: the owners' threshold, and stock that is on the way", () => {
    const { rerender } = render(<StockBadge available={8} status="FEW_LEFT" />);
    expect(screen.getByText("Only 8 left")).toBeInTheDocument();
    rerender(<StockBadge available={0} status="COMING_SOON" restockInDays={12} />);
    expect(screen.getByText("Arrives in about 12 days")).toBeInTheDocument();
    rerender(<StockBadge available={0} status="COMING_SOON" restockInDays={0} />);
    expect(screen.getByText("Arrives today")).toBeInTheDocument();
  });
  it("tells screen readers the original price, not just a strikethrough", () => {
    render(<Price amount={12} was={15} />);
    expect(screen.getByText("(was $15.00)")).toBeInTheDocument();
  });
});

describe("ProductCard", () => {
  it("links to the product, carries alt text and a from-price", () => {
    render(<ProductCard product={SAMPLE_PRODUCTS[0]} to="/products/merino-dress-black" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/merino-dress-black");
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Merino Dress Sock, Ak&Ven");
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("$8.00")).toBeInTheDocument();
  });
  it("marks sold-out products", () => {
    render(<ProductCard product={SAMPLE_PRODUCTS[2]} to="/x" />);
    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });
});

describe("NegotiationOffer", () => {
  it("shows only the validated price to customers", () => {
    render(<NegotiationOffer listPrice={17.5} validatedDiscountPct={15} />);
    expect(screen.getByText("$14.88")).toBeInTheDocument();
    expect(screen.queryByText(/suggested/)).not.toBeInTheDocument();
  });
  it("in demo mode shows the model's over-ask next to the capped, validated figure", () => {
    render(<NegotiationOffer listPrice={17.5} validatedDiscountPct={15} proposedDiscountPct={30} />);
    expect(screen.getByText(/assistant suggested 30%/)).toBeInTheDocument();
    expect(screen.getByText(/policy allows 15%/)).toBeInTheDocument();
    expect(screen.getByText(/capped by the margin floor/)).toBeInTheDocument();
  });
});

describe("Logo", () => {
  it("is one accessible image named Ak&Ven, in both lockups", () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByRole("img", { name: "Ak&Ven" })).toBeInTheDocument();
    rerender(<Logo variant="mark" />);
    expect(screen.getByRole("img", { name: "Ak&Ven" })).toBeInTheDocument();
  });
});
