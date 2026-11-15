// shortcut: copia del mock del backend, conservada como plan B visual.
// Si cambian los escenarios en backend/app/services/data_loader.py, cámbialos también aquí.
import { getHazardAction, responseProtocol } from './domain';
import type {
  CrewMember,
  DashboardData,
  HazardId,
  HazardStatus,
  IndicatorStatus,
  SeriesDataset,
  Severity,
} from './types';

const MAX_MISSION_DAY = 120;

type DemoScenario = 'isolation' | 'deconditioning' | 'healthy' | 'co2';

interface DemoProfile {
  id: string;
  name: string;
  role: string;
  scenario: DemoScenario;
  sleepBase: number;
  moodBase: number;
  stressBase: number;
  pulseBase: number;
  exerciseBase: number;
  co2Base: number;
}

const crewProfiles: DemoProfile[] = [
  {
    id: 'c1', name: 'Nova', role: 'Comandante', scenario: 'isolation',
    sleepBase: 7, moodBase: 4, stressBase: 2, pulseBase: 62, exerciseBase: 90, co2Base: 1.9,
  },
  {
    id: 'c2', name: 'Iker', role: 'Piloto', scenario: 'deconditioning',
    sleepBase: 6.5, moodBase: 3, stressBase: 2, pulseBase: 58, exerciseBase: 100, co2Base: 1.9,
  },
  {
    id: 'c3', name: 'Aya', role: 'Ciencia', scenario: 'healthy',
    sleepBase: 7.2, moodBase: 4, stressBase: 1, pulseBase: 65, exerciseBase: 95, co2Base: 2.2,
  },
  {
    id: 'c4', name: 'Sol', role: 'Ingeniería', scenario: 'co2',
    sleepBase: 6.8, moodBase: 3, stressBase: 2, pulseBase: 60, exerciseBase: 85, co2Base: 2.5,
  },
];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function missionDay(day: number): number {
  return clamp(Math.round(day), 0, MAX_MISSION_DAY);
}

function profileFor(crewId: string): DemoProfile {
  return crewProfiles.find((profile) => profile.id === crewId) ?? crewProfiles[2];
}

function crewLevel(day: number, profile: DemoProfile): Severity {
  if (profile.scenario === 'isolation') {
    if (day >= 118) return 'act';
    if (day >= 96) return 'watch';
  }

  if (profile.scenario === 'deconditioning') {
    if (day >= 120) return 'act';
    if (day >= 90) return 'watch';
  }

  if (profile.scenario === 'co2') {
    if (day >= 118) return 'act';
    if (day >= 80) return 'watch';
  }

  return 'normal';
}

function scenarioProgress(day: number, scenario: DemoScenario): number {
  if (scenario === 'isolation') return clamp((day - 96) / 22, 0, 1);
  if (scenario === 'deconditioning') return clamp((day - 60) / 45, 0, 1);
  if (scenario === 'co2') return clamp((day - 80) / 10, 0, 1);
  return 0;
}

function scenarioProjection(day: number, scenario: DemoScenario, level: Severity): number | null {
  if (level === 'normal') return null;
  if (scenario === 'isolation') {
    return level === 'act' ? 6 : Math.max(1, 124 - day);
  }
  if (scenario === 'deconditioning') {
    return level === 'act' ? 0 : Math.max(1, 130 - day);
  }
  if (scenario === 'co2') {
    return level === 'act' ? 3 : Math.max(1, MAX_MISSION_DAY - day);
  }
  return null;
}

function escalationFor(level: Severity): 'crew' | 'flight_surgeon' | null {
  if (level === 'act') return 'flight_surgeon';
  if (level === 'watch') return 'crew';
  return null;
}

