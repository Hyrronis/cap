"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const base =
  "active-scale inline-flex items-center justify-center gap-2 rounded-md text-body font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-on hover:bg-primary-hover",
  secondary: "bg-surface text-primary border border-border-strong hover:bg-surface-muted",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "bg-danger text-danger-on",
};
const sizes: Record<Size, string> = { md: "h-12 px-5", sm: "h-11 px-4 text-small" };

export function buttonClass(variant: Variant = "primary", size: Size = "md", fullWidth = false, extra = "") {
  return [base, variants[variant], sizes[size], fullWidth ? "w-full" : "", extra].join(" ");
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  iconLeft?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  loadingLabel = "Enregistrement…",
  iconLeft,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, fullWidth, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          <span aria-live="polite">{loadingLabel}</span>
        </>
      ) : (
        <>
          {iconLeft}
          {children}
        </>
      )}
    </button>
  );
}

export function LinkButton({
  variant = "ghost",
  size = "md",
  fullWidth,
  className = "",
  iconLeft,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; fullWidth?: boolean; iconLeft?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, fullWidth, className)} {...rest}>
      {iconLeft}
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  variant = "ghost",
  className = "",
  children,
  type = "button",
  ...rest
}: ComponentProps<"button"> & { label: string; variant?: "ghost" | "soft" }) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors duration-150 ${
        variant === "soft" ? "bg-surface-muted" : "hover:bg-surface-muted"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconLink({ label, className = "", children, ...rest }: ComponentProps<typeof Link> & { label: string }) {
  return (
    <Link
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface-muted ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}
