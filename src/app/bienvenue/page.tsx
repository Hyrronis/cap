"use client";

import { CalendarCheck, Compass, ListChecks } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type TouchEvent } from "react";
import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { setPrefs } from "@/lib/prefs";

const SLIDES = [
  { icon: Compass, title: "Bienvenue sur Cap", text: "Ici, on avance vers ce qui compte pour toi. Sans pression, une semaine à la fois.", cta: "Suivant" },
  {
    icon: ListChecks,
    title: "Petit plan, vrais progrès",
    text: "Tu poses un objectif clair, tu choisis 1 à 3 petites actions par semaine, et tu coches. 2 secondes par jour.",
    cta: "Suivant",
  },
  {
    icon: CalendarCheck,
    title: "Chaque semaine, on fait le point",
    text: "5 minutes pour voir ce qui marche, ce qui coince, et ajuster. Quand ça bloque, on cherche la cause ensemble. Jamais de reproche.",
    cta: "C'est parti",
  },
] as const;

export default function BienvenuePage() {
  const router = useRouter();
  const params = useSearchParams();
  const step = Math.min(3, Math.max(1, Number(params.get("etape")) || 1));
  const slide = SLIDES[step - 1];
  const titleRef = useRef<HTMLHeadingElement>(null);
  const touchX = useRef<number | null>(null);
  const toast = useToast();
  const deleted = params.get("supprime") === "1";

  useEffect(() => {
    if (deleted) toast("Tes données ont été supprimées. Prends soin de toi.");
  }, [deleted, toast]);

  useEffect(() => {
    document.title = `${slide.title} · Cap`;
    titleRef.current?.focus({ preventScroll: true });
  }, [slide.title]);

  const finish = () => {
    setPrefs({ onboarded: true });
    router.push("/connexion");
  };
  const go = (n: number) => (n > 3 ? finish() : n >= 1 && router.push(`/bienvenue?etape=${n}`));
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 60) go(dx < 0 ? step + 1 : step - 1);
    touchX.current = null;
  };

  return (
    <div className="flex min-h-dvh flex-col py-4" onTouchStart={(e) => (touchX.current = e.touches[0].clientX)} onTouchEnd={onTouchEnd}>
      <div className="flex justify-end">
        <Link href="/connexion" onClick={() => setPrefs({ onboarded: true })} className="inline-flex min-h-11 items-center px-3 font-semibold text-primary">
          Passer
        </Link>
      </div>
      <div key={step} className="anim-fade flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <IconCircle icon={slide.icon} />
        <h1 ref={titleRef} tabIndex={-1} className="text-display outline-none">
          {slide.title}
        </h1>
        <p className="text-body text-ink-muted">{slide.text}</p>
      </div>
      <div className="space-y-6 pb-4">
        <ol className="flex justify-center gap-2" aria-label={`Écran ${step} sur 3`}>
          {[1, 2, 3].map((n) => (
            <li key={n} aria-hidden="true" className={`h-2 rounded-full transition-all ${n === step ? "w-6 bg-primary" : "w-2 bg-border-strong"}`} />
          ))}
        </ol>
        <Button fullWidth onClick={() => go(step + 1)}>
          {slide.cta}
        </Button>
      </div>
    </div>
  );
}
