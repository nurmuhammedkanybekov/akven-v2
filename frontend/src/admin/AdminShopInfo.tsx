import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import {
  adminCreateContact, adminCreatePickupPoint, adminDeleteContact, adminListContacts, adminListPickupPoints,
  adminUpdateContact, adminUpdatePickupPoint, type ContactInput, type PickupPointInput,
} from "../api/endpoints";
import type { ContactKind, PickupPoint, ShopContact } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Input, Textarea } from "../components/Field";
import { Switch } from "../components/Switch";
import { useToast } from "../components/Toast";
import { OwnersOnly } from "./OwnersOnly";
import { useT } from "../i18n/I18n";

const KINDS: Array<[ContactKind, string, string]> = [
  ["WHATSAPP", "WhatsApp", "+996700123456"], ["PHONE", "a.si.phone", "+996700123456"], ["TELEGRAM", "Telegram", "nurmss4"],
  ["INSTAGRAM", "Instagram", "akven.socks"], ["EMAIL", "a.si.email", "shop@example.com"], ["FACEBOOK", "Facebook", "facebook.com/share/…"],
];

/**
 * The shop's contacts and the stall at Dordoi. These show on every page (top bar, footer, visit page), so phone
 * numbers live here, in the database, and never in the code.
 */
/** A kind's name: brand names stay as they are, "Phone" and "Email" follow the language. */
function useKindName() {
  const { t } = useT();
  return (kind: ContactKind) => {
    const name = KINDS.find((k) => k[0] === kind)![1];
    return name.startsWith("a.") ? t(name as "a.si.phone" | "a.si.email") : name;
  };
}

export function AdminShopInfo() {
  const { t } = useT();
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.owners")}</span><h1>{t("a.nav.shop")}</h1></div></header>
      <OwnersOnly><Contacts /><PickupPoints /></OwnersOnly>
    </>
  );
}

function useSaver(reload: () => Promise<unknown>) {
  const toast = useToast();
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  async function run(work: () => Promise<unknown>, done: string) {
    setError(null);
    try { await work(); await reload(); toast(done); return true; } catch (e) { setError(e instanceof ApiError ? e.message : t("a.err.save")); return false; }
  }
  return { error, run };
}

function Contacts() {
  const { t } = useT();
  const kindName = useKindName();
  const [list, setList] = useState<ShopContact[] | null>(null);
  const reload = () => adminListContacts().then(setList);
  const { error, run } = useSaver(reload);
  const [draft, setDraft] = useState<ContactInput>({ kind: "WHATSAPP", label: "WhatsApp", value: "", position: 0, active: true });
  useEffect(() => { void reload(); }, []);

  return (
    <section className="av-card-form" aria-labelledby="contacts-h">
      <h2 id="contacts-h" className="av-formtitle">{t("a.si.contacts")}</h2>
      <p className="av-small">{t("a.si.contactsLead")}</p>
      {error && <Alert tone="danger">{error}</Alert>}
      {!list && <Skeleton height={100} />}
      {list && (
        <ul className="av-termlist">
          {list.map((c) => <ContactRow key={c.id} contact={c} onSave={(b) => run(() => adminUpdateContact(c.id, b), t("a.si.saved"))} onDelete={() => run(() => adminDeleteContact(c.id), t("a.si.removed"))} />)}
        </ul>
      )}
      <form className="av-formgrid av-formgrid--4" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => adminCreateContact({ ...draft, position: list?.length ?? 0 }), t("a.si.added"))) setDraft({ ...draft, value: "" });
      }}>
        <KindSelect value={draft.kind} onChange={(kind) => setDraft({ ...draft, kind, label: kindName(kind) })} />
        <Input label={t("a.si.shownAs")} value={draft.label ?? ""} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <Input label={t("a.si.value")} value={draft.value} placeholder={KINDS.find((k) => k[0] === draft.kind)![2]} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
        <div className="av-field"><span className="av-label">&nbsp;</span><Button type="submit" variant="secondary" disabled={!draft.value.trim()}>{t("a.si.add")}</Button></div>
      </form>
    </section>
  );
}

function KindSelect({ value, onChange }: { value: ContactKind; onChange: (k: ContactKind) => void }) {
  const { t } = useT();
  const kindName = useKindName();
  return (
    <label className="av-field">
      <span className="av-label">{t("a.kind")}</span>
      <select className="av-select" value={value} onChange={(e) => onChange(e.target.value as ContactKind)}>
        {KINDS.map(([k]) => <option key={k} value={k}>{kindName(k)}</option>)}
      </select>
    </label>
  );
}

