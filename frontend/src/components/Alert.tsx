import type { ReactNode } from "react";

export function Alert({ tone = "neutral", children }: { tone?: "neutral" | "success" | "danger"; children: ReactNode }) {
  return (
    <div className={`av-alert${tone === "neutral" ? "" : ` av-alert--${tone}`}`} role={tone === "danger" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Skeleton({ width = "100%", height = 16 }: { width?: number | string; height?: number | string }) {
  return <div className="av-skeleton" style={{ width, height }} aria-hidden="true" />;
}
