import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { adminCreateAccount, adminListAccounts, adminResetPassword, adminUpdateAccount } from "../api/endpoints";
import type { Account, TeamRole } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { Input } from "../components/Field";
import { Switch } from "../components/Switch";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import { SuperAdminOnly } from "./SuperAdminOnly";

/**
 * UC-9: the shop team's accounts. The super admin adds an owner or a helper at the stall, changes what they may do,
 * disables an account (its sessions end at once) and sets a new password when someone forgets theirs.
 */
export function AdminAccounts() {
  const { t } = useT();
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.system")}</span><h1>{t("a.nav.accounts")}</h1></div></header>
      <p className="av-lead">{t("a.ac.lead")}</p>
      <SuperAdminOnly><Accounts /></SuperAdminOnly>
    </>
  );
}

function Accounts() {
  const { t } = useT();
  const list = useAsync(() => adminListAccounts(), []);
  const [resetting, setResetting] = useState<Account | null>(null);
  return (
    <>
      <NewAccount onCreated={list.reload} />
      <section className="av-card-form" aria-labelledby="team-h">
        <h2 id="team-h" className="av-formtitle">{t("a.ac.team")}</h2>
        {list.loading && !list.data && <Skeleton height={160} />}
        {list.error && <Alert tone="danger">{list.error.message}</Alert>}
        {list.data && (
          <ul className="av-termlist">
            {list.data.map((a) => <AccountRow key={`${a.id}-${a.role}-${a.active}`} account={a} onSaved={list.reload} onReset={() => setResetting(a)} />)}
          </ul>
        )}
        <p className="av-small">{t("a.ac.roles")}</p>
      </section>
      {resetting && <ResetPassword account={resetting} onClose={() => setResetting(null)} />}
    </>
  );
}

function RoleSelect({ value, onChange, id }: { value: TeamRole; onChange: (r: TeamRole) => void; id: string }) {
  const { t } = useT();
  return (
    <label className="av-field" htmlFor={id}>
      <span className="av-label">{t("a.ac.role")}</span>
      <select id={id} className="av-select" value={value} onChange={(e) => onChange(e.target.value as TeamRole)}>
        <option value="STAFF">{t("a.role.STAFF")}</option>
        <option value="ADMIN">{t("a.role.ADMIN")}</option>
      </select>
    </label>
  );
}

function NewAccount({ onCreated }: { onCreated: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("STAFF");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setFieldErrors({});
    try {
      const a = await adminCreateAccount({ email: email.trim(), displayName: name.trim() || null, role, password });
      toast(t("a.ac.created", { email: a.email }));
      setEmail(""); setName(""); setPassword(""); setRole("STAFF");
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFieldErrors(err.fieldErrors); } else setError(t("a.err.save"));
    } finally { setBusy(false); }
  }

  return (
    <form className="av-card-form" onSubmit={submit} aria-labelledby="new-account-h">
      <h2 id="new-account-h" className="av-formtitle">{t("a.ac.new")}</h2>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="av-formgrid av-formgrid--4">
        <Input label={t("a.ac.name")} value={name} placeholder={t("a.ac.nameEg")} onChange={(e) => setName(e.target.value)} />
        <Input label={t("a.ac.email")} type="email" autoComplete="off" value={email} error={fieldErrors.email} onChange={(e) => setEmail(e.target.value)} />
        <RoleSelect id="new-role" value={role} onChange={setRole} />
        <Input label={t("a.ac.password")} type="password" autoComplete="new-password" value={password} error={fieldErrors.password}
               hint={t("a.ac.passwordHint")} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="av-row"><Button type="submit" loading={busy} disabled={!email.trim() || password.length < 8}>{t("a.ac.create")}</Button></div>
    </form>
  );
}

function AccountRow({ account, onSaved, onReset }: { account: Account; onSaved: () => void; onReset: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [name, setName] = useState(account.displayName ?? "");
  const [role, setRole] = useState<TeamRole>(account.role);
  const fixed = account.role === "SUPER_ADMIN";
  const dirty = name !== (account.displayName ?? "") || role !== account.role;

  async function save(active = account.active) {
    try {
      await adminUpdateAccount(account.id, { displayName: name.trim() || null, role, active });
      toast(active === account.active ? t("a.saved") : active ? t("a.ac.enabledToast") : t("a.ac.disabledToast"));
      onSaved();
    } catch (e) { toast(e instanceof ApiError ? e.message : t("a.err.save"), "danger"); }
  }

  return (
    <li className="av-term">
      <div className="av-term__main">
        <strong>{account.displayName ?? account.email}</strong>{" "}
        <Badge tone={account.role === "STAFF" ? "neutral" : "accent"}>{t(`a.role.${account.role}`)}</Badge>
        {!account.active && <> <Badge tone="danger">{t("a.ac.disabled")}</Badge></>}
        <br /><span className="av-small av-muted">{account.email}</span>
      </div>
      {fixed ? <span className="av-small av-muted">{t("a.ac.fixed")}</span> : (
        <div className="av-row">
          <Input label={t("a.ac.name")} value={name} onChange={(e) => setName(e.target.value)} />
          <RoleSelect id={`role-${account.id}`} value={role} onChange={setRole} />
          <Button size="sm" disabled={!dirty} onClick={() => void save()}>{t("a.save")}</Button>
          <Switch checked={account.active} onChange={(on) => void save(on)} label={t("a.ac.activeFor", { email: account.email })} />
          <Button size="sm" variant="ghost" onClick={onReset}>{t("a.ac.reset")}</Button>
        </div>
      )}
    </li>
  );
}

function ResetPassword({ account, onClose }: { account: Account; onClose: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError(null);
    try { await adminResetPassword(account.id, password); toast(t("a.ac.resetDone", { email: account.email })); onClose(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t("a.err.save")); } finally { setBusy(false); }
  }
  return (
    <Dialog open title={t("a.ac.resetTitle", { email: account.email })} onClose={onClose}
            actions={<><Button variant="ghost" onClick={onClose}>{t("a.cancel")}</Button><Button loading={busy} disabled={password.length < 8} onClick={save}>{t("a.ac.reset")}</Button></>}>
      {error && <Alert tone="danger">{error}</Alert>}
      <Input label={t("a.ac.newPassword")} type="password" autoComplete="new-password" autoFocus value={password} hint={t("a.ac.passwordHint")} onChange={(e) => setPassword(e.target.value)} />
      <p className="av-small">{t("a.ac.resetLead")}</p>
    </Dialog>
  );
}
