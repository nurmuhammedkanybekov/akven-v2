import type { ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { SOCK_COLOURS as C } from "../brand/SockArt";
import { Clothesline, Peg } from "./Clothesline";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { CheckIcon } from "./icons";

const PERKS: MessageKey[] = ["auth.perk1", "auth.perk2", "auth.perk3", "auth.perk4"];

/**
 * Sign in and create an account share one frame. On navy, the family's socks swing on the washing line under the logo,
 * and what an account is good for is sewn into a cloth label. Beside it the form is a sheet of paper pegged to the
 * same line. On phones the navy side shrinks to a strip above the form.
 */
export function AuthShell({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  const { t } = useT();
  return (
    <div className="av-auth">
      <aside className="av-auth__brand">
        <Logo variant="stacked" metallic height={170} className="av-auth__logo" write />
        <div className="av-auth__line">
          <Clothesline at={[0.14, 0.42, 0.7]} width={0.26} sag={0.05} socks={[
            { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
            { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
            { cut: "mid-long", main: C.pink, accent: C.red, pattern: "hearts" },
          ]} />
        </div>
        <ul className="av-auth__perks">
          {PERKS.map((k) => <li key={k}><CheckIcon />{t(k)}</li>)}
        </ul>
      </aside>
      <div className="av-auth__form">
        <Peg className="av-auth__peg" />
        <header className="av-page__head">
          <span className="av-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {lead && <p className="av-small">{lead}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}
