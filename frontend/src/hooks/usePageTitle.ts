import { useEffect } from "react";

/** The browser tab and a shared link read "Women · AKVEN" instead of only "AKVEN". */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · AKVEN` : "AKVEN";
  }, [title]);
}
