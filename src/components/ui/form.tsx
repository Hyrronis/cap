"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useId, useRef, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";

const fieldBase =
  "w-full rounded-md border border-border-strong bg-surface px-4 text-body text-ink placeholder:text-ink-muted/80 aria-[invalid=true]:border-attention";

interface FieldExtra {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  suffix?: string;
  hideLabel?: boolean;
}

function FieldWrap({
  id,
  label,
  hint,
  error,
  count,
  hideLabel,
  children,
}: FieldExtra & { id: string; count?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-body font-semibold text-ink"}>
        {label}
      </label>
      {children}
      <div className="flex items-start justify-between gap-2">
        <div>
          {hint && !error && (
            <p id={`${id}-hint`} className="text-small text-ink-muted">
              {hint}
            </p>
          )}
          {error && (
            <p id={`${id}-err`} role="alert" className="text-small font-semibold text-attention">
              {error}
            </p>
          )}
        </div>
        {count && <p className="shrink-0 text-caption text-ink-muted tabular-nums">{count}</p>}
      </div>
    </div>
  );
}

export function TextField({ label, hint, error, suffix, hideLabel, className = "", id: idProp, maxLength, value, ...rest }: ComponentProps<"input"> & FieldExtra) {
  const auto = useId();
  const id = idProp ?? auto;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const count = maxLength && typeof value === "string" ? `${value.length}/${maxLength}` : undefined;
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} count={count} hideLabel={hideLabel}>
      <div className="relative">
        <input
          id={id}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${fieldBase} h-12 ${suffix ? "pr-16" : ""} ${className}`}
          {...rest}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-muted">{suffix}</span>}
      </div>
    </FieldWrap>
  );
}

export function TextArea({ label, hint, error, hideLabel, className = "", id: idProp, maxLength, value, rows = 3, ...rest }: ComponentProps<"textarea"> & FieldExtra) {
  const auto = useId();
  const id = idProp ?? auto;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const count = maxLength && typeof value === "string" ? `${value.length}/${maxLength}` : undefined;
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} count={count} hideLabel={hideLabel}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${fieldBase} field-sizing-content max-h-[10.5rem] min-h-24 py-3 ${className}`}
        {...rest}
      />
    </FieldWrap>
  );
}

export function Chip({
  selected,
  variant = "choice",
  icon,
  children,
  className = "",
  ...rest
}: ComponentProps<"button"> & { selected?: boolean; variant?: "suggestion" | "choice" | "filter"; icon?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={variant === "suggestion" ? undefined : !!selected}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm py-1 ${className}`}
      {...rest}
    >
      <span
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-3 text-small font-semibold transition-colors duration-150 ${
          selected ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-surface text-ink"
        }`}
      >
        {selected ? <Check size={16} aria-hidden="true" /> : icon}
        {children}
      </span>
    </button>
  );
}

/** Puces : `single` = groupe radio (flèches), `multiple` = groupe de boutons bascule. */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  mode = "single",
  className = "",
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  mode?: "single" | "multiple";
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const isSel = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (mode !== "single") return;
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].value);
  };
  return (
    <div role={mode === "single" ? "radiogroup" : "group"} aria-label={label} className={`flex flex-wrap gap-x-2 ${className}`}>
      {options.map((o, i) => {
        const sel = isSel(o.value);
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role={mode === "single" ? "radio" : undefined}
            aria-checked={mode === "single" ? sel : undefined}
            aria-pressed={mode === "multiple" ? sel : undefined}
            tabIndex={mode === "single" ? (sel || (value == null && i === 0) ? 0 : -1) : 0}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className="inline-flex min-h-11 items-center rounded-sm py-1"
          >
            <span
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-3 text-small font-semibold transition-colors duration-150 ${
                sel ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-surface text-ink"
              }`}
            >
              {sel && <Check size={16} aria-hidden="true" />}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const tones = {
  neutral: { border: "border-primary", bg: "bg-primary-soft", icon: "text-primary" },
  success: { border: "border-success", bg: "bg-success-soft", icon: "text-success" },
  attention: { border: "border-attention", bg: "bg-attention-soft", icon: "text-attention" },
};

export function ChoiceCard({
  icon,
  title,
  description,
  tone = "neutral",
  selected,
  onSelect,
  large,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  tone?: keyof typeof tones;
  selected: boolean;
  onSelect: () => void;
  large?: boolean;
}) {
  const t = tones[tone];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-lg border-2 p-4 text-left transition-colors duration-150 ${large ? "min-h-24" : "min-h-16"} ${
        selected ? `${t.border} ${t.bg}` : "border-border bg-surface"
      }`}
    >
      {icon && <span className={`shrink-0 ${t.icon}`} aria-hidden="true">{icon}</span>}
      <span className="flex-1">
        <span className="block text-body font-semibold text-ink">{title}</span>
        {description && <span className="block text-small text-ink-muted">{description}</span>}
      </span>
      {selected && <Check className={t.icon} size={20} aria-hidden="true" />}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  asTabs,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  asTabs?: boolean;
}) {
  return (
    <div role={asTabs ? "tablist" : "radiogroup"} aria-label={label} className="flex rounded-md bg-surface-muted p-1">
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role={asTabs ? "tab" : "radio"}
            aria-selected={asTabs ? sel : undefined}
            aria-checked={asTabs ? undefined : sel}
            onClick={() => onChange(o.value)}
            className={`min-h-11 flex-1 rounded-sm px-2 text-small font-semibold transition-colors duration-150 ${
              sel ? "bg-surface text-primary shadow-float" : "text-ink-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ label, value, min = 1, max = 7, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-small font-semibold text-ink">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex items-center gap-1">
        <button type="button" aria-label="Moins" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-primary disabled:opacity-40">
          <Minus size={20} aria-hidden="true" />
        </button>
        <span aria-live="polite" className="w-8 text-center text-heading tabular-nums">
          {value}
        </span>
        <button type="button" aria-label="Plus" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-primary disabled:opacity-40">
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function RatingScale({
  label,
  value,
  onChange,
  minLabel,
  maxLabel,
  size = "md",
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
  minLabel: string;
  maxLabel: string;
  size?: "md" | "compact";
}) {
  const dot = size === "compact" ? "h-9 w-9 text-small" : "h-11 w-11 text-body";
  return (
    <div>
      <div role="radiogroup" aria-label={label} className="flex justify-between gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sur 5`}
            onClick={() => onChange(n)}
            className="flex min-h-11 min-w-11 items-center justify-center"
          >
            <span
              className={`flex items-center justify-center rounded-full border-2 font-bold tabular-nums transition-colors duration-150 ${dot} ${
                value === n ? "border-primary bg-primary text-primary-on" : "border-border-strong bg-surface text-ink"
              }`}
            >
              {n}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-caption text-ink-muted" aria-hidden="true">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
