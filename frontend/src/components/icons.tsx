import type { SVGProps } from "react";

/** 24px line icons, 1.5px stroke, drawn to sit beside Onest. Decorative by default (aria-hidden). */
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
export const SpoolIcon = () => <Icon><path d="M7 4h10M7 20h10M8 4v16M16 4v16" /><path d="m8 8 8 3M8 12l8 3M8 16l8 1" /></Icon>;
export const SealIcon = () => <Icon><circle cx="12" cy="9" r="5.5" /><path d="m9 14-2 7 5-3 5 3-2-7" /><path d="m9.8 9 1.5 1.5 2.9-3" /></Icon>;
export const StackIcon = () => <Icon><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M7 9V6.5h10V9M9.5 6.5V4h5v2.5" /></Icon>;
export const ChatIcon = () => <Icon><path d="M4 5h16v11H9l-5 4Z" /><path d="M9 10.5h6" /></Icon>;
export const TruckIcon = () => <Icon><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></Icon>;
export const RulerIcon = () => <Icon><path d="m3 15 12-12 6 6-12 12Z" /><path d="m8 10 2 2M11 7l2 2M5 13l2 2" /></Icon>;
export const StoreIcon = () => <Icon><path d="M4 10 5.5 5h13L20 10M4 10h16v10H4zM10 20v-5h4v5" /></Icon>;
export const PinIcon = () => <Icon><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></Icon>;
