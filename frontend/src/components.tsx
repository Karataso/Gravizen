import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import {
  Line,
  LineChart,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber, getHazardMeta, getIndicatorMeta, severityLabel } from './domain';
import type {
  CrewMember,
  HazardStatus,
  IndicatorStatus,
  SeriesPoint,
  Severity,
} from './types';

function SeverityDot({
  severity,
  size = 10,
  className = '',
}: {
  severity: Severity;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`severity-indicator severity-${severity} ${className}`.trim()}
      style={{ '--indicator-size': `${size}px` } as CSSProperties}
      aria-hidden="true"
    />
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`severity-badge severity-${severity}`}>
      <SeverityDot severity={severity} size={10} />
      <span>{severityLabel[severity]}</span>
    </span>
  );
}

export function TrafficLight({ severity, size = 12, ariaLabel }: { severity: Severity; size?: number; ariaLabel?: string }) {
  return (
    <span
      className={`traffic-light severity-indicator severity-${severity}`}
      style={{ '--indicator-size': `${size}px` } as CSSProperties}
      aria-label={ariaLabel ?? severityLabel[severity]}
      role="img"
    />
  );
}

export function SeverityReadout({ severity }: { severity: Severity }) {
  return (
    <span className={`severity-readout severity-${severity}`}>
      <SeverityDot severity={severity} size={10} />
      <span>{severityLabel[severity]}</span>
    </span>
  );
}

export function ProjectionText({ days }: { days: number | null }) {
  if (days === null) {
    return <span className="projection-unavailable">No hay datos suficientes para proyectar el cruce.</span>;
  }

  if (days <= 0) {
    return <span>El umbral ya está cruzado.</span>;
  }

  if (days === 1) {
    return <span>Cruzarás el umbral <b>mañana</b>.</span>;
  }

  return (
    <span>
      Al ritmo actual, cruzarás el umbral en <b>{days} días</b>.
    </span>
  );
}

