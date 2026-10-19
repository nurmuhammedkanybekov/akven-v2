import { useEffect } from "react";

/** The browser tab and a shared link read "Women · AK&VEN" instead of only "AK&VEN". */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · AK&VEN` : "AK&VEN";
  }, [title]);
}
