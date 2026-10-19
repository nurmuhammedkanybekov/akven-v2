import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getFamily, saveFamily } from "../api/endpoints";
import type { Category, FamilyMember, FamilyMemberInput, FamilyRole, SizeRow } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { SOCK_COLOURS as C, type SockSpec } from "../brand/SockArt";

export const ROLES: FamilyRole[] = ["dad", "mom", "son", "daughter", "grandpa", "grandma", "baby"];
export const MALE = new Set<FamilyRole>(["dad", "son", "grandpa"]);
export const DEFAULT_SHOE: Record<FamilyRole, number> = { dad: 42, mom: 38, son: 32, daughter: 30, grandpa: 42, grandma: 38, baby: 20 };
export const SHOES = Array.from({ length: 32 }, (_, i) => 16 + i);
export const MAX_MEMBERS = 12;
export const MAX_PAIRS = 30;

/** A sock for each kind of person, drawn next to them in the planner and the account. */
export const ART: Record<FamilyRole, SockSpec> = {
  dad: { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  mom: { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
  son: { cut: "crew", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
  daughter: { cut: "crew", main: C.lilac, accent: C.white, pattern: "dots" },
  grandpa: { cut: "crew", main: C.charcoal, accent: C.grey, pattern: "rib" },
  grandma: { cut: "crew", main: C.oat, accent: C.beige, fluffy: true },
  baby: { cut: "ankle", main: C.sky, accent: C.white, pattern: "dots", grip: true, second: C.coral },
};

/** The sock size for a shoe size, from the shop's own size chart. Overlapping sizes go to men's or women's by role. */
export function sockSizeFor(rows: SizeRow[], shoe: number, role: FamilyRole): SizeRow | undefined {
  const fits = rows.filter((r) => shoe >= r.local.min && shoe <= r.local.max);
  return MALE.has(role) ? fits[fits.length - 1] : fits[0];
}

/** Which shelf a person's socks are on: children's up to shoe size 33, then men's or women's. */
export function categoryFor(m: Pick<FamilyMemberInput, "role" | "shoeSize">): Category {
  if (m.shoeSize <= 33) return "KIDS";
  return MALE.has(m.role) ? "MEN" : "WOMEN";
}

/** Days until the next birthday (0 = today), counted on the calendar in Bishkek; null without a birthday. */
export function daysToBirthday(birthday: string | null, now = new Date()): number | null {
  const m = birthday?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bishkek" }).format(now).split("-").map(Number);
  const today = Date.UTC(y, mo - 1, d);
  const month = Number(m[1]) - 1, day = Number(m[2]);
  let next = Date.UTC(y, month, day);
  if (next < today) next = Date.UTC(y + 1, month, day);
  return Math.round((next - today) / 86_400_000);
}

// ---- the saved family, shared by every screen that reads it, fetched once per account ----

const cache = new Map<string, FamilyMember[]>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
const notify = () => { version++; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** For tests: forget what was loaded. */
export function resetFamilyCache() { cache.clear(); pending.clear(); notify(); }

/**
 * The signed-in customer's family, or null while it loads (and for visitors). Staff accounts have no family: the
 * account they sign in with is for work.
 */
export function useFamily() {
  const { session, isStaff } = useAuth();
  const email = session && !isStaff ? session.email : null;
  useSyncExternalStore(subscribe, () => version, () => 0);
  useEffect(() => {
    if (!email || cache.has(email) || pending.has(email)) return;
    pending.add(email);
    getFamily().then((list) => { cache.set(email, list); }).catch(() => { cache.set(email, []); })
      .finally(() => { pending.delete(email); notify(); });
  }, [email]);
  const save = useCallback(async (members: FamilyMemberInput[]) => {
    if (!email) throw new Error("Sign in to keep your family.");
    const saved = await saveFamily(members);
    cache.set(email, saved);
    notify();
    return saved;
  }, [email]);
  return { members: email ? cache.get(email) ?? null : null, signedIn: !!email, save };
}
