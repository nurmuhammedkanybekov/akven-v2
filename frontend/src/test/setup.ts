import "@testing-library/jest-dom/vitest";

// jsdom has no <dialog> behaviour; give it the two methods the app uses so modals open and close in tests.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
}

// The app loads Russian and Kyrgyz before its first render (main.tsx); tests render pages directly, so load them here.
import { loadLang } from "../i18n/I18n";
await Promise.all([loadLang("ru"), loadLang("ky")]);
