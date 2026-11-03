import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fieldMessages, problemMessage } from "../api/client";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/en";
import { ky } from "../i18n/ky";
import { ru } from "../i18n/ru";

/** What the server sends for a few customer-facing errors (RFC 7807 with a stable code and its values). */
const LOW_STOCK = { status: 409, detail: "Only 4 left of Ala-Too Ankle.", code: "ITEM_LOW_STOCK", args: { n: 4, name: "Ala-Too Ankle" } };
const DECLINED = { status: 402, detail: "Your bank declined the payment. You have not been charged.", code: "PAYMENT_DECLINED" };
const VALIDATION = { status: 400, detail: "Validation failed.", errors: { contactName: "must not be blank", email: "must be a well-formed email address" },
  fieldCodes: { contactName: "NotBlank", email: "Email" } };
const ADMIN_ONLY = { status: 400, detail: "A free area needs no free-from amount." };     // no code: the team reads English

function Show() {
  const fields = fieldMessages(VALIDATION);
  return <ul>
    <li>{problemMessage(LOW_STOCK)}</li><li>{problemMessage(DECLINED)}</li>
    <li>{fields.contactName}</li><li>{fields.email}</li><li>{problemMessage(ADMIN_ONLY)}</li>
  </ul>;
}
function inLanguage(lang: string) {
  localStorage.setItem("akven-lang", lang);
  render(<I18nProvider><Show /></I18nProvider>);
  return screen.getAllByRole("listitem").map((li) => li.textContent);
}

afterEach(() => localStorage.clear());

describe("customer-facing errors from the server", () => {
  it("read in English by their code, with the values put back in", () => {
    expect(inLanguage("en")).toEqual(["Only 4 left of Ala-Too Ankle.", "Your bank declined the payment. You have not been charged.",
      "Fill this in.", "That does not look like an email: it needs an @ and a domain, like name@mail.com.", "A free area needs no free-from amount."]);
  });

  it("read in Russian, and an error without a code keeps the server's sentence", () => {
    expect(inLanguage("ru")).toEqual(["Ala-Too Ankle: осталось только 4.", "Ваш банк отклонил платёж. Деньги не списаны.",
      "Заполните это поле.", "Это не похоже на адрес почты: нужен знак @ и домен, например name@mail.com.", "A free area needs no free-from amount."]);
  });

  it("read in Kyrgyz", () => {
    expect(inLanguage("ky")).toEqual(["Ala-Too Ankle: болгону 4 калды.", "Банкыңыз төлөмдү четке какты. Акча алынган жок.",
      "Бул талааны толтуруңуз.", "Бул эл. почтага окшобойт: @ белгиси жана домен керек, мисалы name@mail.com.", "A free area needs no free-from amount."]);
  });

  it("fall back to the server's sentence for a code the shop does not know yet", () => {
    expect(problemMessage({ detail: "Something new.", code: "SOMETHING_NEW" })).toBe("Something new.");
  });
});

/** Every stable code the backend throws, read from its source, so a new one cannot ship without its three texts. */
function backendCodes(): string[] {
  const root = path.resolve(__dirname, "../../../backend/src/main/java");
  const codes = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".java")) {
        const src = fs.readFileSync(file, "utf8");
        for (const m of src.matchAll(/Exception\((?:\d+, )?"([A-Z][A-Z_]+)", /g)) codes.add(m[1]);
        for (const m of src.matchAll(/"(WHOLESALE_CONTACT_)" \+/g)) ["WHATSAPP", "TELEGRAM", "EMAIL"].forEach((k) => codes.add(m[1] + k));
      }
    }
  };
  walk(root);
  return [...codes].sort();
}

describe("the backend's error codes", () => {
  it("each have an English, a Russian and a Kyrgyz text", () => {
    const codes = backendCodes();
    expect(codes.length).toBeGreaterThan(30);
    const dicts: Record<string, Record<string, string>> = { en, ru, ky };
    const missing = codes.flatMap((c) => Object.entries(dicts).filter(([, d]) => !d[`api.${c}`]).map(([lang]) => `${lang}: api.${c}`));
    expect(missing).toEqual([]);
  });
});
