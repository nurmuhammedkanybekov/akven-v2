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

const KINDS: Array<[ContactKind, string, string]> = [
  ["INSTAGRAM", "Instagram", "akven.socks"], ["TELEGRAM", "Telegram", "nurmss4"], ["WHATSAPP", "WhatsApp", "+996700123456"],
  ["PHONE", "Phone", "+996700123456"], ["EMAIL", "Email", "shop@example.com"],
];

/**
 * The shop's contacts and the stall at Dordoi. These show on every page (top bar, footer, visit page), so phone
 * numbers live here, in the database, and never in the code.
 */
export function AdminShopInfo() {
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">Owners</span><h1>Contacts and the stall</h1></div></header>
      <OwnersOnly><Contacts /><PickupPoints /></OwnersOnly>
    </>
  );
}

function useSaver(reload: () => Promise<unknown>) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  async function run(work: () => Promise<unknown>, done: string) {
    setError(null);
    try { await work(); await reload(); toast(done); return true; } catch (e) { setError(e instanceof ApiError ? e.message : "Could not save. Try again."); return false; }
  }
  return { error, run };
}

function Contacts() {
  const [list, setList] = useState<ShopContact[] | null>(null);
  const reload = () => adminListContacts().then(setList);
  const { error, run } = useSaver(reload);
  const [draft, setDraft] = useState<ContactInput>({ kind: "WHATSAPP", label: "WhatsApp", value: "", position: 0, active: true });
  useEffect(() => { void reload(); }, []);

  return (
    <section className="av-card-form" aria-labelledby="contacts-h">
      <h2 id="contacts-h" className="av-formtitle">Contacts</h2>
      <p className="av-small">Shown in the footer, on the visit page and next to wholesale. Links are made by the shop, so a contact can never point anywhere else.</p>
      {error && <Alert tone="danger">{error}</Alert>}
      {!list && <Skeleton height={100} />}
      {list && (
        <ul className="av-termlist">
          {list.map((c) => <ContactRow key={c.id} contact={c} onSave={(b) => run(() => adminUpdateContact(c.id, b), "Contact saved")} onDelete={() => run(() => adminDeleteContact(c.id), "Contact removed")} />)}
        </ul>
      )}
      <form className="av-formgrid av-formgrid--4" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => adminCreateContact({ ...draft, position: list?.length ?? 0 }), "Contact added")) setDraft({ ...draft, value: "" });
      }}>
        <KindSelect value={draft.kind} onChange={(kind) => setDraft({ ...draft, kind, label: KINDS.find((k) => k[0] === kind)![1] })} />
        <Input label="Shown as" value={draft.label ?? ""} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <Input label="Name, number or address" value={draft.value} placeholder={KINDS.find((k) => k[0] === draft.kind)![2]} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
        <div className="av-field"><span className="av-label">&nbsp;</span><Button type="submit" variant="secondary" disabled={!draft.value.trim()}>Add contact</Button></div>
      </form>
    </section>
  );
}

function KindSelect({ value, onChange }: { value: ContactKind; onChange: (k: ContactKind) => void }) {
  return (
    <label className="av-field">
      <span className="av-label">Kind</span>
      <select className="av-select" value={value} onChange={(e) => onChange(e.target.value as ContactKind)}>
        {KINDS.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
      </select>
    </label>
  );
}

function ContactRow({ contact, onSave, onDelete }: { contact: ShopContact; onSave: (b: ContactInput) => void; onDelete: () => void }) {
  const [label, setLabel] = useState(contact.label ?? "");
  const [value, setValue] = useState(contact.value);
  const dirty = label !== (contact.label ?? "") || value !== contact.value;
  const body = (over: Partial<ContactInput> = {}): ContactInput => ({ kind: contact.kind, label: label.trim() || null, value, position: contact.position, active: contact.active, ...over });
  return (
    <li className="av-term">
      <div className="av-formgrid av-formgrid--4" style={{ flex: 1 }}>
        <Input label="Shown as" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input label={KINDS.find((k) => k[0] === contact.kind)![1]} value={value} onChange={(e) => setValue(e.target.value)} hint={contact.url} />
      </div>
      <div className="av-row">
        <Switch checked={contact.active} onChange={(a) => onSave(body({ active: a }))} label="Shown" />
        <Button size="sm" disabled={!dirty} onClick={() => onSave(body())}>Save</Button>
        <Button size="sm" variant="ghost" aria-label={`Remove ${contact.label ?? contact.kind}`} onClick={onDelete}>Remove</Button>
      </div>
    </li>
  );
}

const emptyPoint = (): PickupPointInput => ({ name: "AK&VEN at Dordoi", market: "Dordoi Bazaar", section: "", passage: "", container: "", city: "Bishkek", hours: "", directions: "", position: 0, active: true });

function PickupPoints() {
  const [points, setPoints] = useState<PickupPoint[] | null>(null);
  const reload = () => adminListPickupPoints().then(setPoints);
  const { error, run } = useSaver(reload);
  useEffect(() => { void reload(); }, []);
  return (
    <section className="av-card-form" aria-labelledby="points-h">
      <h2 id="points-h" className="av-formtitle">Where customers collect orders</h2>
      {error && <Alert tone="danger">{error}</Alert>}
      {!points && <Skeleton height={160} />}
      {points?.map((p) => <PointForm key={p.id} initial={p} onSave={(b) => run(() => adminUpdatePickupPoint(p.id, b), "Saved")} />)}
      {points && points.length === 0 && <PointForm initial={emptyPoint()} onSave={(b) => run(() => adminCreatePickupPoint(b), "Pickup point added")} />}
    </section>
  );
}

function PointForm({ initial, onSave }: { initial: PickupPointInput; onSave: (b: PickupPointInput) => void }) {
  const [p, setP] = useState<PickupPointInput>({ ...initial, section: initial.section ?? "", passage: initial.passage ?? "", hours: initial.hours ?? "", directions: initial.directions ?? "" });
  const set = (k: keyof PickupPointInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value });
  return (
    <form className="av-stack" onSubmit={(e) => { e.preventDefault(); onSave(p); }}>
      <div className="av-formgrid av-formgrid--4">
        <Input label="Market" value={p.market} onChange={set("market")} />
        <Input label="Part of the market" value={p.section ?? ""} onChange={set("section")} />
        <Input label="Passage" value={p.passage ?? ""} onChange={set("passage")} />
        <Input label="Container" value={p.container} onChange={set("container")} />
      </div>
      <div className="av-formgrid">
        <Input label="Opening hours" value={p.hours ?? ""} placeholder="Tue–Sun 7:00–16:00" onChange={set("hours")} />
        <Input label="City" value={p.city} onChange={set("city")} />
      </div>
      <Textarea label="How to find us (optional)" rows={2} value={p.directions ?? ""} onChange={set("directions")} />
      <div className="av-row av-between">
        <Switch checked={p.active} onChange={(a) => setP({ ...p, active: a })} label="Shown in the shop" />
        <Button type="submit" disabled={!p.market.trim() || !p.container.trim()}>Save the stall</Button>
      </div>
    </form>
  );
}
