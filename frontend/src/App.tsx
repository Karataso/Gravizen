import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { ApiError, DEMO_MODE, fetchCrew, getSeriesPoints, loadDashboard } from './api';
import {
  AlertPanel,
  CrewSwitcher,
  DaySlider,
  HazardCard,
  IndicatorSummary,
  SeverityBadge,
  TrendChart,
} from './components';
import { getIndicatorMeta, severityRank } from './domain';
import { CheckInForm } from './components/CheckInForm';
import { EarthLinkPanel } from './components/EarthLinkPanel';
import { useSyncQueue } from './hooks/useSyncQueue';
import type { CrewMember, DashboardData, Severity } from './types';

type AppView = 'dashboard' | 'checkin' | 'earth';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return 'No se pudo conectar con la API. Comprueba que esté activa y que VITE_API_URL apunte al servidor correcto.';
  }
  if (error instanceof SyntaxError) {
    return 'La API devolvió una respuesta que no es JSON. Revisa la URL y el proxy del frontend.';
  }
  return 'Ocurrió un error inesperado al cargar el dashboard.';
}

function profileLabel(profile: string | null): string {
  if (!profile) return 'Perfil no informado';
  const labels: Record<string, string> = {
    station: 'Estación orbital',
    leo: 'Estación orbital',
    moon: 'Luna',
    lunar: 'Luna',
    mars_transit: 'Tránsito a Marte',
    mars: 'Marte',
  };
  return labels[profile] ?? profile.replaceAll('_', ' ');
}

