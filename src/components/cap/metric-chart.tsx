"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { markerWeeklySeries } from "@/lib/domain/calculs";
import type { Marker, Measurement } from "@/lib/domain/types";
import { date as fmtDate, nombre } from "@/lib/format";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Graphique d'un repère sur N semaines (valeur hebdo selon `marker.aggregation`). */
export function MetricChart({ marker, measurements, refDate, weeks = 8 }: { marker: Marker; measurements: Measurement[]; refDate: string; weeks?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const series = markerWeeklySeries(marker, measurements, refDate, weeks);
  const points = series.map((p, i) => ({
    label: i === series.length - 1 ? "Cette sem." : `S-${series.length - 1 - i}`,
    weekStart: p.weekStart,
    value: p.value == null ? null : Math.round(p.value * 100) / 100,
  }));
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const unit = marker.unit ? ` ${marker.unit}` : "";
  const summary =
    last?.value == null && prev?.value == null
      ? "Aucun repère noté ces deux dernières semaines."
      : `Cette semaine : ${last?.value == null ? "pas encore noté" : `${nombre(last.value)}${unit}`}. Semaine dernière : ${
          prev?.value == null ? "pas de valeur" : `${nombre(prev.value)}${unit}`
        }.`;
  const asBars = marker.unit.trim().toLowerCase() === "fois";
  const lastIndex = points.length - 1;

  const common = {
    width,
    height: 200,
    data: points,
    margin: { top: 16, right: 24, bottom: 0, left: -12 },
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} interval="preserveEnd" minTickGap={2} padding={{ left: 8, right: 20 }} />
      <YAxis tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} width={48} domain={["auto", "auto"]} />
      <ReferenceLine
        y={marker.target}
        ifOverflow="extendDomain"
        stroke="var(--color-chart-target)"
        strokeDasharray="5 4"
        label={{ value: `But ${nombre(marker.target)}`, position: "insideTopRight", fontSize: 12, fill: "var(--color-text-muted)" }}
      />
      <Tooltip
        formatter={(v) => [`${nombre(Number(v))}${unit}`, marker.name]}
        labelFormatter={(_, payload) => {
          const ws = payload?.[0]?.payload?.weekStart as string | undefined;
          return ws ? `Semaine du ${fmtDate(ws)}` : "";
        }}
        contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, color: "var(--color-text)" }}
      />
    </>
  );

  return (
    <figure className="space-y-2">
      <div ref={ref} aria-hidden="true" className="h-[200px] w-full">
        {width > 0 &&
          (asBars ? (
            <BarChart {...common}>
              {axes}
              <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          ) : (
            <LineChart {...common}>
              {axes}
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                connectNulls
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; index?: number; value?: unknown }) => {
                  const { cx, cy, index } = props;
                  if (cx == null || cy == null || props.value == null) return <g key={`d${index}`} />;
                  const isLast = index === lastIndex;
                  return <circle key={`d${index}`} cx={cx} cy={cy} r={isLast ? 6 : 4} fill={isLast ? "var(--color-accent)" : "var(--color-primary)"} />;
                }}
              />
            </LineChart>
          ))}
      </div>
      <figcaption className="text-small text-ink">{summary}</figcaption>
      <table className="sr-only">
        <caption>{marker.name}, valeur par semaine</caption>
        <thead>
          <tr>
            <th scope="col">Semaine</th>
            <th scope="col">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.weekStart}>
              <td>Semaine du {fmtDate(p.weekStart)}</td>
              <td>{p.value == null ? "pas de valeur" : `${nombre(p.value)}${unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
