import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "accent" | "ghost";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined; to?: undefined };
type AnchorProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: undefined };
type RouterLinkProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string; href?: undefined };

/**
 * One button for the whole site. With `to` it is a router link (no page reload), with `href` a plain link
 * (external or in-page anchors), otherwise a real button. Navigation stays navigation for assistive tech.
 */
export function Button(props: ButtonProps | AnchorProps | RouterLinkProps) {
  const { variant = "primary", size = "md", block, loading, children, className, ...rest } = props;
  const classes = ["av-btn", `av-btn--${variant}`, size !== "md" && `av-btn--${size}`, block && "av-btn--block", className]
    .filter(Boolean).join(" ");
  const content = (<>{loading && <span className="av-spinner" aria-hidden="true" />}{children}</>);

  if ("to" in props && props.to !== undefined) {
    const { to, ...anchor } = rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string };
    return <Link {...anchor} to={to} className={classes}>{content}</Link>;
  }
  if ("href" in props && props.href !== undefined) {
    return <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={classes}>{content}</a>;
  }
  const button = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" {...button} className={classes} disabled={button.disabled || loading} aria-busy={loading || undefined}>
      {content}
    </button>
  );
}