export function HazardCard({ hazard }: { hazard: HazardStatus }) {
  const meta = getHazardMeta(hazard.id);
  const headingId = `hazard-title-${hazard.id}`;

  return (
    <article className={`hazard-card ${hazard.level}`} aria-labelledby={headingId}>
      <div className="hazard-header">
        <div>
          <p className="eyebrow">Peligro NASA</p>
          <h3 id={headingId}>{meta.label}</h3>
        </div>
        <SeverityReadout severity={hazard.level} />
      </div>

      <p className="hazard-description">{meta.description}</p>

      <div className="hazard-evidence">
        <span className="evidence-label">Qué cambió</span>
        {hazard.why.length > 0 ? (
          <ul>
            {hazard.why.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p>No hay motivos de evidencia disponibles para este peligro.</p>
        )}
      </div>

      <div className="hazard-protocol">
        <div className="protocol-item">
          <span className="protocol-label">Proyección</span>
          <span className="protocol-value"><ProjectionText days={hazard.daysToThreshold} /></span>
        </div>
        <div className="protocol-item">
          <span className="protocol-label">Acción sugerida</span>
          <span className="protocol-value">{hazard.action}</span>
        </div>
        <div className="protocol-item">
          <span className="protocol-label">Urgencia</span>
          <span className="protocol-value">{hazard.urgency}</span>
        </div>
      </div>
    </article>
  );
}

function useChartSize() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const chartRef = useCallback((node: HTMLDivElement | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return;

    const updateSize = () => {
      const bounds = element.getBoundingClientRect();
      const nextSize = {
        width: Math.max(0, Math.floor(bounds.width)),
        height: Math.max(0, Math.floor(bounds.height)),
      };
      setSize((current) => (
        current.width === nextSize.width && current.height === nextSize.height
          ? current
          : nextSize
      ));
    };

    updateSize();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  // Fallback: if size is still 0 after mount, use a reasonable default
  const width = size.width || 320;
  const height = size.height || 220;

  return { chartRef, width, height };
}

export function TrendChart({
  points,
  indicatorLabel,
  unit,
}: {
  points: SeriesPoint[];
  indicatorLabel: string;
  unit: string;
}) {
  const { chartRef, width, height } = useChartSize();
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]));

  if (points.length === 0) {
    return (
      <div className="chart-empty" role="status">
        <strong>Sin datos para este indicador.</strong>
        <span>Prueba otro indicador o cambia el día de misión.</span>
      </div>
    );
  }

  if (values.length === 0) {
    return (
      <div className="chart-empty" role="status">
        <strong>No hay lecturas en este periodo.</strong>
        <span>La serie contiene días sin datos; no se interpolan valores.</span>
      </div>
    );
  }

  const baselinePoint = points.find((point) => point.baseline !== null);
  const bandPoint = points.find((point) => point.baselineLow !== null && point.baselineHigh !== null);
  const hasBand = bandPoint !== undefined
    && bandPoint.baselineLow !== null
    && bandPoint.baselineHigh !== null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const latest = [...values].reverse()[0] ?? null;
  const missingDays = points.filter((point) => point.value === null).length;
  const summaryId = `trend-summary-${indicatorLabel.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <figure className="trend-figure">
      <figcaption className="sr-only" id={summaryId}>
        Tendencia de {indicatorLabel} durante {points.length} días. Último valor: {formatNumber(latest)} {unit}.
        Promedio: {formatNumber(average)} {unit}. Días sin dato: {missingDays}.
        {baselinePoint?.baseline !== null && baselinePoint?.baseline !== undefined
          ? ` Línea base: ${formatNumber(baselinePoint.baseline)} ${unit}.`
          : ''}
        {hasBand
          ? ` Variabilidad esperada: de ${formatNumber(bandPoint?.baselineLow ?? null)} a ${formatNumber(bandPoint?.baselineHigh ?? null)} ${unit}.`
          : ''}
      </figcaption>
      <div ref={chartRef} className="chart-wrap">
        {width > 0 && height > 0 && (
          <LineChart
            accessibilityLayer
            data={points}
            width={width}
            height={height}
            margin={{ top: 10, right: 8, bottom: 0, left: -22 }}
          >
            {bandPoint && hasBand && (
              <ReferenceArea
                y1={bandPoint.baselineLow ?? undefined}
                y2={bandPoint.baselineHigh ?? undefined}
                fill="var(--chart-band)"
                stroke="none"
                ifOverflow="extendDomain"
              />
            )}
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tickFormatter={(value: number) => `D${value}`}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={46}
            />
            <Tooltip
              cursor={{ stroke: 'var(--chart-cursor)', strokeDasharray: '4 4' }}
              contentStyle={{
                background: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: 10,
                color: 'var(--text)',
              }}
              labelStyle={{ color: 'var(--muted)' }}
              labelFormatter={(label) => `Día ${label}`}
              formatter={(value, name) => {
                const numericValue = Number(value);
                const formatted = Number.isFinite(numericValue)
                  ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(numericValue)} ${unit}`
                  : 'Sin dato';
                return [formatted, name === 'value' ? indicatorLabel : 'Línea base'];
              }}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="var(--chart-baseline)"
              strokeDasharray="5 5"
              dot={false}
              name="baseline"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-value)"
              strokeWidth={3}
              dot={{ r: 2.5, fill: 'var(--chart-value)', strokeWidth: 0 }}
              name="value"
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </div>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="legend-value" />{indicatorLabel}</span>
        {baselinePoint && <span><i className="legend-baseline" />Línea base</span>}
        {hasBand && <span><i className="legend-band" />Variabilidad esperada</span>}
      </div>
    </figure>
  );
}

