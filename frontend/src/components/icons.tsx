import type { SVGProps } from "react";

/** 24px line icons, 1.5px stroke, drawn to sit beside Plex Sans. Decorative by default (aria-hidden). */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export const SearchIcon = () => <Icon><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Icon>;
export const BagIcon = () => <Icon><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Icon>;
export const UserIcon = () => <Icon><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></Icon>;
export const MenuIcon = () => <Icon><path d="M4 8h16M4 16h16" /></Icon>;
export const CloseIcon = () => <Icon><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>;
export const MinusIcon = () => <Icon><path d="M5 12h14" /></Icon>;
export const CheckIcon = () => <Icon><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const ArrowIcon = () => <Icon><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const SunIcon = () => <Icon><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></Icon>;
export const MoonIcon = () => <Icon><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></Icon>;
