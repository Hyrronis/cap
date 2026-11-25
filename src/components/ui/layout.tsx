"use client";

import { ArrowLeft, BookOpen, CalendarCheck, Sun, Target, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefs } from "@/lib/prefs";
import { reviewsDueCount } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { Button } from "./button";
import { ProgressBar } from "./feedback";
import { BottomSheet } from "./sheet";

export function AppHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: string | (() => void) }) {
  const router = useRouter();
  return (
    <header className="flex min-h-14 items-start gap-2 pt-3 pb-2">
      {back && (
        <button
          type="button"
          aria-label="Retour"
          onClick={() => (typeof back === "string" ? router.push(back) : back())}
          className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-muted"
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
      )}
      <div className="min-w-0 flex-1 pt-1.5">
        <h1 className="text-title">{title}</h1>
        {subtitle && <p className="mt-0.5 text-small text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </header>
  );
}

/** En-tête de parcours pas à pas : retour, progression, fermer (avec confirmation). */
export function StepHeader({
  step,
  total,
  onBack,
  onClose,
  label,
  confirmClose = true,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  onClose: () => void;
  label?: string;
  confirmClose?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  return (
    <div className="sticky top-0 z-30 -mx-4 bg-bg px-4 pt-2 pb-1">
      <div className="flex h-12 items-center gap-2">
        {onBack ? (
          <button type="button" aria-label="Retour" onClick={onBack} className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-muted">
            <ArrowLeft size={24} aria-hidden="true" />
          </button>
        ) : (
          <span className="w-9" />
        )}
        <div className="flex-1">
          <ProgressBar value={step} max={total} label={`Étape ${step} sur ${total}`} />
        </div>
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => (confirmClose ? setAsking(true) : onClose())}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-muted"
        >
          <X size={24} aria-hidden="true" />
        </button>
      </div>
      <p className="text-caption text-ink-muted">
        <span aria-hidden="true">{label ?? `${step} sur ${total}`}</span>
        <span className="sr-only">{`Étape ${step} sur ${total}`}</span>
      </p>
      <BottomSheet open={asking} title="Tu t'arrêtes là ?" description="Ce que tu as écrit est gardé. Tu pourras reprendre plus tard." onClose={() => setAsking(false)}>
        <Button fullWidth onClick={() => setAsking(false)}>
          Reprendre
        </Button>
        <Button variant="secondary" fullWidth onClick={onClose}>
          Quitter
        </Button>
      </BottomSheet>
    </div>
  );
}

/** Question d'une étape : focus et titre du document à chaque changement d'étape. */
export function StepQuestion({ children, help, size = "display" }: { children: string; help?: ReactNode; size?: "display" | "title" }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${children} · Cap`;
    ref.current?.focus({ preventScroll: true });
  }, [children]);
  return (
    <div className="space-y-2 pt-3 pb-5">
      <h1 ref={ref} tabIndex={-1} className={`${size === "display" ? "text-display" : "text-title"} outline-none`}>
        {children}
      </h1>
      {help && <p className="text-small text-ink-muted">{help}</p>}
    </div>
  );
}

/** Pied collant au-dessus du clavier (visualViewport). */
export function StickyFooter({ children, withTabBar = false }: { children: ReactNode; withTabBar?: boolean }) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <div
      className="fixed inset-x-0 z-30 flex justify-center bg-gradient-to-t from-bg from-70% to-transparent px-4 pt-4"
      style={{ bottom: withTabBar ? `calc(64px + env(safe-area-inset-bottom))` : offset, paddingBottom: withTabBar ? 12 : `calc(12px + env(safe-area-inset-bottom))` }}
    >
      <div className="w-full max-w-md space-y-1">{children}</div>
    </div>
  );
}

const TABS = [
  { href: "/", label: "Aujourd'hui", icon: Sun },
  { href: "/objectifs", label: "Objectifs", icon: Target },
  { href: "/bilan", label: "Bilan", icon: CalendarCheck },
  { href: "/carnet", label: "Carnet", icon: BookOpen },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const { data } = useStore();
  const { reviewDay } = usePrefs();
  const due = reviewsDueCount(data, reviewDay);
  return (
    <nav aria-label="Navigation principale" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface">
      <ul className="mx-auto flex h-16 max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const badge = href === "/bilan" && due > 0;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={badge ? `${label}, ${due} bilan${due > 1 ? "s" : ""} à faire` : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-caption ${active ? "font-semibold text-primary" : "font-normal text-ink-muted"}`}
              >
                {active && <span className="absolute top-0 h-[3px] w-10 rounded-b-sm bg-primary" aria-hidden="true" />}
                <span className="relative">
                  <Icon size={24} aria-hidden="true" />
                  {badge && <span className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full bg-attention ring-2 ring-surface" aria-hidden="true" />}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
