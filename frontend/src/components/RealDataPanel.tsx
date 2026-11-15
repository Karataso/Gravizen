import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ApiError, fetchInspiration4Glucose } from '../api';
import type { GlucoseReference } from '../types';

const COLORS = ['#f97316', '#38bdf8', '#22c55e', '#e879f9'];

export function RealDataPanel() {
  const [data, setData] = useState<GlucoseReference>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetchInspiration4Glucose(controller.signal)
      .then(setData)
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const { rows, crews, labels } = useMemo(() => {
    if (!data) return { rows: [], crews: [], labels: {} as Record<number, string> };

    const crews = [...new Set(data.points.map((point) => point.crewId))].sort();
    const labels: Record<number, string> = {};
    const rows = [...new Set(data.points.map((point) => point.day))]
      .sort((a, b) => a - b)
      .map((day) => {
        const row: Record<string, number | string | null> = { day };
        for (const point of data.points) {
          if (point.day !== day) continue;
          row[point.crewId] = point.value;
          labels[day] = point.timepoint;
        }
        return row;
      });

    return { rows, crews, labels };
  }, [data]);

  if (loading) {
    return (
      <section className="state-panel" aria-live="polite" aria-busy="true">
        <span className="loader" aria-hidden="true" />
        <div>
          <p className="eyebrow">Datos reales · NASA OSDR</p>
          <h2>Cargando la glucosa de Inspiration4…</h2>
          <p>Leyendo el panel metabólico público OSD-575.</p>
        </div>
      </section>
    );
  }

  if (error || !data) {
    const message = error instanceof ApiError
      ? error.message
      : 'No se pudieron cargar los datos reales. Revisa que la API esté activa.';
    return (
      <section className="state-panel" role="alert">
        <span className="state-icon" aria-hidden="true">!</span>
        <div>
          <p className="eyebrow">Datos reales · NASA OSDR</p>
          <h2>No pudimos cargar la referencia</h2>
          <p>{message}</p>
        </div>
      </section>
    );
  }

  const crewName = (id: string) => `Tripulante ${id.replace('C', '')}`;

  return (
    <section className="panel evidence-panel" aria-labelledby="evidence-title">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Datos reales · NASA OSDR · {data.study}</p>
          <h2 id="evidence-title">Glucosa de Inspiration4</h2>
        </div>
        <span className="section-hint">
          {data.points.length} muestras · {crews.length} tripulantes
        </span>
      </div>

      <p className="muted">{data.note}</p>

      <div className="evidence-split">
        <div>
          <b>Qué es real</b>
          <p>
            Las 28 muestras de glucosa de 4 tripulantes de Inspiration4,
            antes y después del vuelo. Fuente: <a href={data.sourceUrl} target="_blank" rel="noreferrer">
              {data.study}
            </a>.
          </p>
        </div>
        <div>
          <b>Qué es simulado</b>
          <p>
            La serie diaria de 120 días del dashboard. No existe una serie pública
            de signos vitales diarios de astronautas; el simulador usa estos rangos
            como calibración.
          </p>
        </div>
      </div>

      <div className="chart-wrapper" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => labels[value] ?? String(value)}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(value: number) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: 10,
                color: 'var(--text)',
              }}
              labelFormatter={(label) => labels[Number(label)] ?? String(label)}
              formatter={(value, name) => [
                value === null || value === undefined ? 'Sin dato' : `${value} ${data.unit}`,
                crewName(String(name)),
              ]}
            />
            <Legend formatter={(value) => crewName(String(value))} />
            {crews.map((crew, index) => (
              <Line
                key={crew}
                type="monotone"
                dataKey={crew}
                name={crew}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: COLORS[index % COLORS.length] }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="muted evidence-footnote">
        Eje X: días respecto al lanzamiento (L = antes, R = después).
        {data.preflightMedian !== null && (
          <> Mediana pre-vuelo: <b>{data.preflightMedian} {data.unit}</b>.</>
        )}
        {' '}{data.license}.
      </p>
    </section>
  );
}
