import { describe, expect, it } from "vitest";
import { contactProblem } from "../pages/Wholesale";

describe("wholesale contact check (same rules as the server)", () => {
  it("accepts a phone with a country code for WhatsApp and calls", () => {
    expect(contactProblem("WHATSAPP", "+996 700 123 456")).toBeNull();
    expect(contactProblem("PHONE", "0700123456")).toBeNull();
    expect(contactProblem("WHATSAPP", "call me")).toBe("quote.badPhone");
    expect(contactProblem("PHONE", "+99")).toBe("quote.badPhone");
  });
  it("accepts a Telegram name or a phone", () => {
    expect(contactProblem("TELEGRAM", "@akven_shop")).toBeNull();
    expect(contactProblem("TELEGRAM", "akven_shop")).toBeNull();
    expect(contactProblem("TELEGRAM", "+996 700 123 456")).toBeNull();
    expect(contactProblem("TELEGRAM", "@a b")).toBe("quote.badTg");
  });
  it("wants a full email address", () => {
    expect(contactProblem("EMAIL", "buyer@example.kg")).toBeNull();
    expect(contactProblem("EMAIL", "buyer@example")).toBe("quote.badEmail");
  });
});