export default function App() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [crewId, setCrewId] = useState('');
  const [day, setDay] = useState(118);
  const [data, setData] = useState<DashboardData>();
  const [crewLoading, setCrewLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [crewError, setCrewError] = useState<unknown>();
  const [dashboardError, setDashboardError] = useState<unknown>();
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState('sleep_h');
  const [dark, setDark] = useState(() => {
    try {
      return window.localStorage.getItem('vitalis-theme') !== 'light';
    } catch {
      return true;
    }
  });
  const [view, setView] = useState<AppView>('dashboard');
  const {
    isOnline,
    pendingCount,
    isSyncing,
    triggerSync,
    refreshPendingCount,
  } = useSyncQueue();

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#07131f' : '#eef4f7');
    try {
      window.localStorage.setItem('vitalis-theme', dark ? 'dark' : 'light');
    } catch {
      // La aplicación sigue funcionando si el navegador bloquea el almacenamiento local.
    }
  }, [dark]);

  useEffect(() => {
    const controller = new AbortController();
    setCrewLoading(true);
    setCrewError(undefined);

    fetchCrew(day, controller.signal)
      .then((members) => {
        setCrew(members);
        setCrewId((current) => members.some((member) => member.id === current) ? current : members[0].id);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) setCrewError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCrewLoading(false);
      });

    return () => controller.abort();
  }, [day, reloadToken]);

  useEffect(() => {
    if (!crewId) return;

    const controller = new AbortController();
    setDashboardLoading(true);
    setDashboardError(undefined);
    setData(undefined);

    loadDashboard(crewId, day, controller.signal)
      .then(setData)
      .catch((error: unknown) => {
        if (!isAbortError(error)) setDashboardError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDashboardLoading(false);
      });

    return () => controller.abort();
  }, [crewId, day, reloadToken]);

  const availableIndicatorIds = useMemo(() => {
    if (!data) return [];
    const ids = new Set(data.indicators.map((indicator) => indicator.id));
    Object.keys(data.series.values).forEach((id) => ids.add(id));
    return [...ids];
  }, [data]);

  const effectiveIndicatorId = availableIndicatorIds.includes(selectedIndicatorId)
    ? selectedIndicatorId
    : availableIndicatorIds[0] ?? '';

  const selectedMember = crew.find((member) => member.id === crewId);
  const highestSeverity = data?.hazards.reduce<Severity>(
    (highest, hazard) => severityRank[hazard.level] > severityRank[highest] ? hazard.level : highest,
    'normal',
  ) ?? 'normal';

  const selectedIndicator = data?.indicators.find((indicator) => indicator.id === effectiveIndicatorId);
  const selectedIndicatorMeta = effectiveIndicatorId
    ? getIndicatorMeta(effectiveIndicatorId)
    : { label: 'Sin indicador', unit: '', howMeasured: 'No hay indicadores disponibles para este día.' };
  const trendPoints = useMemo(
    () => data ? getSeriesPoints(data.series, effectiveIndicatorId) : [],
    [data, effectiveIndicatorId],
  );
  const trendValues = trendPoints.flatMap((point) => point.value === null ? [] : [point.value]);
  const trendAverage = trendValues.length > 0
    ? trendValues.reduce((sum, value) => sum + value, 0) / trendValues.length
    : null;

  const retry = () => setReloadToken((token) => token + 1);
  const effectiveCrewId = crewId || crew[0]?.id || 'c1';
  const currentMissionDay = data?.missionDay ?? day;

  const handleCheckInSaved = async () => {
    // Esperar la sincronización: si no, el dashboard recarga antes de que el
    // check-in llegue a la API y el color no cambia.
    await triggerSync();
    await refreshPendingCount();
    retry();
  };

  const handleReportCreated = () => {
    void refreshPendingCount();
    void triggerSync();
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido principal</a>

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span>
            <b>VITALIS</b>
            <small>Sistema de salud en misión</small>
          </span>
        </div>
        <div className="top-actions">
          <span className={`connection ${data?.source === 'demo' ? 'demo' : ''}`}>
            <i aria-hidden="true" />
            {crewError || dashboardError
              ? 'API no disponible'
              : data?.source === 'demo'
                ? 'Datos de demostración'
                : data
                  ? 'API conectada'
                  : 'Conectando…'}
          </span>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDark((current) => !current)}
            aria-label="Tema oscuro"
            aria-pressed={dark}
          >
            <span aria-hidden="true">{dark ? '☼' : '☾'}</span>
          </button>
        </div>
      </header>

      <nav className="module-nav" aria-label="Módulos de Vitalis">
        <div className="module-tabs">
          <button
            type="button"
            className={view === 'dashboard' ? 'module-tab active' : 'module-tab'}
            onClick={() => setView('dashboard')}
            aria-pressed={view === 'dashboard'}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={view === 'checkin' ? 'module-tab active' : 'module-tab'}
            onClick={() => setView('checkin')}
            aria-pressed={view === 'checkin'}
          >
            Check-in diario
          </button>
          <button
            type="button"
            className={view === 'earth' ? 'module-tab active' : 'module-tab'}
            onClick={() => setView('earth')}
            aria-pressed={view === 'earth'}
          >
            Enlace con Tierra
          </button>
        </div>

        <div className="sync-controls">
          <span className={`sync-state ${isOnline ? 'online' : 'offline'}`} role="status">
            {isOnline ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
            {isOnline ? 'Conectado' : 'Sin conexión'}
          </span>
          {pendingCount > 0 && (
            <span className="pending-count" aria-live="polite">
              {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            className="sync-button"
            onClick={() => void triggerSync()}
            disabled={!isOnline || isSyncing}
          >
            <RefreshCw className={isSyncing ? 'spinning' : ''} aria-hidden="true" />
            {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        </div>
      </nav>

      <div className="layout">
        <aside className="crew-sidebar">
          <div className="aside-heading">
            <div>
              <p className="eyebrow">Misión Asteria</p>
              <h1>Tripulación</h1>
            </div>
            <span className="mission-day">DÍA {data?.missionDay ?? day}</span>
          </div>

          {crewLoading ? (
            <div className="sidebar-loading" role="status">Cargando resumen de tripulación…</div>
          ) : (
            <CrewSwitcher members={crew} selectedId={crewId} onSelect={setCrewId} />
          )}

          <div className="privacy-note">
            <span aria-hidden="true">⌁</span>
            <p>
              <b>Privacidad primero</b>
              El resumen solo muestra nombre, rol y semáforo. No expone datos clínicos de otras personas.
            </p>
          </div>
        </aside>

        <main id="main-content" className="content" tabIndex={-1}>
          {view === 'checkin' ? (
            <div className="module-view">
              <CheckInForm
                crewId={effectiveCrewId}
                currentDay={currentMissionDay}
                isOnline={isOnline}
                onSaved={handleCheckInSaved}
              />
            </div>
          ) : view === 'earth' ? (
            <div className="module-view">
              <EarthLinkPanel
                crewId={effectiveCrewId}
                currentDay={currentMissionDay}
                onReportCreated={handleReportCreated}
              />
            </div>
          ) : (
            <>
              {crewError ? (
            <section className="state-panel error-state" role="alert">
              <span className="state-icon" aria-hidden="true">!</span>
              <div>
                <p className="eyebrow">Conexión con la API</p>
                <h2>No pudimos cargar la tripulación</h2>
                <p>{errorMessage(crewError)}</p>
                <button type="button" className="primary-button" onClick={retry}>Reintentar conexión</button>
              </div>
            </section>
          ) : dashboardError ? (
            <section className="state-panel error-state" role="alert">
              <span className="state-icon" aria-hidden="true">!</span>
              <div>
                <p className="eyebrow">Estado de misión</p>
                <h2>No pudimos cargar el día {day}</h2>
                <p>{errorMessage(dashboardError)}</p>
                <button type="button" className="primary-button" onClick={retry}>Reintentar conexión</button>
              </div>
            </section>
          ) : dashboardLoading || !data ? (
            <section className="state-panel loading-state" aria-live="polite" aria-busy="true">
              <span className="loader" aria-hidden="true" />
              <div>
                <p className="eyebrow">Estado de misión</p>
                <h2>{DEMO_MODE ? 'Cargando datos de demostración…' : 'Cargando datos reales…'}</h2>
                <p>Consultando estado, alertas y serie de indicadores.</p>
              </div>
            </section>
          ) : (
            <>
              {data.source === 'demo' && (
                <div className="demo-banner" role="status">
                  <b>Modo demostración</b>
                  <span>Los datos de este dashboard son simulados y no proceden de la API.</span>
                </div>
              )}

              <div className="welcome">
                <div>
                  <p className="eyebrow">Estado personal · {selectedMember?.role ?? 'Tripulación'}</p>
                  <h2>Hola, {selectedMember?.name ?? 'tripulante'}</h2>
                  <p className="muted">
                    {profileLabel(data.profile)} · Esta lectura compara tu tendencia con tu propia línea base.
                  </p>
                </div>
                <SeverityBadge severity={highestSeverity} />
              </div>

              <DaySlider day={day} onChange={setDay} />

              <section aria-labelledby="hazards-title">
                <div className="section-title hazards-title">
                  <div>
                    <p className="eyebrow">Peligros de NASA</p>
                    <h2 id="hazards-title">Estado de los peligros</h2>
                  </div>
                  <span className="section-hint">{data.hazards.length} de 5 reportados · color + icono + nivel</span>
                </div>
                {data.hazards.length > 0 ? (
                  <div className="hazards-grid">
                    {data.hazards.map((hazard) => <HazardCard hazard={hazard} key={hazard.id} />)}
                  </div>
                ) : (
                  <div className="empty-panel" role="status">La API no devolvió peligros para este día.</div>
                )}
              </section>

              <div className="lower-grid">
                <section className="panel trend" aria-labelledby="trend-title">
                  <div className="section-title trend-heading">
                    <div>
                      <p className="eyebrow">Últimos 30 días</p>
                      <h2 id="trend-title">Tendencia de {selectedIndicatorMeta.label}</h2>
                    </div>
                    <div className="trend-stat">
                      <strong>{trendAverage === null ? '—' : trendAverage.toLocaleString('es-ES', { maximumFractionDigits: 1 })} {selectedIndicatorMeta.unit}</strong>
                      <small>promedio</small>
                    </div>
                  </div>

                  <div className="indicator-picker">
                    <label htmlFor="indicator-select">Indicador</label>
                    <select
                      id="indicator-select"
                      value={effectiveIndicatorId}
                      onChange={(event) => setSelectedIndicatorId(event.target.value)}
                    >
                      {availableIndicatorIds.length > 0 ? (
                        availableIndicatorIds.map((id) => (
                          <option value={id} key={id}>{getIndicatorMeta(id).label}</option>
                        ))
                      ) : (
                        <option value="">Sin indicadores</option>
                      )}
                    </select>
                  </div>

                  <TrendChart
                    points={trendPoints}
                    indicatorLabel={selectedIndicatorMeta.label}
                    unit={selectedIndicatorMeta.unit}
                  />
                  <IndicatorSummary indicator={selectedIndicator} />
                </section>

                <AlertPanel hazards={data.hazards} />
              </div>

              <footer className="app-footer">
                <p><b>Vitalis apoya la decisión; no diagnostica.</b> Los datos de la fisiología son simulados y los umbrales de prototipo deben validarse con el médico de vuelo.</p>
                {DEMO_MODE && <span>Demostración local · sin datos clínicos reales</span>}
              </footer>
            </>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
