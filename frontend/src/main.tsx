import "@fontsource/onest/latin-300.css";
import "@fontsource/onest/cyrillic-300.css";
import "@fontsource/onest/latin-400.css";
import "@fontsource/onest/cyrillic-400.css";
import "@fontsource/onest/latin-500.css";
import "@fontsource/onest/cyrillic-500.css";
import "@fontsource/onest/latin-600.css";
import "@fontsource/onest/cyrillic-600.css";
import "@fontsource/onest/latin-700.css";
import "@fontsource/onest/cyrillic-700.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/shop.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// The service worker only runs in the production build: in dev it would cache stale modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => { /* offline support is a bonus, not a requirement */ }); });
}
