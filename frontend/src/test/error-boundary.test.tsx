import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "../components/ErrorBoundary";

function Broken(): never { throw new Error("boom"); }

afterEach(() => vi.restoreAllMocks());

it("shows the shop's own message with a way forward instead of a blank page", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(<MemoryRouter><RouteErrorBoundary><Broken /></RouteErrorBoundary></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Something went wrong on this page" })).toBeInTheDocument();
  expect(screen.getByText(/Your bag is safe/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to the shop" })).toHaveAttribute("href", "/");
});
