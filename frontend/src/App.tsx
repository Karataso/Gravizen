import { useEffect, useMemo, useState } from 'react';
import { ApiError, DEMO_MODE, fetchCrew, getSeriesPoints, loadDashboard, updateCrewProfile } from './api';
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
import type { CrewMember, DashboardData, MissionProfile, Severity } from './types';

type AppView = 'dashboard' | 'checkin' | 'earth';

function initialView(): AppView {
  const requestedView = new URLSearchParams(window.location.search).get('view');
  if (requestedView === 'checkin' || requestedView === 'earth') return requestedView;
  return 'dashboard';
}

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
  const [view, setView] = useState<AppView>(initialView);
  const [profileSaving, setProfileSaving] = useState(false);
  const {
    isOnline,
    pendingCount,
    isSyncing,
    triggerSync,
    refreshPendingCount,
  } = useSyncQueue();

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
    await triggerSync();
    await refreshPendingCount();
    retry();
  };

  const handleReportCreated = async () => {
    await triggerSync();
    await refreshPendingCount();
  };

  const handleProfileChange = async (profile: MissionProfile) => {
    if (DEMO_MODE) return;
    setProfileSaving(true);
    try {
      await updateCrewProfile(effectiveCrewId, profile);
      retry();
    } catch (error) {
      setDashboardError(error);
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido principal</a>

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">V</span>
          <div className="brand-text">
            <span className="brand-title">VITALIS</span>
            <span className="brand-subtitle">Salud en misión</span>
          </div>
        </div>
        <div className="top-actions">
          <span className={`connection ${data?.source === 'demo' ? 'demo' : ''}`}>
            <i className="indicator" aria-hidden="true" />
            {crewError || dashboardError
              ? 'API no disponible'
              : data?.source === 'demo'
                ? 'Datos de demostración'
                : data
                  ? 'API conectada'
                  : 'Conectando…'}
          </span>
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
            <span className="module-label-full">Check-in diario</span>
            <span className="module-label-short">Check-in</span>
          </button>
          <button
            type="button"
            className={view === 'earth' ? 'module-tab active' : 'module-tab'}
            onClick={() => setView('earth')}
            aria-pressed={view === 'earth'}
          >
            <span className="module-label-full">Enlace con Tierra</span>
            <span className="module-label-short">Tierra</span>
          </button>
        </div>

        <div className="sync-controls">
          <span className={`sync-status ${isOnline ? 'online' : 'offline'}`} role="status">
            <span className="sync-dot" aria-hidden="true" />
            {isOnline ? 'Conectado' : 'Sin conexión'}
          </span>
          {pendingCount > 0 && (
            <span className="pending-badge" aria-live="polite">
              {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            className={`sync-btn ${isSyncing ? 'syncing' : ''}`}
            onClick={() => void triggerSync()}
            disabled={!isOnline || isSyncing}
            aria-label={isSyncing ? 'Sincronizando datos' : 'Sincronizar datos'}
          >
            <span className="sync-icon" aria-hidden="true">
              <span className="sync-arrow" />
              <span className="sync-arrow" />
            </span>
            <span className="sync-label">
              {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
            </span>
          </button>
        </div>
      </nav>

      <div className="layout">
        <aside className="crew-sidebar">
          <div className="aside-header">
            <div>
              <p className="eyebrow">Misión Asteria</p>
              <h1>Tripulación</h1>
            </div>
            <span className="mission-day-badge">DÍA {data?.missionDay ?? day}</span>
          </div>

          {crewLoading ? (
            <div className="sidebar-loading" role="status">Cargando resumen de tripulación…</div>
          ) : (
            <CrewSwitcher members={crew} selectedId={crewId} onSelect={setCrewId} />
          )}

          <div className="privacy-note">
            <span className="privacy-icon" aria-hidden="true">🔒</span>
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
                <section className="state-panel" role="alert">
                  <span className="state-icon" aria-hidden="true">!</span>
                  <div>
                    <p className="eyebrow">Conexión con la API</p>
                    <h2>No pudimos cargar la tripulación</h2>
                    <p>{errorMessage(crewError)}</p>
                    <button type="button" className="primary-btn" onClick={retry}>Reintentar conexión</button>
                  </div>
                </section>
              ) : dashboardError ? (
                <section className="state-panel" role="alert">
                  <span className="state-icon" aria-hidden="true">!</span>
                  <div>
                    <p className="eyebrow">Estado de misión</p>
                    <h2>No pudimos cargar el día {day}</h2>
                    <p>{errorMessage(dashboardError)}</p>
                    <button type="button" className="primary-btn" onClick={retry}>Reintentar conexión</button>
                  </div>
                </section>
              ) : dashboardLoading || !data ? (
                <section className="state-panel" aria-live="polite" aria-busy="true">
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
                    <div className="welcome-text">
                      <p className="eyebrow">Estado personal · {selectedMember?.role ?? 'Tripulación'}</p>
                      <h2>Hola, {selectedMember?.name ?? 'tripulante'}</h2>
                      <p className="welcome-subtitle muted">
                        {profileLabel(data.profile)} · Esta lectura compara tu tendencia con tu propia línea base.
                      </p>
                      <div className="profile-control">
                        <label htmlFor="profile-select">Perfil de misión</label>
                        <select
                          id="profile-select"
                          value={data.profile ?? 'mars_transit'}
                          onChange={(event) => void handleProfileChange(event.target.value as MissionProfile)}
                          disabled={profileSaving || DEMO_MODE}
                        >
                          <option value="station">Estación orbital</option>
                          <option value="moon">Luna</option>
                          <option value="mars_transit">Tránsito a Marte</option>
                        </select>
                        <span className="profile-control-status" aria-live="polite">
                          {profileSaving ? 'Actualizando…' : ''}
                        </span>
                      </div>
                    </div>
                    <SeverityBadge severity={highestSeverity} />
                  </div>

                  <DaySlider day={day} onChange={setDay} />

                  <section aria-labelledby="hazards-title">
                    <div className="section-header">
                      <div>
                        <p className="eyebrow">Peligros de NASA</p>
                        <h2 id="hazards-title">Estado de los peligros</h2>
                      </div>
                      <span className="section-hint">{data.hazards.length} de 5 reportados · círculo + nivel</span>
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
                    <section className="panel trend-panel" aria-labelledby="trend-title">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">Últimos 30 días</p>
                          <h2 id="trend-title">Tendencia de {selectedIndicatorMeta.label}</h2>
                        </div>
                        <div className="trend-stats">
                          <div className="trend-avg">
                            <span className="trend-avg-value">
                              {trendAverage === null ? '—' : trendAverage.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                            </span>
                            <span className="trend-avg-label">{selectedIndicatorMeta.unit} promedio</span>
                          </div>
                        </div>
                      </div>

                      <div className="indicator-select">
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

                      <div className="chart-wrapper">
                        <TrendChart
                          points={trendPoints}
                          indicatorLabel={selectedIndicatorMeta.label}
                          unit={selectedIndicatorMeta.unit}
                        />
                      </div>
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