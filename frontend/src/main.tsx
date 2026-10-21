// Onest for text, with Cyrillic and Cyrillic Extended (the Kyrgyz letters ң, ө, ү live in the extended set).
import "@fontsource/onest/latin-300.css";
import "@fontsource/onest/cyrillic-300.css";
import "@fontsource/onest/cyrillic-ext-300.css";
import "@fontsource/onest/latin-400.css";
import "@fontsource/onest/cyrillic-400.css";
import "@fontsource/onest/cyrillic-ext-400.css";
import "@fontsource/onest/latin-500.css";
import "@fontsource/onest/cyrillic-500.css";
import "@fontsource/onest/cyrillic-ext-500.css";
import "@fontsource/onest/latin-600.css";
import "@fontsource/onest/cyrillic-600.css";
import "@fontsource/onest/cyrillic-ext-600.css";
import "@fontsource/onest/latin-700.css";
import "@fontsource/onest/cyrillic-700.css";
import "@fontsource/onest/cyrillic-ext-700.css";
// Onest 800 for the big figures (prices, counts) that stay in the sans.
import "@fontsource/onest/latin-800.css";
import "@fontsource/onest/cyrillic-800.css";
import "@fontsource/onest/cyrillic-ext-800.css";
// Headings in Cormorant Garamond, a Garamond cut for display sizes: the serif of a family label, next to the Cinzel
// capitals of the logo. Italic for the words a heading leans on.
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/cyrillic-500.css";
import "@fontsource/cormorant-garamond/cyrillic-ext-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/cyrillic-600.css";
import "@fontsource/cormorant-garamond/cyrillic-ext-600.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/cormorant-garamond/cyrillic-500-italic.css";
import "@fontsource/cormorant-garamond/cyrillic-ext-500-italic.css";
// Caveat, a handwriting face, for the notes the family writes on tags and cards at the stall.
import "@fontsource/caveat/latin-600.css";
import "@fontsource/caveat/cyrillic-600.css";
import "@fontsource/caveat/cyrillic-ext-600.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/shop.css";
import "./styles/home.css";
import "./styles/motion.css";
import "./styles/features.css";
import "./styles/editorial.css";
import "./styles/levelup.css";
import "./styles/identity.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// The service worker only runs in the production build: in dev it would cache stale modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => { /* offline support is a bonus, not a requirement */ }); });
}
