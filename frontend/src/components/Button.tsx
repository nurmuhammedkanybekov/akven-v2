import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "accent" | "ghost";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** One button for the whole site. With an href it renders a real link, so navigation stays navigation. */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", block, loading, children, className, ...rest } = props;
  const classes = ["av-btn", `av-btn--${variant}`, size !== "md" && `av-btn--${size}`, block && "av-btn--block", className]
    .filter(Boolean).join(" ");
  const content = (<>{loading && <span className="av-spinner" aria-hidden="true" />}{children}</>);

  if ("href" in props && props.href !== undefined) {
    const anchor = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return <a {...anchor} className={classes}>{content}</a>;
  }
  const button = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" {...button} className={classes} disabled={button.disabled || loading} aria-busy={loading || undefined}>
      {content}
    </button>
  );
}
