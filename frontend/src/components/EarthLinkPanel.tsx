import React, { useState, useEffect } from 'react';
import { Radio, Clock, FastForward, Send, AlertCircle } from 'lucide-react';
import type { EarthReport, HazardLevel, ReportStatus } from '../types/vitalis';
import { getAllLocalReports, saveReportOffline } from '../db/offlineStore';

interface EarthLinkPanelProps {
  crewId: string;
  currentDay: number;
  onReportCreated: () => void;
}

const DELAY_SECONDS = 20 * 60; // 20 minutos unidireccionales (1200 segundos)

export const EarthLinkPanel: React.FC<EarthLinkPanelProps> = ({
  crewId,
  currentDay,
  onReportCreated,
}) => {
  const [reports, setReports] = useState<EarthReport[]>([]);
  const [fastForward, setFastForward] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [simOffsetSec, setSimOffsetSec] = useState<number>(0);

  // Formulario rápido de reporte manual
  const [summary, setSummary] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [level, setLevel] = useState<HazardLevel>('act');

  const loadReports = async () => {
    const local = await getAllLocalReports();
    setReports(local.reverse());
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Reloj de simulación (normal 1x o acelerado x60)
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
      if (fastForward) {
        setSimOffsetSec((prev) => prev + 60); // Avanza 60s por cada segundo real
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fastForward]);

  const computeStatus = (createdAt: string): { status: ReportStatus; elapsedSec: number } => {
    const realElapsed = Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 1000));
    const totalElapsed = realElapsed + simOffsetSec;

    if (totalElapsed >= DELAY_SECONDS * 2) {
      return { status: 'responded', elapsedSec: totalElapsed };
    }
    if (totalElapsed >= DELAY_SECONDS) {
      return { status: 'received', elapsedSec: totalElapsed };
    }
    return { status: 'transit', elapsedSec: totalElapsed };
  };

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
    await loadReports();
    onReportCreated();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 max-w-2xl mx-auto space-y-5">
      {/* Cabecera con control de latencia Marte */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
          <div>
            <h2 className="text-lg font-semibold">Enlace con Tierra (Marte)</h2>
            <p className="text-xs text-slate-400">Latencia unidireccional: 20 min · Ida y vuelta: 40 min</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFastForward((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            fastForward
              ? 'bg-purple-600 border-purple-400 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          <FastForward className="w-4 h-4" />
          {fastForward ? 'Modo Demo ×60 ACTIVO' : 'Activar Demo ×60'}
        </button>
      </div>

      {/* Crear reporte rápido */}
      <form onSubmit={handleSendReport} className="bg-slate-800/60 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-200">Nuevo reporte a Houston</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as HazardLevel)}
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
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />
        <input
          type="text"
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          placeholder="Acción autónoma tomada a bordo..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />

        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-semibold transition"
        >
          <Send className="w-4 h-4" /> Transmitir Reporte
        </button>
      </form>

      {/* Lista de reportes con cálculo de tránsito */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Bitácora de Transmisiones</h3>
        {reports.length === 0 ? (
          <p className="text-xs text-slate-500">No hay reportes transmitidos aún.</p>
        ) : (
          reports.map((rep, idx) => {
            const { status, elapsedSec } = computeStatus(rep.created_at);
            const remainingToReceive = Math.max(0, DELAY_SECONDS - elapsedSec);
            const overdueAct = rep.level === 'act' && status === 'transit' && elapsedSec > 600;

            return (
              <div
                key={rep.local_id ?? idx}
                className="bg-slate-800/80 border border-slate-700 rounded-lg p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                      rep.level === 'emergency'
                        ? 'bg-red-500/20 text-red-300'
                        : rep.level === 'act'
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {rep.level}
                  </span>

                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                      status === 'responded'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : status === 'received'
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {status === 'transit' &&
                      `En tránsito (${Math.ceil(remainingToReceive / 60)} min restantes)`}
                    {status === 'received' && 'Recibido en Tierra · Esperando médico'}
                    {status === 'responded' && 'Respondido por Control de Misión'}
                  </span>
                </div>

                <p className="text-sm font-medium text-white">{rep.message}</p>

                {overdueAct && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-300 bg-orange-950/50 p-2 rounded">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Reporte prioritario sigue en tránsito: mantén medidas autónomas a bordo.
                  </div>
                )}

                {status === 'responded' && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded text-xs text-emerald-200">
                    <strong>Médico de vuelo (Houston):</strong> Protocolo a bordo validado. Mantener
                    monitoreo cada 6 horas y reportar evolución.
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Día {rep.day}
                  </span>
                  <span>{rep.synced ? 'Sincronizado con API' : 'En cola local (Offline)'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};