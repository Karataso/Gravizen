import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Clock, Radio, Send, WifiOff } from 'lucide-react';
import { fetchReports } from '../api';
import { SeverityReadout } from '../components';
import { getAllLocalReports, saveReportOffline } from '../db/offlineStore';
import type { MissionReport } from '../types';
import type { EarthReport, HazardLevel } from '../types/vitalis';

interface EarthLinkPanelProps {
  crewId: string;
  currentDay: number;
  onReportCreated: () => void | Promise<void>;
}

function statusLabel(report: MissionReport, now = Date.now()): string {
  if (report.status === 'responded') return 'Respondido por Control de Misión';
  if (report.status === 'received') return 'Recibido en Tierra · Esperando médico';
  const remaining = Math.max(
    0,
    Math.ceil((new Date(report.createdAt).getTime() + report.etaMinutes * 60_000 - now) / 60_000),
  );
  return `En tránsito (${remaining} min restantes)`;
}

export const EarthLinkPanel: React.FC<EarthLinkPanelProps> = ({
  crewId,
  currentDay,
  onReportCreated,
}) => {
  const [serverReports, setServerReports] = useState<MissionReport[]>([]);
  const [pendingReports, setPendingReports] = useState<EarthReport[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(0);
  const [summary, setSummary] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [level, setLevel] = useState<HazardLevel>('act');

  const load = useCallback(async () => {
    try {
      const local = await getAllLocalReports();
      setPendingReports(local.filter((report) => !report.synced).reverse());
    } catch {
      setPendingReports([]);
    }

    if (!navigator.onLine) {
      setApiError('Sin conexión: se muestran solo los reportes en cola local.');
      return;
    }

    try {
      setServerReports(await fetchReports(crewId));
      setApiError(null);
    } catch {
      setApiError('No se pudo consultar la API; se muestran solo los reportes en cola local.');
    }
  }, [crewId]);

  useEffect(() => {
    setNow(Date.now());
    void load();
    const interval = window.setInterval(() => {
      setNow(Date.now());
      void load();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const handleSendReport = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);

    if (!summary.trim()) {
      setFormError('Describe la situación antes de transmitir el reporte.');
      return;
    }

    setSending(true);
    try {
      await saveReportOffline({
        crew_id: crewId,
        day: currentDay,
        hazard: 'dist',
        level,
        message:
          `${summary.trim()} — Acción tomada: ` +
          (actionTaken.trim() || 'protocolo autónomo inicial ejecutado a bordo.'),
        created_at: new Date().toISOString(),
      });

      setSummary('');
      setActionTaken('');
      await onReportCreated();
      await load();
      setSavedMessage('Reporte guardado en la cola de sincronización.');
    } catch {
      setFormError('No se pudo guardar el reporte. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const hasReports = serverReports.length > 0 || pendingReports.length > 0;

  return (
    <section className="earth-panel" aria-labelledby="earth-title">
      <header className="earth-header">
        <div className="earth-heading">
          <span className="earth-radio-icon" aria-hidden="true">
            <Radio size={20} />
          </span>
          <div>
            <p className="eyebrow">Canal de misión</p>
            <h2 id="earth-title">Enlace con Tierra</h2>
            <p>La latencia y el estado de cada transmisión los determina la API según el perfil de misión.</p>
          </div>
        </div>
        <span className="earth-latency-badge">Estación 0 · Luna 3 · Marte 20 min</span>
      </header>

      <form className="earth-form" onSubmit={handleSendReport}>
        <div className="earth-form-header">
          <div>
            <p className="eyebrow">Nuevo reporte</p>
            <h3>Transmitir a Houston</h3>
          </div>
          <div className="earth-level-field">
            <label htmlFor="report-level">Nivel</label>
            <select
              id="report-level"
              value={level}
              onChange={(event) => setLevel(event.target.value as HazardLevel)}
            >
              <option value="watch">Vigilar</option>
              <option value="act">Actuar</option>
              <option value="emergency">Emergencia</option>
            </select>
          </div>
        </div>

        <div className="earth-field">
          <label htmlFor="report-summary">Resumen de la situación</label>
          <textarea
            id="report-summary"
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Ej. CO₂ en 3,2 mmHg en módulo 2"
            required
          />
        </div>

        <div className="earth-field">
          <label htmlFor="report-action">Acción autónoma tomada a bordo</label>
          <textarea
            id="report-action"
            rows={2}
            value={actionTaken}
            onChange={(event) => setActionTaken(event.target.value)}
            placeholder="Ej. ventilación activada y medidas de protección repetidas"
          />
        </div>

        {formError && (
          <div className="earth-notice earth-notice-error" role="alert">
            <span className="earth-notice-dot" aria-hidden="true">!</span>
            {formError}
          </div>
        )}

        {savedMessage && (
          <div className="earth-notice earth-notice-success" role="status">
            <span className="earth-notice-dot" aria-hidden="true">✓</span>
            {savedMessage}
          </div>
        )}

        <button type="submit" className="earth-submit" disabled={sending}>
          <Send size={16} aria-hidden="true" />
          {sending ? 'Transmitiendo…' : 'Transmitir reporte'}
        </button>
      </form>

      {apiError && (
        <div className="earth-notice earth-notice-warning" role="status">
          <WifiOff size={16} aria-hidden="true" />
          {apiError}
        </div>
      )}

      <section className="earth-log" aria-labelledby="earth-log-title">
        <div className="earth-log-header">
          <div>
            <p className="eyebrow">Registro de misión</p>
            <h3 id="earth-log-title">Bitácora de transmisiones</h3>
          </div>
          <span>{serverReports.length + pendingReports.length} reporte{serverReports.length + pendingReports.length === 1 ? '' : 's'}</span>
        </div>

        {!hasReports ? (
          <div className="earth-empty" role="status">No hay reportes transmitidos aún.</div>
        ) : (
          <div className="earth-report-list">
            {serverReports.map((report) => (
              <article className="earth-report" key={report.id}>
                <div className="earth-report-header">
                  <SeverityReadout severity={report.level} />
                  <span className={`earth-status earth-status-${report.status}`}>
                    {statusLabel(report, now)}
                  </span>
                </div>

                <p className="earth-report-message">{report.message}</p>

                {report.status === 'transit' && report.level === 'act' && (
                  <div className="earth-priority-note">
                    <AlertCircle size={16} aria-hidden="true" />
                    Reporte prioritario en tránsito: mantén las medidas autónomas a bordo.
                  </div>
                )}

                {report.responseMessage && (
                  <div className="earth-response">
                    <strong>Médico de vuelo:</strong> {report.responseMessage}
                  </div>
                )}

                <footer className="earth-report-footer">
                  <span><Clock size={13} aria-hidden="true" /> Día {report.day}</span>
                  <span>Sincronizado con API</span>
                </footer>
              </article>
            ))}

            {pendingReports.map((report, index) => (
              <article className="earth-report earth-report-pending" key={report.local_id ?? `pending-${index}`}>
                <div className="earth-report-header">
                  <SeverityReadout severity={report.level} />
                  <span className="earth-status earth-status-pending">En cola local</span>
                </div>
                <p className="earth-report-message">{report.message}</p>
                <footer className="earth-report-footer">
                  <span><Clock size={13} aria-hidden="true" /> Día {report.day}</span>
                  <span>Se enviará al recuperar la conexión</span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};
