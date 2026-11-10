import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { RouteTitle } from "../components/RouteTitle";

it("a main page gets its own description for search engines, and gives the shop's back when it is left", () => {
  const meta = document.createElement("meta");
  meta.name = "description"; meta.content = "The shop in general.";
  document.head.appendChild(meta);

  const { unmount } = render(<MemoryRouter initialEntries={["/women"]}><RouteTitle /></MemoryRouter>);
  expect(meta.content).toMatch(/^Women's socks made in Korea/);
  expect(meta.content.length).toBeLessThanOrEqual(160);
  unmount();
  expect(meta.content).toBe("The shop in general.");
  meta.remove();
});
