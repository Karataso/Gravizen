import { useEffect, useState } from 'react';
import { AlertPanel, CrewSwitcher, DaySlider, HazardCard, SeverityBadge, TrendChart } from './components';
import { loadDashboard } from './api';
import type { DashboardData } from './types';
import './styles.css';

export default function App() {
  const [crewId, setCrewId] = useState('c1');
  const [day, setDay] = useState(118);
  const [data, setData] = useState<DashboardData>();
  const [dark, setDark] = useState(true);

  useEffect(() => { loadDashboard(crewId, day).then(setData); }, [crewId, day]);
  if (!data) return <main className="loading">Cargando estado de misión…</main>;

  const highest = data.hazards.reduce((current, hazard) => ['emergency', 'act', 'watch'].indexOf(hazard.severity) < ['emergency', 'act', 'watch'].indexOf(current.severity) ? hazard : current, data.hazards[0]);
  return <main className={dark ? 'app' : 'app light'}>
    <header className="topbar"><div className="brand"><span className="brand-mark">V</span><span><b>VITALIS</b><small>Mission health system</small></span></div><div className="top-actions"><span className="connection"><i /> {data.source === 'api' ? 'API conectada' : 'Modo demostración'}</span><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Cambiar modo de color">{dark ? '☼' : '☾'}</button></div></header>
    <div className="layout"><aside><div className="aside-heading"><div><p className="eyebrow">Misión Asteria</p><h1>Tripulación</h1></div><span className="mission-day">DÍA {data.missionDay}</span></div><CrewSwitcher members={data.crew} selectedId={crewId} onSelect={setCrewId} /><div className="privacy-note"><span>⌁</span><p><b>Privacidad primero</b><br />El resumen solo muestra semáforos.</p></div></aside>
      <section className="content"><div className="welcome"><div><p className="eyebrow">Estado personal · {data.crew.find((member) => member.id === crewId)?.role}</p><h2>Hola, {data.crew.find((member) => member.id === crewId)?.name}</h2><p className="muted">Así evoluciona tu estado durante la misión.</p></div><SeverityBadge severity={highest.severity} /></div><DaySlider day={day} onChange={setDay} /><div className="hazards-grid">{data.hazards.map((hazard) => <HazardCard hazard={hazard} key={hazard.id} />)}</div><div className="lower-grid"><section className="panel trend"><div className="section-title"><div><p className="eyebrow">Últimos 14 días</p><h2>Tendencia de sueño</h2></div><span className="trend-value">6h 18m <small>promedio</small></span></div><TrendChart points={data.series} /></section><AlertPanel hazards={data.hazards} /></div></section>
    </div>
  </main>;
}
