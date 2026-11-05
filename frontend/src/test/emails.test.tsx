import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminEmails } from "../admin/AdminEmails";
import type { EmailList, OutboundEmail } from "../api/types";
import { ToastProvider } from "../components/Toast";
import { I18nProvider } from "../i18n/I18n";

const email = (over: Partial<OutboundEmail>): OutboundEmail => ({
  id: "e1", kind: "ORDER_CONFIRMED", to: "aida@example.com", lang: "ru", subject: "Заказ AV-1234ABCD подтверждён – AK&VEN",
  body: "Здравствуйте, Aida!\n\nВаш код для самовывоза — 123456", orderId: "o1", status: "NOT_SENT", attempts: 0,
  lastError: "No mail server is set up (MAIL_HOST), so the email was kept here and not sent.", createdAt: "2026-11-04T10:00:00Z", sentAt: null, ...over,
});
let list: EmailList;
const retry = vi.fn();
vi.mock("../api/endpoints", () => ({
  adminEmails: () => Promise.resolve(list),
  adminOrderEmails: () => Promise.resolve([]),
  adminRetryEmail: (id: string) => { retry(id); return Promise.resolve(email({ status: "QUEUED" })); },
}));

function show() {
  render(<MemoryRouter><I18nProvider><ToastProvider><AdminEmails /></ToastProvider></I18nProvider></MemoryRouter>);
}

describe("emails to customers, in the admin", () => {
  beforeEach(() => { retry.mockClear(); localStorage.removeItem("akven-lang"); });

  it("says plainly that nothing is sent without a mail server", async () => {
    list = { mode: "OFF", failed: 0, emails: { items: [email({})], page: 0, size: 30, totalItems: 1, totalPages: 1 } };
    show();
    expect(await screen.findByText(/Email isn't set up yet, so the emails wait here/)).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("Kept, not sent");
    expect(screen.getByText(/To aida@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Ваш код для самовывоза/)).toBeInTheDocument();   // the words themselves, behind "Read the email"
    expect(screen.queryByRole("button", { name: "Send again" })).toBeNull();     // nothing could send it yet
  });

  it("once a mail server is set up, a kept email can be sent", async () => {
    list = { mode: "SMTP", failed: 0, emails: { items: [email({})], page: 0, size: 30, totalItems: 1, totalPages: 1 } };
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Send again" }));
    await waitFor(() => expect(retry).toHaveBeenCalledWith("e1"));
  });

  it("with a mail server: no warning, a sent email has nothing to retry, and failures are counted", async () => {
    list = { mode: "SMTP", failed: 2, emails: { items: [email({ status: "SENT", lastError: null, sentAt: "2026-11-04T10:00:05Z" })], page: 0, size: 30, totalItems: 1, totalPages: 1 } };
    show();
    expect(await screen.findByRole("listitem")).toHaveTextContent("Sent");
    expect(screen.getByText("2 failed")).toBeInTheDocument();
    expect(screen.queryByText(/No mail server/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Send again" })).toBeNull();
  });
});
