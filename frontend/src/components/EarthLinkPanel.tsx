import React, { useCallback, useEffect, useState } from 'react';
import { Radio, Clock, Send, AlertCircle, WifiOff } from 'lucide-react';
import type { EarthReport, HazardLevel } from '../types/vitalis';
import type { MissionReport } from '../types';
import { getAllLocalReports, saveReportOffline } from '../db/offlineStore';
import { fetchReports } from '../api';

interface EarthLinkPanelProps {
  crewId: string;
  currentDay: number;
  onReportCreated: () => void;
}

const LEVEL_LABEL: Record<string, string> = {
  normal: 'Normal',
  watch: 'Vigilar',
  act: 'Actuar',
  emergency: 'Emergencia',
};

function levelClasses(level: string): string {
  if (level === 'emergency') return 'bg-red-500/20 text-red-300';
  if (level === 'act') return 'bg-orange-500/20 text-orange-300';
  return 'bg-amber-500/20 text-amber-300';
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
  const [now, setNow] = useState<number>(0);

  // Formulario rápido de reporte manual
  const [summary, setSummary] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [level, setLevel] = useState<HazardLevel>('act');

  const load = useCallback(async () => {
    const local = await getAllLocalReports();
    setPendingReports(local.filter((report) => !report.synced).reverse());

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
    const interval = setInterval(() => {
      setNow(Date.now());
      void load();
    }, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    await saveReportOffline({
      crew_id: crewId,
      day: currentDay,
      hazard: 'dist',
      level,
      message:
        summary.trim() +
        ' — Acción tomada: ' +
        (actionTaken.trim() || 'protocolo autónomo inicial ejecutado a bordo.'),
      created_at: new Date().toISOString(),
    });

    setSummary('');
    setActionTaken('');
    await load();
    onReportCreated();
  };

  const hasReports = serverReports.length > 0 || pendingReports.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 max-w-2xl mx-auto space-y-5">
      {/* Cabecera con latencia según perfil */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
          <div>
            <h2 className="text-lg font-semibold">Enlace con Tierra</h2>
            <p className="text-xs text-slate-400">
              El retraso lo fija la API según el perfil de misión (Estación 0 · Luna 3 · Marte 20 min).
            </p>
          </div>
        </div>
      </div>

      {/* Crear reporte rápido */}
      <form onSubmit={handleSendReport} className="bg-slate-800/60 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-200">Nuevo reporte a Houston</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as HazardLevel)}
            aria-label="Nivel del reporte"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          >
            <option value="watch">Vigilar (Amarillo)</option>
            <option value="act">Actuar (Naranja)</option>
            <option value="emergency">Emergencia (Rojo)</option>
          </select>
        </div>

        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Resumen de la situación (ej. CO₂ en 3.2 mmHg en módulo 2)"
          aria-label="Resumen del reporte"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />
        <input
          type="text"
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          placeholder="Acción autónoma tomada a bordo..."
          aria-label="Acción tomada a bordo"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />

        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-semibold transition"
        >
          <Send className="w-4 h-4" /> Transmitir Reporte
        </button>
      </form>

      {apiError && (
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-800 p-2.5 rounded-lg">
          <WifiOff className="w-4 h-4 shrink-0" /> {apiError}
        </div>
      )}

      {/* Reportes del servidor con su estado real de tránsito */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Bitácora de Transmisiones</h3>
        {!hasReports ? (
          <p className="text-xs text-slate-500">No hay reportes transmitidos aún.</p>
        ) : (
          <>
            {serverReports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-800/80 border border-slate-700 rounded-lg p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${levelClasses(report.level)}`}
                  >
                    {LEVEL_LABEL[report.level] ?? report.level}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                      report.status === 'responded'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : report.status === 'received'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {statusLabel(report, now)}
                  </span>
                </div>

                <p className="text-sm font-medium text-white">{report.message}</p>

                {report.status === 'transit' && report.level === 'act' && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-300 bg-orange-950/50 p-2 rounded">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Reporte prioritario en tránsito: mantén las medidas autónomas a bordo.
                  </div>
                )}

                {report.responseMessage && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded text-xs text-emerald-200">
                    <strong>Médico de vuelo:</strong> {report.responseMessage}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Día {report.day}
                  </span>
                  <span>Sincronizado con API</span>
                </div>
              </div>
            ))}

            {pendingReports.map((report, index) => (
              <div
                key={report.local_id ?? `pending-${index}`}
                className="bg-slate-800/50 border border-dashed border-slate-600 rounded-lg p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${levelClasses(report.level)}`}>
                    {LEVEL_LABEL[report.level] ?? report.level}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    En cola local
                  </span>
                </div>
                <p className="text-sm font-medium text-white">{report.message}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Día {report.day}
                  </span>
                  <span>Se enviará al recuperar la conexión</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
