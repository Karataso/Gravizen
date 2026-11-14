import type { CrewMember, DashboardData, HazardStatus, IndicatorStatus, SeriesDataset } from './types';

export const demoCrew: CrewMember[] = [
  { id: 'c1', name: 'Nova', role: 'Comandante', severity: 'act', missionDay: 118 },
  { id: 'c2', name: 'Iker', role: 'Ingeniería', severity: 'act', missionDay: 118 },
  { id: 'c3', name: 'Aya', role: 'Ciencia', severity: 'normal', missionDay: 118 },
  { id: 'c4', name: 'Sol', role: 'Medicina', severity: 'act', missionDay: 118 },
];

function demoIndicators(day: number, crewId: string): IndicatorStatus[] {
  const offset = Math.max(-8, Math.min(8, day - 118));
  const isNova = crewId === 'c1';

  return [
    {
      id: 'sleep_h',
      value: isNova ? 5.1 : 7.2,
      baseline: 7,
      level: isNova ? 'act' : 'normal',
      z: isNova ? -2.4 : 0.2,
      why: isNova ? ['Sueño: 5,1 h contra 7,0 h de tu base, 4 noches seguidas.'] : [],
      action: 'Revisa la iluminación y el horario, evita cafeína después de las 14:00 y vuelve a medir.',
      escalate: isNova ? 'flight_surgeon' : null,
      daysToThreshold: isNova ? 6 : null,
    },
    {
      id: 'mood',
      value: isNova ? 2 : 4,
      baseline: 4,
      level: isNova ? 'act' : 'normal',
      z: isNova ? -1.8 : 0.1,
      why: isNova ? ['Ánimo: 2/5 contra 4/5 de tu base, 3 días seguidos.'] : [],
      action: 'Programa contacto social y habla con el psicología de vuelo.',
      escalate: isNova ? 'flight_surgeon' : null,
      daysToThreshold: isNova ? 6 : null,
    },
    {
      id: 'stress',
      value: isNova ? 4 : 2,
      baseline: 2,
      level: isNova ? 'act' : 'normal',
      z: isNova ? 1.9 : 0.1,
      why: isNova ? ['Estrés: 4/5 contra 2/5 de tu base durante 3 días.'] : [],
      action: 'Reduce y redistribuye la carga de trabajo; incluye pausas obligatorias.',
      escalate: isNova ? 'flight_surgeon' : null,
      daysToThreshold: isNova ? 6 : null,
    },
    {
      id: 'hr_rest',
      value: 78 + offset * 0.2,
      baseline: 62,
      level: isNova ? 'watch' : 'normal',
      z: isNova ? 2.1 : 0.1,
      why: isNova ? ['Pulso en reposo: 78 lpm contra 62 lpm de tu base, 4 días.'] : [],
      action: 'Confirma la medición en las mismas condiciones y revisa hidratación y sueño.',
      escalate: isNova ? 'crew' : null,
      daysToThreshold: null,
    },
    {
      id: 'co2_mmhg',
      value: 2.4,
      baseline: 1.9,
      level: 'watch',
      z: 1.2,
      why: ['CO₂: 2,4 mmHg frente a un límite operativo de 3,0 mmHg.'],
      action: 'Verifica el sensor, mejora la ventilación y repite la lectura en 30 min.',
      escalate: 'crew',
      daysToThreshold: 2,
    },
  ];
}

function demoHazards(crewId: string): HazardStatus[] {
  if (crewId === 'c3') {
    return [
      { id: 'rad', level: 'normal', anomaly: 0.08, why: ['La dosis diaria permanece cerca de la línea base de cabina.'], daysToThreshold: null, action: 'Mantén el registro del dosímetro.', urgency: 'Rutina · resumen periódico' },
      { id: 'iso', level: 'normal', anomaly: 0.05, why: ['Sueño, ánimo y estrés permanecen dentro de tu línea base.'], daysToThreshold: null, action: 'Mantén la rutina y completa el check-in diario.', urgency: 'Rutina · resumen periódico' },
      { id: 'dist', level: 'normal', anomaly: 0, why: ['La comunicación y los recursos médicos están en estado normal.'], daysToThreshold: null, action: 'Mantén el protocolo de enlace con tierra.', urgency: 'Rutina · resumen periódico' },
      { id: 'grav', level: 'normal', anomaly: 0.07, why: ['Ejercicio y pulso se mantienen cerca de tu base.'], daysToThreshold: null, action: 'Mantén el plan de ejercicio semanal.', urgency: 'Rutina · resumen periódico' },
      { id: 'env', level: 'normal', anomaly: 0.09, why: ['CO₂ y síntomas de cabina están dentro del rango esperado.'], daysToThreshold: null, action: 'Mantén el registro ambiental.', urgency: 'Rutina · resumen periódico' },
    ];
  }

  return [
    { id: 'rad', level: 'normal', anomaly: 0.18, why: ['La dosis diaria permanece cerca de la línea base de cabina.'], daysToThreshold: null, action: 'Mantén el registro del dosímetro.', urgency: 'Rutina · resumen periódico' },
    { id: 'iso', level: 'act', anomaly: 0.91, why: ['Sueño, ánimo y estrés empeoran juntos desde el día 108.'], daysToThreshold: 6, action: 'Programa contacto social, ajusta la carga y solicita apoyo del psicología de vuelo.', urgency: 'Actuar en 24 h · reporte prioritario a Tierra' },
    { id: 'dist', level: 'watch', anomaly: 0.42, why: ['El retraso de comunicación exige una acción local antes de pedir ayuda.'], daysToThreshold: null, action: 'Revisa las acciones autónomas y envía el reporte en paralelo.', urgency: 'Revisar ahora · nota en el próximo reporte' },
    { id: 'grav', level: 'normal', anomaly: 0.16, why: ['Ejercicio y pulso se mantienen cerca de tu base.'], daysToThreshold: null, action: 'Mantén el plan de ejercicio semanal.', urgency: 'Rutina · resumen periódico' },
    { id: 'env', level: 'watch', anomaly: 0.63, why: ['El CO₂ se acerca al umbral operativo de 3,0 mmHg.'], daysToThreshold: 2, action: 'Verifica el sensor, ventila la cabina y repite la lectura en 30 min.', urgency: 'Revisar ahora · nota en el próximo reporte' },
  ];
}

function demoSeries(day: number, crewId: string): SeriesDataset {
  const days = Array.from({ length: 30 }, (_, index) => day - 29 + index);
  const isNova = crewId === 'c1';

  return {
    days,
    values: {
      sleep_h: days.map((itemDay, index) => {
        if (!isNova) return Number((7.1 + Math.sin(index / 3) * 0.12).toFixed(2));
        if (index === 14 || index === 17) return null;
        if (index >= 26) return [5.1, 5, 5.2, 5.1][index - 26];
        const decline = Math.max(0, index - 17) * 0.055;
        return Number((7.1 - decline + Math.sin(index) * 0.08).toFixed(2));
      }),
    },
    baseline: {
      sleep_h: { median: 7, mad: 0.35 },
    },
  };
}

export function demoDashboard(crewId: string, day: number): DashboardData {
  return {
    crewId,
    missionDay: day,
    profile: 'mars_transit',
    indicators: demoIndicators(day, crewId),
    hazards: demoHazards(crewId),
    series: demoSeries(day, crewId),
    source: 'demo',
  };
}