function ContactRow({ contact, onSave, onDelete }: { contact: ShopContact; onSave: (b: ContactInput) => void; onDelete: () => void }) {
  const { t } = useT();
  const kindName = useKindName();
  const [label, setLabel] = useState(contact.label ?? "");
  const [value, setValue] = useState(contact.value);
  const dirty = label !== (contact.label ?? "") || value !== contact.value;
  const body = (over: Partial<ContactInput> = {}): ContactInput => ({ kind: contact.kind, label: label.trim() || null, value, position: contact.position, active: contact.active, ...over });
  return (
    <li className="av-term">
      <div className="av-formgrid av-formgrid--4" style={{ flex: 1 }}>
        <Input label={t("a.si.shownAs")} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input label={kindName(contact.kind)} value={value} onChange={(e) => setValue(e.target.value)} hint={contact.url} />
      </div>
      <div className="av-row">
        <Switch checked={contact.active} onChange={(a) => onSave(body({ active: a }))} label={t("a.si.shown")} />
        <Button size="sm" disabled={!dirty} onClick={() => onSave(body())}>{t("a.save")}</Button>
        <Button size="sm" variant="ghost" aria-label={t("a.si.removeN", { name: contact.label ?? kindName(contact.kind) })} onClick={onDelete}>{t("a.remove")}</Button>
      </div>
    </li>
  );
}

const emptyPoint = (): PickupPointInput => ({ name: "AKVEN at Dordoi", market: "Dordoi Bazaar", section: "", passage: "", container: "", city: "Bishkek", hours: "", directions: "", position: 0, active: true });

function PickupPoints() {
  const { t } = useT();
  const [points, setPoints] = useState<PickupPoint[] | null>(null);
  const reload = () => adminListPickupPoints().then(setPoints);
  const { error, run } = useSaver(reload);
  useEffect(() => { void reload(); }, []);
  return (
    <section className="av-card-form" aria-labelledby="points-h">
      <h2 id="points-h" className="av-formtitle">{t("a.si.points")}</h2>
      {error && <Alert tone="danger">{error}</Alert>}
      {!points && <Skeleton height={160} />}
      {points?.map((p) => <PointForm key={p.id} initial={p} onSave={(b) => run(() => adminUpdatePickupPoint(p.id, b), t("a.saved"))} />)}
      {points && points.length === 0 && <PointForm initial={emptyPoint()} onSave={(b) => run(() => adminCreatePickupPoint(b), t("a.added"))} />}
    </section>
  );
}

function PointForm({ initial, onSave }: { initial: PickupPointInput; onSave: (b: PickupPointInput) => void }) {
  const { t } = useT();
  const [p, setP] = useState<PickupPointInput>({ ...initial, section: initial.section ?? "", passage: initial.passage ?? "", hours: initial.hours ?? "", directions: initial.directions ?? "" });
  const set = (k: keyof PickupPointInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value });
  return (
    <form className="av-stack" onSubmit={(e) => { e.preventDefault(); onSave(p); }}>
      <div className="av-formgrid av-formgrid--4">
        <Input label={t("a.si.market")} value={p.market} onChange={set("market")} />
        <Input label={t("a.si.section")} value={p.section ?? ""} onChange={set("section")} />
        <Input label={t("a.si.passage")} value={p.passage ?? ""} onChange={set("passage")} />
        <Input label={t("a.si.container")} value={p.container} onChange={set("container")} />
      </div>
      <div className="av-formgrid">
        <Input label={t("a.si.hours")} value={p.hours ?? ""} placeholder={t("a.si.hoursEg")} onChange={set("hours")} />
        <Input label={t("a.si.city")} value={p.city} onChange={set("city")} />
      </div>
      <Textarea label={t("a.si.directions")} rows={2} value={p.directions ?? ""} onChange={set("directions")} />
      <div className="av-row av-between">
        <Switch checked={p.active} onChange={(a) => setP({ ...p, active: a })} label={t("a.shownInShop")} />
        <Button type="submit" disabled={!p.market.trim() || !p.container.trim()}>{t("a.si.saveStall")}</Button>
      </div>
    </form>
  );
}