function zFor(level: Severity, direction: 'positive' | 'negative'): number {
  if (level === 'normal') return 0.1;
  if (level === 'watch') return direction === 'negative' ? -1.2 : 1.2;
  return direction === 'negative' ? -2.4 : 2.1;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function sleepValue(profile: DemoProfile, day: number): number {
  const progress = scenarioProgress(day, profile.scenario);
  if (profile.scenario === 'isolation') return round(profile.sleepBase - progress * 2);
  if (profile.scenario === 'co2') return round(profile.sleepBase - progress);
  return profile.sleepBase;
}

function moodValue(profile: DemoProfile, day: number): number {
  const progress = scenarioProgress(day, profile.scenario);
  return profile.scenario === 'isolation'
    ? round(profile.moodBase - progress * 2)
    : profile.moodBase;
}

function stressValue(profile: DemoProfile, day: number): number {
  const progress = scenarioProgress(day, profile.scenario);
  return profile.scenario === 'isolation'
    ? round(profile.stressBase + progress * 2)
    : profile.stressBase;
}

function pulseValue(profile: DemoProfile, day: number): number {
  const progress = scenarioProgress(day, profile.scenario);
  return profile.scenario === 'deconditioning'
    ? round(profile.pulseBase + progress * 20)
    : profile.pulseBase;
}

function exerciseValue(profile: DemoProfile, day: number): number {
  const progress = scenarioProgress(day, profile.scenario);
  return profile.scenario === 'deconditioning'
    ? round(profile.exerciseBase * (1 - progress * 0.7))
    : profile.exerciseBase;
}

function co2Value(profile: DemoProfile, day: number): number {
  const progress = scenarioProgress(day, profile.scenario);
  return profile.scenario === 'co2'
    ? round(profile.co2Base + progress * 0.7)
    : profile.co2Base;
}

export function demoCrew(day: number): CrewMember[] {
  const currentDay = missionDay(day);

  return crewProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    role: profile.role,
    severity: crewLevel(currentDay, profile),
    missionDay: currentDay,
  }));
}

