"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import { DB_LIMITS } from "@/lib/db-types";
import { texte } from "@/lib/repo/schemas";

/** Préférences de l'appareil (jamais de jeton ni d'e-mail ici — docs/securite.md §6). */
export const PREFS_KEY = "cap:v1:prefs";

const prefsSchema = z.strictObject({
  firstName: texte(DB_LIMITS.displayName).default(""),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  /** 1 = lundi … 7 = dimanche. */
  reviewDay: z.number().int().min(1).max(7).default(7),
  onboarded: z.boolean().default(false),
  /** « Continuer sans compte » accepté. */
  localMode: z.boolean().default(false),
  sharedDeviceNoticeSeen: z.boolean().default(false),
  /** Bannière bilan masquée jusqu'à cette date (exclue). */
  reviewBannerHiddenUntil: z.iso.date().optional(),
});

export type Prefs = z.output<typeof prefsSchema>;
export const DEFAULT_PREFS: Prefs = prefsSchema.parse({});

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Prefs } | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PREFS_KEY);
  } catch {
    return null;
  }
}

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.value;
  let value = DEFAULT_PREFS;
  if (raw) {
    try {
      const parsed = prefsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) value = parsed.data;
    } catch {
      // préférences illisibles : valeurs par défaut
    }
  }
  cache = { raw, value };
  return value;
}

export function setPrefs(patch: Partial<Prefs>): void {
  const next = prefsSchema.parse({ ...readPrefs(), ...patch });
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    cache = { raw: null, value: next };
  }
  if (patch.theme) applyTheme(next.theme);
  listeners.forEach((l) => l());
}

export function applyTheme(theme: Prefs["theme"]): void {
  const el = document.documentElement;
  if (theme === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", theme);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PREFS_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Préférences + indicateur `ready` (faux pendant le rendu serveur et l'hydratation). */
export function usePrefs(): Prefs & { ready: boolean } {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const prefs = useSyncExternalStore(subscribe, readPrefs, () => DEFAULT_PREFS);
  return { ...prefs, ready };
}

/* ------------------------------------------------------------------ */
/* Brouillons des parcours (repris en revenant)                        */
/* ------------------------------------------------------------------ */

const draftKey = (name: string) => `cap:v1:brouillon:${name}`;

export function readDraft<T>(name: string, schema: z.ZodType<T>): T | null {
  try {
    const raw = window.localStorage.getItem(draftKey(name));
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeDraft(name: string, value: unknown): void {
  try {
    window.localStorage.setItem(draftKey(name), JSON.stringify(value));
  } catch {
    // stockage plein : le brouillon n'est pas gardé, sans bloquer.
  }
}

export function clearDraft(name: string): void {
  try {
    window.localStorage.removeItem(draftKey(name));
  } catch {
    // ignoré
  }
}
