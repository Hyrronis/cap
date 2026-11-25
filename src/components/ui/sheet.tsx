"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Feuille du bas : dialog modal, piège de focus, Échap et tap sur le fond ferment, focus rendu au déclencheur. */
export function BottomSheet({
  open,
  title,
  description,
  onClose,
  children,
  initialFocus,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  /** Sélecteur de l'élément à focaliser à l'ouverture (sinon 1er champ, sinon titre). */
  initialFocus?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const target =
      (initialFocus && node?.querySelector<HTMLElement>(initialFocus)) ||
      node?.querySelector<HTMLElement>("input, textarea") ||
      node?.querySelector<HTMLElement>("h2");
    target?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === "Tab" && node) {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, initialFocus]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="anim-fade absolute inset-0 bg-[rgba(18,23,21,0.5)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="anim-sheet shadow-sheet safe-bottom relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-surface px-4 pt-3 pb-4"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <h2 id={titleId} tabIndex={-1} className="text-heading outline-none">
          {title}
        </h2>
        {description && (
          <div id={descId} className="mt-2 text-body text-ink-muted">
            {description}
          </div>
        )}
        <div className="mt-4 space-y-3 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  tone = "default",
  requireText,
  requireLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  requireText?: string;
  requireLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const ok = !requireText || typed.trim() === requireText;
  const close = () => {
    setTyped("");
    onCancel();
  };
  return (
    <BottomSheet open={open} title={title} description={description} onClose={close} initialFocus={tone === "danger" && !requireText ? "[data-cancel]" : undefined}>
      {requireText && (
        <div className="space-y-1.5">
          <label htmlFor={inputId} className="block text-body font-semibold">
            {requireLabel}
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-body"
          />
        </div>
      )}
      <Button variant={tone === "danger" ? "danger" : "primary"} fullWidth disabled={!ok} loading={loading} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button variant="secondary" fullWidth onClick={close} data-cancel="">
        {cancelLabel}
      </Button>
    </BottomSheet>
  );
}