function demoIndicators(day: number, crewId: string): IndicatorStatus[] {
  const currentDay = missionDay(day);
  const profile = profileFor(crewId);
  const overallLevel = crewLevel(currentDay, profile);
  const isolationLevel = profile.scenario === 'isolation' ? overallLevel : 'normal';
  const deconditioningLevel = profile.scenario === 'deconditioning' ? overallLevel : 'normal';
  const co2Level = profile.scenario === 'co2' ? overallLevel : 'normal';
  const sleepLevel: Severity = profile.scenario === 'co2'
    ? (currentDay >= 80 ? 'watch' : 'normal')
    : isolationLevel;

  const sleep = sleepValue(profile, currentDay);
  const mood = moodValue(profile, currentDay);
  const stress = stressValue(profile, currentDay);
  const pulse = pulseValue(profile, currentDay);
  const exercise = exerciseValue(profile, currentDay);
  const co2 = co2Value(profile, currentDay);

  return [
    {
      id: 'sleep_h',
      value: sleep,
      baseline: profile.sleepBase,
      level: sleepLevel,
      z: zFor(sleepLevel, 'negative'),
      why: sleepLevel === 'normal' ? [] : [
        `Sueño: ${sleep.toLocaleString('es-ES')} h frente a ${profile.sleepBase.toLocaleString('es-ES')} h de tu base durante 3 días.`,
      ],
      action: 'Revisa la iluminación y el horario, evita cafeína después de las 14:00 y vuelve a medir.',
      escalate: escalationFor(sleepLevel),
      daysToThreshold: scenarioProjection(currentDay, profile.scenario, sleepLevel),
    },
    {
      id: 'mood',
      value: mood,
      baseline: profile.moodBase,
      level: isolationLevel,
      z: zFor(isolationLevel, 'negative'),
      why: isolationLevel === 'normal' ? [] : [
        `Ánimo: ${mood.toLocaleString('es-ES')}/5 frente a ${profile.moodBase}/5 de tu base durante 3 días.`,
      ],
      action: 'Programa contacto social y habla con el psicología de vuelo.',
      escalate: escalationFor(isolationLevel),
      daysToThreshold: scenarioProjection(currentDay, profile.scenario, isolationLevel),
    },
    {
      id: 'stress',
      value: stress,
      baseline: profile.stressBase,
      level: isolationLevel,
      z: zFor(isolationLevel, 'positive'),
      why: isolationLevel === 'normal' ? [] : [
        `Estrés: ${stress.toLocaleString('es-ES')}/5 frente a ${profile.stressBase}/5 de tu base durante 3 días.`,
      ],
      action: 'Reduce y redistribuye la carga de trabajo; incluye pausas obligatorias.',
      escalate: escalationFor(isolationLevel),
      daysToThreshold: scenarioProjection(currentDay, profile.scenario, isolationLevel),
    },
    {
      id: 'hr_rest',
      value: pulse,
      baseline: profile.pulseBase,
      level: deconditioningLevel,
      z: zFor(deconditioningLevel, 'positive'),
      why: deconditioningLevel === 'normal' ? [] : [
        `Pulso en reposo: ${pulse.toLocaleString('es-ES')} lpm frente a ${profile.pulseBase} lpm de tu base.`,
      ],
      action: 'Confirma la medición en las mismas condiciones y revisa hidratación y sueño.',
      escalate: escalationFor(deconditioningLevel),
      daysToThreshold: scenarioProjection(currentDay, profile.scenario, deconditioningLevel),
    },
    {
      id: 'co2_mmhg',
      value: co2,
      baseline: profile.co2Base,
      level: co2Level,
      z: zFor(co2Level, 'positive'),
      why: co2Level === 'normal' ? [] : [
        `CO₂: ${co2.toLocaleString('es-ES')} mmHg frente al límite operativo de 3,0 mmHg.`,
      ],
      action: 'Verifica el sensor, mejora la ventilación y repite la lectura en 30 min.',
      escalate: escalationFor(co2Level),
      daysToThreshold: scenarioProjection(currentDay, profile.scenario, co2Level),
    },
    {
      id: 'exercise_min',
      value: exercise,
      baseline: profile.exerciseBase,
      level: deconditioningLevel,
      z: zFor(deconditioningLevel, 'negative'),
      why: deconditioningLevel === 'normal' ? [] : [
        `Ejercicio: ${exercise.toLocaleString('es-ES')} min frente a ${profile.exerciseBase} min de tu plan.`,
      ],
      action: 'Replanifica las sesiones, revisa el equipo y el dolor, y recupera la carga con ritmo progresivo.',
      escalate: escalationFor(deconditioningLevel),
      daysToThreshold: scenarioProjection(currentDay, profile.scenario, deconditioningLevel),
    },
    {
      id: 'rad_dose_msv',
      value: 0.48,
      baseline: 0.5,
      level: 'normal',
      z: 0.1,
      why: [],
      action: 'Mantén el registro del dosímetro y sigue la pauta de protección de la misión.',
      escalate: null,
      daysToThreshold: null,
    },
  ];
}

function demoHazard(
  id: HazardId,
  level: Severity,
  anomaly: number,
  why: string[],
  daysToThreshold: number | null,
): HazardStatus {
  return {
    id,
    level,
    anomaly,
    why,
    daysToThreshold,
    action: getHazardAction(id, level),
    urgency: responseProtocol[level].urgency,
  };
}

