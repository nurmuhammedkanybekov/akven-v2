import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaseBuilder } from "../shop/wholesale/CaseBuilder";

const TERMS = { sections: [{ slug: "classic", name: "Classic" }, { slug: "sport", name: "Sport" }], cuts: [] };

describe("the wholesale case builder", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("never shows a dead grey button: with an empty case it says how to fill one and moves to the first +", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify(TERMS), { status: 200 }));
    const onUse = vi.fn();
    render(<CaseBuilder onUse={onUse} />);
    const use = await screen.findByRole("button", { name: "Put this mix in my request" });
    expect(use).toBeEnabled();
    expect(use).toHaveAccessibleDescription(/The case is empty: press \+/);
    fireEvent.click(use);
    expect(onUse).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Twelve more: Classic, Men" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Twelve more: Classic, Men" }));
    expect(screen.queryByText(/The case is empty/)).not.toBeInTheDocument();
    fireEvent.click(use);
    expect(onUse).toHaveBeenCalledWith("Classic · Men: 12", 12);
  });
});