export function IndicatorSummary({ indicator }: { indicator?: IndicatorStatus }) {
  if (!indicator) {
    return (
      <div className="indicator-summary empty-summary">
        <strong>No hay lectura para este indicador.</strong>
        <span>La serie puede contener días sin datos; no se interpolan valores.</span>
      </div>
    );
  }

  const meta = getIndicatorMeta(indicator.id);

  return (
    <div className="indicator-summary">
      <div className="indicator-summary-heading">
        <div>
          <span className="evidence-label">Indicador seleccionado</span>
          <h3>{meta.label}</h3>
        </div>
        <SeverityBadge severity={indicator.level} />
      </div>
      <dl className="indicator-values">
        <div>
          <dt>Valor</dt>
          <dd>{formatNumber(indicator.value)} {meta.unit}</dd>
        </div>
        <div>
          <dt>Línea base</dt>
          <dd>{formatNumber(indicator.baseline)} {meta.unit}</dd>
        </div>
        <div>
          <dt>Proyección</dt>
          <dd><ProjectionText days={indicator.daysToThreshold} /></dd>
        </div>
      </dl>
      {indicator.why.length > 0 && (
        <ul className="indicator-why">
          {indicator.why.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
      <div className="indicator-guidance">
        <p><b>Acción sugerida:</b> {indicator.action}</p>
        <p><b>Cómo se mide:</b> {meta.howMeasured}</p>
      </div>
    </div>
  );
}

export function AlertPanel({ hazards }: { hazards: HazardStatus[] }) {
  const alerts = hazards.filter((hazard) => hazard.level !== 'normal');

  return (
    <section className="panel alerts-panel" aria-labelledby="alerts-title">
      <div className="alerts-header">
        <div>
          <p className="eyebrow">Respuesta autónoma</p>
          <h2 id="alerts-title">Alertas activas</h2>
        </div>
        <span className="alert-count" aria-label={`${alerts.length} alertas`}>{alerts.length}</span>
      </div>

      {hazards.length === 0 ? (
        <div className="empty-panel alert-data-empty" role="status">
          <strong>Sin datos de peligros.</strong>
          <p>La API no devolvió peligros para este día; no se puede confirmar que no haya alertas.</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="all-clear" role="status">
          <span className="all-clear-icon" aria-hidden="true">✓</span>
          <div className="all-clear-text">
            <strong>Sin alertas activas</strong>
            <p>Mantén la rutina y completa el check-in diario.</p>
          </div>
        </div>
      ) : (
        <div className="alert-list" role="list" aria-live="polite">
          {alerts.map((alert) => {
            const meta = getHazardMeta(alert.id);
            return (
              <article className={`alert-card ${alert.level}`} role="listitem" key={alert.id}>
                <div className="alert-header">
                  <SeverityReadout severity={alert.level} />
                  <b>{meta.label}</b>
                </div>
                {alert.why.length > 0 ? (
                  alert.why.map((reason) => <p key={reason}>{reason}</p>)
                ) : (
                  <p>No hay motivos de evidencia disponibles.</p>
                )}
                <div className="alert-protocol">
                  <span><b>Proyección:</b> <ProjectionText days={alert.daysToThreshold} /></span>
                  <span><b>Acción:</b> {alert.action}</span>
                  <span><b>Urgencia:</b> {alert.urgency}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function CrewSwitcher({
  members,
  selectedId,
  onSelect,
}: {
  members: CrewMember[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="crew-switcher" aria-label="Resumen de tripulación">
      <p className="switcher-label" id="crew-summary-label">Semáforo de la tripulación</p>
      <ul className="crew-list" aria-labelledby="crew-summary-label">
        {members.map((member) => {
          const selected = member.id === selectedId;
          return (
            <li key={member.id}>
              <button
                type="button"
                className={`crew-btn ${selected ? 'active' : ''}`}
                onClick={() => onSelect(member.id)}
                aria-pressed={selected}
              >
                <TrafficLight severity={member.severity} size={14} ariaLabel={`${member.name}: ${severityLabel[member.severity]}`} />
                <div className="crew-info">
                  <span className="crew-name">{member.name}</span>
                  <span className="crew-role">{member.role}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DaySlider({ day, onChange }: { day: number; onChange: (day: number) => void }) {
  return (
    <div className="day-slider">
      <label htmlFor="mission-day">
        <span>Día de misión</span>
        <output htmlFor="mission-day">Día {day} de 119</output>
      </label>
      <input
        id="mission-day"
        type="range"
        min="0"
        max="119"
        step="1"
        value={day}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`Día ${day} de 119`}
      />
      <div className="day-scale" aria-hidden="true"><span>Lanzamiento</span><span>Final</span></div>
    </div>
  );
}
