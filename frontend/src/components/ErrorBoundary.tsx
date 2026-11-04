import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { translateNow } from "../i18n/I18n";
import { Logo } from "../brand/Logo";

const RELOADED = "akven-reloaded-after-update";

/** A page's code could not be fetched: after a new release the old file names are gone. */
function isStaleBundle(error: unknown): boolean {
  const text = String((error as Error)?.message ?? error);
  return /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(text);
}

/**
 * The last line of defence: whatever breaks while a page is drawn, the visitor sees the shop's own message with a way
 * forward (try again, or back to the shop) instead of a blank white page. When the page's code is missing because a
 * newer version of the shop was published meanwhile, it reloads once by itself.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("A page could not be shown", error, info.componentStack);
    if (isStaleBundle(error)) {
      try {
        if (!sessionStorage.getItem(RELOADED)) { sessionStorage.setItem(RELOADED, "1"); window.location.reload(); }
      } catch { /* no storage: the visitor reloads with the button */ }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="av-container av-page av-empty" role="alert">
        <Logo variant="mark" height={64} />
        <h1>{translateNow("crash.title")}</h1>
        <p className="av-lead">{translateNow("crash.lead")}</p>
        <div className="av-row">
          <button type="button" className="av-btn av-btn--primary" onClick={() => window.location.reload()}>{translateNow("crash.reload")}</button>
          <a className="av-btn av-btn--secondary" href="/">{translateNow("crash.home")}</a>
        </div>
      </div>
    );
  }
}

/** A new address starts again: going to another page after an error shows that page, not the message. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}
