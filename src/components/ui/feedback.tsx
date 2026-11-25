import { Award, CircleCheck, CircleDashed, CirclePause, Info, PauseCircle, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "attention";
const bannerTones: Record<Tone, string> = {
  info: "bg-primary-soft text-ink",
  success: "bg-success-soft text-ink",
  attention: "bg-attention-soft text-ink",
};
const bannerIcon: Record<Tone, ReactNode> = {
  info: <Info size={20} className="text-primary" aria-hidden="true" />,
  success: <CircleCheck size={20} className="text-success" aria-hidden="true" />,
  attention: <Info size={20} className="text-attention" aria-hidden="true" />,
};

export function Banner({ tone = "info", title, text, children }: { tone?: Tone; title?: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <section className={`rounded-lg p-4 ${bannerTones[tone]}`} aria-label={title}>
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0">{bannerIcon[tone]}</span>
        <div className="min-w-0 flex-1 space-y-1">
          {title && <h2 className="text-body font-bold">{title}</h2>}
          {text && <p className="text-small">{text}</p>}
          {children && <div className="flex flex-wrap items-center gap-2 pt-2">{children}</div>}
        </div>
      </div>
    </section>
  );
}

type BadgeTone = "neutral" | "success" | "attention" | "primary";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  success: "bg-success-soft text-success",
  attention: "bg-attention-soft text-attention",
  primary: "bg-primary-soft text-primary",
};

export function Badge({ tone = "neutral", icon: Icon, children }: { tone?: BadgeTone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-caption ${badgeTones[tone]}`}>
      {Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </span>
  );
}

export type GoalStatusLabel = "progress" | "stuck" | "none" | "achieved" | "paused";
export function StatusBadge({ status }: { status: GoalStatusLabel }) {
  switch (status) {
    case "progress":
      return <Badge tone="success" icon={TrendingUp}>Ça avance</Badge>;
    case "stuck":
      return <Badge tone="attention" icon={PauseCircle}>Ça bloque</Badge>;
    case "achieved":
      return <Badge tone="primary" icon={Award}>Atteint</Badge>;
    case "paused":
      return <Badge tone="neutral" icon={CirclePause}>De côté</Badge>;
    default:
      return <Badge tone="neutral" icon={CircleDashed}>Pas encore de bilan</Badge>;
  }
}

export function ProgressBar({ value, max, label, tone = "primary" }: { value: number; max: number; label: string; tone?: "primary" | "accent" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${Math.round(value)} sur ${max}`}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div className={`h-full rounded-full ${tone === "accent" ? "bg-accent" : "bg-primary"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({ value, max, label }: { value: number; max: number; label: string }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} sur ${max}`}
      className="relative h-10 w-10 shrink-0"
    >
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-surface-muted)" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-success)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-caption tabular-nums" aria-hidden="true">
        {value}/{max}
      </span>
    </div>
  );
}

export function Skeleton({ shape = "card", className = "" }: { shape?: "line" | "card" | "chart"; className?: string }) {
  const h = shape === "line" ? "h-4" : shape === "chart" ? "h-52" : "h-40";
  return <div className={`animate-pulse rounded-lg bg-surface-muted ${h} ${className}`} aria-hidden="true" />;
}

export function IconCircle({ icon: Icon, tone = "primary" }: { icon: LucideIcon; tone?: "primary" | "accent" }) {
  return (
    <span className={`inline-flex h-20 w-20 items-center justify-center rounded-full ${tone === "accent" ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"}`}>
      <Icon size={44} aria-hidden="true" />
    </span>
  );
}

export function EmptyState({ icon, title, text, children }: { icon?: LucideIcon; title?: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      {icon && <IconCircle icon={icon} />}
      {title && <h2 className="text-heading">{title}</h2>}
      <p className="text-body text-ink-muted">{text}</p>
      {children && <div className="w-full pt-2">{children}</div>}
    </div>
  );
}

export function ErrorState({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="text-body">{title}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="h-11 rounded-md border border-border-strong bg-surface px-4 font-semibold text-primary">
          Réessayer
        </button>
      )}
    </div>
  );
}
