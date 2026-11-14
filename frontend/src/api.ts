import type { DashboardData, HazardStatus, SeriesPoint } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const demoHazards: HazardStatus[] = [
  { id: 'sleep', label: 'Sueño', value: '6 h 18 m', unit: 'promedio', severity: 'watch', explanation: 'La duración lleva tres días por debajo de tu línea base.', action: 'Planificar una ventana de descanso sin tareas.', urgency: 'Vigilar hoy', daysToThreshold: 6 },
  { id: 'cardio', label: 'Cardiovascular', value: '78', unit: 'lpm en reposo', severity: 'normal', explanation: 'Pulso y recuperación dentro de la línea base personal.', action: 'Continuar con la rutina programada.', urgency: 'Normal', daysToThreshold: null },
  { id: 'mood', label: 'Ánimo y estrés', value: '42', unit: 'índice de estrés', severity: 'act', explanation: 'El estrés sube de forma sostenida y podría cruzar el umbral.', action: 'Hacer check-in con psicología y reducir carga operativa.', urgency: 'Actuar en 24 h', daysToThreshold: 6 },
  { id: 'radiation', label: 'Radiación', value: '1.8', unit: 'mSv / día', severity: 'normal', explanation: 'Dosis diaria dentro del rango esperado de la misión.', action: 'Mantener el registro del dosímetro.', urgency: 'Normal', daysToThreshold: null },
  { id: 'co2', label: 'CO₂ de cabina', value: '2.4', unit: 'mmHg', severity: 'watch', explanation: 'Concentración cercana al umbral operativo de 3 mmHg.', action: 'Revisar ventilación y repetir lectura en 30 min.', urgency: 'Vigilar ahora', daysToThreshold: 2 },
];

const demoSeries: SeriesPoint[] = Array.from({ length: 14 }, (_, index) => ({
  day: 105 + index,
  value: 6.9 - index * 0.045 + Math.sin(index) * 0.08,
  baseline: 7.1,
}));

const demoCrew = [
  { id: 'c1', name: 'Nova', role: 'Comandante', severity: 'watch' as const },
  { id: 'c2', name: 'Iker', role: 'Ingeniería', severity: 'act' as const },
  { id: 'c3', name: 'Aya', role: 'Ciencia', severity: 'normal' as const },
  { id: 'c4', name: 'Sol', role: 'Medicina', severity: 'watch' as const },
];

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}

export async function loadDashboard(crewId: string, day: number): Promise<DashboardData> {
  try {
    const [status, series] = await Promise.all([
      getJson<{ hazards: HazardStatus[] }>(`/api/crew/${crewId}/status?day=${day}`),
      getJson<{ points: SeriesPoint[] }>(`/api/crew/${crewId}/series?end_day=${day}&days=14`),
    ]);
    return { crewId, crewName: 'Tripulación Vitalis', missionDay: day, hazards: status.hazards, crew: demoCrew, series: series.points, source: 'api' };
  } catch {
    return { crewId, crewName: 'Tripulación Vitalis', missionDay: day, hazards: demoHazards, crew: demoCrew, series: demoSeries, source: 'demo' };
  }
}
