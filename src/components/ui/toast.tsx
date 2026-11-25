"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastTone = "neutral" | "success" | "attention";
interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}
type Show = (text: string, opts?: { tone?: ToastTone; action?: ToastItem["action"] }) => void;

const ToastContext = createContext<Show>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback<Show>((text, opts = {}) => {
    if (timer.current) clearTimeout(timer.current);
    const item = { id: ++seq.current, text, tone: opts.tone ?? "neutral", action: opts.action };
    setToast(item);
    timer.current = setTimeout(() => setToast((t) => (t?.id === item.id ? null : t)), item.action ? 6000 : 4000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => show, [show]);
  const tone =
    toast?.tone === "attention" ? "bg-attention-soft text-ink border border-attention" : toast?.tone === "success" ? "bg-success-soft text-ink" : "bg-ink text-bg";

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role={toast?.tone === "attention" ? "alert" : "status"}
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 12px)" }}
      >
        {toast && (
          <div key={toast.id} className={`anim-fade shadow-float pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-md px-4 py-3 text-small font-semibold ${tone}`}>
            <span className="flex-1">{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                className="min-h-11 shrink-0 px-2 font-bold underline"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
