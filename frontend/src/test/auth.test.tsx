import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { AuthProvider, useAuth } from "../auth/AuthContext";

/** A page that fetches the moment it mounts, exactly like the admin screens do. */
function EagerPage() {
  const [result, setResult] = useState("loading");
  useEffect(() => { api<{ ok: boolean }>("/api/admin/products").then(() => setResult("loaded")).catch((e: Error) => setResult(e.message)); }, []);
  return <p>{result}</p>;
}
function WhoAmI() {
  const { session } = useAuth();
  return <p>{session ? `signed in as ${session.email}` : "signed out"}</p>;
}

describe("session restore", () => {
  beforeEach(() => {
    sessionStorage.setItem("akven-session", JSON.stringify({ token: "restored-token", email: "owner@akven.test", role: "ADMIN" }));
  });
  afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

  it("sends the restored token with the very first request of a page that fetches on mount", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    render(<MemoryRouter><AuthProvider><EagerPage /><WhoAmI /></AuthProvider></MemoryRouter>);
    await screen.findByText("loaded");
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer restored-token");
    expect(screen.getByText("signed in as owner@akven.test")).toBeInTheDocument();
  });

  it("signs the visitor out everywhere when the server says the token is no longer valid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "expired" }), { status: 401 }));
    render(<MemoryRouter><AuthProvider><EagerPage /><WhoAmI /></AuthProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
    expect(sessionStorage.getItem("akven-session")).toBeNull();
  });
});
