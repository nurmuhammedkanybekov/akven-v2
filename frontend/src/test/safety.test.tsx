import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RouteTitle } from "../components/RouteTitle";
import { I18nProvider } from "../i18n/I18n";
import { safeNext } from "../lib/safeNext";

describe("after signing in, only a path inside the shop", () => {
  it("keeps a path inside the site", () => {
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext("/orders/12?x=1")).toBe("/orders/12?x=1");
  });

  it("drops anything that could lead to another site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "\\\\evil.example", "/\n//evil", "javascript:alert(1)", "", null]) {
      expect(safeNext(bad)).toBeNull();
    }
  });
});

describe("the tab is named after the page", () => {
  const titleAt = (path: string) => {
    render(<MemoryRouter initialEntries={[path]}><I18nProvider><RouteTitle /></I18nProvider></MemoryRouter>);
    return document.title;
  };

  it("names shop and admin pages, and leaves the home page as the brand", () => {
    expect(titleAt("/women")).toBe("Women · AK&VEN");
    expect(titleAt("/admin/pricing")).toBe("Pricing · AK&VEN");
    expect(titleAt("/no-such-page")).toBe("Page not found · AK&VEN");
    expect(titleAt("/")).toBe("AK&VEN");
  });
});