function demoHazards(day: number, crewId: string): HazardStatus[] {
  const currentDay = missionDay(day);
  const profile = profileFor(crewId);
  const overallLevel = crewLevel(currentDay, profile);
  const isolationLevel: Severity = profile.scenario === 'isolation' ? overallLevel : 'normal';
  const deconditioningLevel: Severity = profile.scenario === 'deconditioning' ? overallLevel : 'normal';
  const co2Level: Severity = profile.scenario === 'co2' ? overallLevel : 'normal';
  const distanceLevel: Severity = profile.scenario !== 'healthy' && currentDay >= 90 ? 'watch' : 'normal';

  return [
    demoHazard(
      'rad',
      'normal',
      0.08,
      ['La dosis diaria permanece cerca de la línea base de cabina.'],
      null,
    ),
    demoHazard(
      'iso',
      isolationLevel,
      isolationLevel === 'act' ? 0.91 : isolationLevel === 'watch' ? 0.42 : 0.05,
      isolationLevel === 'normal'
        ? ['Sueño, ánimo y estrés permanecen dentro de tu línea base.']
        : ['Sueño, ánimo y estrés empeoran de forma sostenida y convergen.'],
      scenarioProjection(currentDay, profile.scenario, isolationLevel),
    ),
    demoHazard(
      'dist',
      distanceLevel,
      distanceLevel === 'watch' ? 0.42 : 0,
      distanceLevel === 'watch'
        ? ['El retraso de comunicación exige una acción local antes de pedir ayuda.']
        : ['La comunicación y los recursos médicos están en estado normal.'],
      null,
    ),
    demoHazard(
      'grav',
      deconditioningLevel,
      deconditioningLevel === 'act' ? 0.78 : deconditioningLevel === 'watch' ? 0.42 : 0.07,
      deconditioningLevel === 'normal'
        ? ['Ejercicio y pulso se mantienen cerca de tu base.']
        : ['El ejercicio baja y el pulso en reposo aumenta de forma sostenida.'],
      scenarioProjection(currentDay, profile.scenario, deconditioningLevel),
    ),
    demoHazard(
      'env',
      co2Level,
      co2Level === 'act' ? 0.85 : co2Level === 'watch' ? 0.63 : 0.09,
      co2Level === 'normal'
        ? ['CO₂ y síntomas de cabina están dentro del rango esperado.']
        : ['El CO₂ se acerca o supera el umbral operativo de 3,0 mmHg.'],
      scenarioProjection(currentDay, profile.scenario, co2Level),
    ),
  ];
}

function demoSeries(day: number, crewId: string): SeriesDataset {
  const currentDay = missionDay(day);
  const startDay = Math.max(0, currentDay - 29);
  const days = Array.from(
    { length: currentDay - startDay + 1 },
    (_, index) => startDay + index,
  );
  const profile = profileFor(crewId);

  return {
    days,
    values: {
      sleep_h: days.map((itemDay) => {
        if (profile.scenario === 'isolation' && (itemDay === 103 || itemDay === 109)) return null;
        if (profile.scenario === 'co2' && itemDay === 105) return null;
        return sleepValue(profile, itemDay);
      }),
      mood: days.map((itemDay) => moodValue(profile, itemDay)),
      stress: days.map((itemDay) => stressValue(profile, itemDay)),
      hr_rest: days.map((itemDay) => pulseValue(profile, itemDay)),
      co2_mmhg: days.map((itemDay) => co2Value(profile, itemDay)),
      exercise_min: days.map((itemDay) => {
        if (profile.scenario === 'deconditioning' && itemDay === 100) return null;
        return exerciseValue(profile, itemDay);
      }),
      rad_dose_msv: days.map(() => 0.48),
    },
    baseline: {
      sleep_h: { median: profile.sleepBase, mad: 0.35 },
      mood: { median: profile.moodBase, mad: 0.4 },
      stress: { median: profile.stressBase, mad: 0.4 },
      hr_rest: { median: profile.pulseBase, mad: 3.5 },
      co2_mmhg: { median: profile.co2Base, mad: 0.2 },
      exercise_min: { median: profile.exerciseBase, mad: 4 },
      rad_dose_msv: { median: 0.5, mad: 0.05 },
    },
  };
}

export function demoDashboard(crewId: string, day: number): DashboardData {
  const currentDay = missionDay(day);

  return {
    crewId,
    missionDay: currentDay,
    profile: 'mars_transit',
    indicators: demoIndicators(currentDay, crewId),
    hazards: demoHazards(currentDay, crewId),
    series: demoSeries(currentDay, crewId),
    source: 'demo',
  };
}
