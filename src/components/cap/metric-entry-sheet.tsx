"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { latestMeasurement } from "@/lib/domain/calculs";
import type { IsoDate, Marker } from "@/lib/domain/types";
import { jourDate, lireNombre, nombre } from "@/lib/format";
import { today } from "@/lib/selectors";
import { useStore } from "@/lib/store";

/** Saisie d'un repère en 1 tap (feuille préremplie avec la dernière valeur). */
export function MetricEntrySheet({ marker, onClose, defaultDate }: { marker: Marker | null; onClose: () => void; defaultDate?: IsoDate }) {
  return marker ? <Inner key={marker.id} marker={marker} onClose={onClose} defaultDate={defaultDate} /> : null;
}

function Inner({ marker, onClose, defaultDate }: { marker: Marker; onClose: () => void; defaultDate?: IsoDate }) {
  const { data, run } = useStore();
  const toast = useToast();
  const last = latestMeasurement(data.measurements, marker.id);
  const [raw, setRaw] = useState(last ? String(last.value).replace(".", ",") : "");
  const [day, setDay] = useState<IsoDate>(defaultDate ?? today());
  const [changingDay, setChangingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bump = (d: number) => {
    const n = lireNombre(raw) ?? 0;
    setRaw(String(Math.round((n + d) * 100) / 100).replace(".", ","));
    setError(null);
  };

  const save = async () => {
    const value = lireNombre(raw);
    if (value == null) {
      setError("Entre un nombre.");
      return;
    }
    setSaving(true);
    try {
      await run((r) => r.addMeasurement({ markerId: marker.id, date: day, value }));
      toast(`Repère noté : ${nombre(value)} ${marker.unit}.`.replace(" .", "."), { tone: "success" });
      onClose();
    } catch {
      toast("Ce n'est pas enregistré. Vérifie ta connexion et réessaie.", { tone: "attention", action: { label: "Réessayer", onClick: save } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open title={`Noter : ${marker.name}`} onClose={onClose}>
      <label htmlFor="metric-value" className="sr-only">
        Valeur en {marker.unit || "unités"}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Moins 1" onClick={() => bump(-1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong text-primary">
          <Minus aria-hidden="true" />
        </button>
        <div className="relative flex-1">
          <input
            id="metric-value"
            inputMode="decimal"
            autoComplete="off"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && save()}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "metric-err" : undefined}
            className="h-16 w-full rounded-md border border-border-strong bg-surface px-4 text-center text-number tabular-nums"
          />
        </div>
        <button type="button" aria-label="Plus 1" onClick={() => bump(1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong text-primary">
          <Plus aria-hidden="true" />
        </button>
      </div>
      <p className="text-center text-small text-ink-muted">{marker.unit}</p>
      {error && (
        <p id="metric-err" role="alert" className="text-center text-small font-semibold text-attention">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between text-small">
        <span>{day === today() ? "Aujourd'hui" : jourDate(day)}</span>
        <button type="button" className="min-h-11 px-2 font-semibold text-primary" onClick={() => setChangingDay((v) => !v)}>
          Changer de jour
        </button>
      </div>
      {changingDay && (
        <div className="space-y-1">
          <label htmlFor="metric-day" className="block text-small font-semibold">
            Jour
          </label>
          <input
            id="metric-day"
            type="date"
            max={today()}
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-body"
          />
        </div>
      )}
      <Button fullWidth loading={saving} onClick={save}>
        Enregistrer
      </Button>
    </BottomSheet>
  );
}
