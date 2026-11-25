import { addDays, parseIsoDate, weekStart } from "@/lib/domain/calculs";
import type { IsoDate } from "@/lib/domain/types";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** 1 234,5 */
export const nombre = (n: number | null | undefined): string => (n == null || !Number.isFinite(n) ? "—" : nf.format(n));

const jourMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const jourComplet = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const dateLongue = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** « mardi 3 décembre » */
export const jourDate = (d: IsoDate | Date): string => jourComplet.format(typeof d === "string" ? parseIsoDate(d) : d);
/** « 3 décembre » */
export const date = (d: IsoDate): string => jourMois.format(parseIsoDate(d));
/** « 3 décembre 2026 » */
export const dateAnnee = (d: IsoDate): string => dateLongue.format(parseIsoDate(d));

/** « du 2 au 8 décembre » (ou « du 30 novembre au 6 décembre ») */
export function semaine(start: IsoDate): string {
  const ws = weekStart(start);
  const end = addDays(ws, 6);
  const a = parseIsoDate(ws);
  const b = parseIsoDate(end);
  const debut = a.getMonth() === b.getMonth() ? String(a.getDate()) : jourMois.format(a);
  return `du ${debut} au ${jourMois.format(b)}`;
}

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;
export const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"] as const;

/** Lit un nombre saisi en français (virgule acceptée). */
export function lireNombre(s: string): number | null {
  const clean = s.replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}
