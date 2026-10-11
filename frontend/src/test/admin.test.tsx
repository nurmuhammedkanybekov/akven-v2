import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLayout } from "../admin/AdminLayout";
import { I18nProvider } from "../i18n/I18n";

let auth: Record<string, unknown> = {};
vi.mock("../auth/AuthContext", () => ({ useAuth: () => auth }));

function as(role: "STAFF" | "ADMIN" | "SUPER_ADMIN") {
  auth = { session: { token: "t", email: "x@akven.test", role }, isStaff: true, isAdmin: role !== "STAFF", isSuperAdmin: role === "SUPER_ADMIN", signOut: vi.fn() };
  render(<MemoryRouter initialEntries={["/admin"]}><I18nProvider><AdminLayout /></I18nProvider></MemoryRouter>);
}

describe("the admin menu", () => {
  beforeEach(() => localStorage.removeItem("akven-lang"));

  it("shows staff the shop only", () => {
    as("STAFF");
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pricing" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Accounts" })).toBeNull();
  });

  it("shows owners their screens but not the system", () => {
    as("ADMIN");
    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "AI assistant" })).toBeNull();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("shows the super admin everything, and speaks Russian for the parents", () => {
    localStorage.setItem("akven-lang", "ru");
    as("SUPER_ADMIN");
    for (const name of ["Товары", "Цены", "Аккаунты", "ИИ-помощник", "Журнал изменений"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.getByText("Супер-админ")).toBeInTheDocument();
  });
});
