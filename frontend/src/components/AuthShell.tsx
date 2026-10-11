import type { ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { SOCK_COLOURS as C, SockArt } from "../brand/SockArt";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { CheckIcon } from "./icons";

const PERKS: MessageKey[] = ["auth.perk1", "auth.perk2", "auth.perk3", "auth.perk4"];

/**
 * Sign in and create an account share one frame: the brand on navy on one side (the logo, a few socks, what an account
 * is good for), the form on the other. On phones the brand panel shrinks to a strip above the form.
 */
export function AuthShell({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  const { t } = useT();
  return (
    <div className="av-auth">
      <aside className="av-auth__brand">
        <Logo variant="stacked" metallic height={170} className="av-auth__logo" />
        <div className="av-auth__socks" aria-hidden="true">
          <SockArt cut="crew" main={C.navy} accent={C.gold} pattern="argyle" second={C.cream} />
          <SockArt cut="knee-high" main={C.cream} accent={C.navy} pattern="oimo" second={C.gold} />
          <SockArt cut="ankle" main={C.pink} accent={C.red} pattern="hearts" />
        </div>
        <ul className="av-auth__perks">
          {PERKS.map((k) => <li key={k}><CheckIcon />{t(k)}</li>)}
        </ul>
      </aside>
      <div className="av-auth__form">
        <header className="av-page__head">
          <span className="av-eyebrow av-orn">{eyebrow}</span>
          <h1>{title}</h1>
          {lead && <p className="av-small">{lead}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}
