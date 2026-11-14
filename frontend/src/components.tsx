import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CrewMember, HazardStatus, SeriesPoint, Severity } from './types';

const severityMeta: Record<Severity, { label: string; color: string; dot: string }> = {
  normal: { label: 'Normal', color: '#57d6a1', dot: 'bg-emerald-300' },
  watch: { label: 'Vigilar', color: '#f4c95d', dot: 'bg-amber-300' },
  act: { label: 'Actuar', color: '#ff9862', dot: 'bg-orange-400' },
  emergency: { label: 'Emergencia', color: '#ff6b7a', dot: 'bg-rose-400' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  return <span className="severity" style={{ color: meta.color, borderColor: `${meta.color}55` }}><i className={meta.dot} />{meta.label}</span>;
}

export function HazardCard({ hazard }: { hazard: HazardStatus }) {
  return <article className="panel hazard-card">
    <div className="card-heading"><div><p className="eyebrow">Indicador</p><h3>{hazard.label}</h3></div><SeverityBadge severity={hazard.severity} /></div>
    <div className="metric"><strong>{hazard.value}</strong><span>{hazard.unit}</span></div>
    <p className="muted">{hazard.explanation}</p>
    {hazard.daysToThreshold !== null && <p className="projection">Cruzarás el umbral en <b>{hazard.daysToThreshold} días</b></p>}
  </article>;
}

export function TrendChart({ points }: { points: SeriesPoint[] }) {
  return <div className="chart-wrap" aria-label="Tendencia de sueño de los últimos 14 días">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 10, right: 8, bottom: 0, left: -24 }}>
      <XAxis dataKey="day" tick={{ fill: '#74859a', fontSize: 11 }} tickLine={false} axisLine={false} />
      <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} tick={{ fill: '#74859a', fontSize: 11 }} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={{ background: '#102235', border: '1px solid #29445c', borderRadius: 10 }} labelStyle={{ color: '#9fb1c5' }} />
      <Line type="monotone" dataKey="baseline" stroke="#59728b" strokeDasharray="5 5" dot={false} name="Línea base" />
      <Line type="monotone" dataKey="value" stroke="#68d4c0" strokeWidth={3} dot={{ r: 3, fill: '#68d4c0' }} name="Sueño" />
    </LineChart></ResponsiveContainer>
  </div>;
}

export function AlertPanel({ hazards }: { hazards: HazardStatus[] }) {
  const alerts = hazards.filter((hazard) => hazard.severity !== 'normal');
  return <section className="panel alerts"><div className="section-title"><div><p className="eyebrow">Respuesta autónoma</p><h2>Alertas activas</h2></div><span className="alert-count">{alerts.length}</span></div>
    {alerts.map((alert) => <div className="alert-row" key={alert.id}><SeverityBadge severity={alert.severity} /><div className="alert-copy"><b>{alert.label}</b><span>{alert.action}</span></div><strong className="urgency">{alert.urgency}</strong></div>)}
  </section>;
}

export function CrewSwitcher({ members, selectedId, onSelect }: { members: CrewMember[]; selectedId: string; onSelect: (id: string) => void }) {
  return <nav className="crew-list" aria-label="Seleccionar tripulante">{members.map((member) => <button className={member.id === selectedId ? 'crew active' : 'crew'} key={member.id} onClick={() => onSelect(member.id)}><span className="avatar">{member.name[0]}</span><span><b>{member.name}</b><small>{member.role}</small></span><SeverityBadge severity={member.severity} /></button>)}</nav>;
}

export function DaySlider({ day, onChange }: { day: number; onChange: (day: number) => void }) {
  return <label className="day-slider"><span>Día de misión <b>{day}</b></span><input type="range" min="1" max="120" value={day} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
