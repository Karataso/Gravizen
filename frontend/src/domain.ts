import type { HazardId, Severity } from './types';

export const severityRank: Record<Severity, number> = {
  normal: 0,
  watch: 1,
  act: 2,
  emergency: 3,
};

export const severityLabel: Record<Severity, string> = {
  normal: 'Normal',
  watch: 'Vigilar',
  act: 'Actuar',
  emergency: 'Emergencia',
};

export const responseProtocol: Record<Severity, { action: string; urgency: string }> = {
  normal: {
    action: 'Mantén la rutina y completa el check-in diario.',
    urgency: 'Rutina · resumen periódico',
  },
  watch: {
    action: 'Revisa la causa probable, aplica el ajuste sugerido y vuelve a medir en 24–48 h.',
    urgency: 'Revisar ahora · nota en el próximo reporte',
  },
  act: {
    action: 'Ejecuta la acción recomendada, reduce la carga de trabajo y registra lo realizado.',
    urgency: 'Actuar en 24 h · reporte prioritario a Tierra',
  },
  emergency: {
    action: 'Activa la acción de seguridad a bordo y avisa al control de la misión de inmediato.',
    urgency: 'Acción inmediata · reporte urgente a Tierra',
  },
};

export interface HazardMeta {
  label: string;
  shortLabel: string;
  description: string;
}

export const hazardMeta: Record<string, HazardMeta> = {
  rad: {
    label: 'Radiación espacial',
    shortLabel: 'Radiación',
    description: 'Exposición a radiación y su efecto sobre sueño y estrés.',
  },
  iso: {
    label: 'Aislamiento y confinamiento',
    shortLabel: 'Aislamiento',
    description: 'Cambios sostenidos en ánimo, estrés, sueño y contacto social.',
  },
  dist: {
    label: 'Distancia de la Tierra',
    shortLabel: 'Distancia',
    description: 'Contexto de ayuda remota y retraso de comunicación.',
  },
  grav: {
    label: 'Gravedad alterada',
    shortLabel: 'Gravedad',
    description: 'Pérdida de condición física, hueso y músculo.',
  },
  env: {
    label: 'Ambientes hostiles y cerrados',
    shortLabel: 'Ambiente cerrado',
    description: 'CO₂, calidad del aire y síntomas asociados.',
  },
};

export function getHazardMeta(id: HazardId): HazardMeta {
  return (
    hazardMeta[id] ?? {
      label: id,
      shortLabel: id,
      description: 'Peligro espacial monitorizado por Vitalis.',
    }
  );
}

export interface IndicatorMeta {
  label: string;
  unit: string;
  howMeasured: string;
}

export const indicatorMeta: Record<string, IndicatorMeta> = {
  sleep_h: {
    label: 'Sueño',
    unit: 'h',
    howMeasured: 'Horas dormidas y calidad mediante check-in o dispositivo de muñeca.',
  },
  hr_rest: {
    label: 'Pulso en reposo',
    unit: 'lpm',
    howMeasured: 'Medición matutina antes de moverse, en condiciones similares cada día.',
  },
  bp_sys: {
    label: 'Presión sistólica',
    unit: 'mmHg',
    howMeasured: 'Tensiómetro de a bordo, dos o tres veces por semana.',
  },
  bp_dia: {
    label: 'Presión diastólica',
    unit: 'mmHg',
    howMeasured: 'Tensiómetro de a bordo, dos o tres veces por semana.',
  },
  temp_c: {
    label: 'Temperatura',
    unit: '°C',
    howMeasured: 'Termómetro timpánico o axilar y comparación con la lectura personal.',
  },
  glucose_mgdl: {
    label: 'Glucosa',
    unit: 'mg/dL',
    howMeasured: 'Glucómetro de a bordo, idealmente en ayunas.',
  },
  mood: {
    label: 'Ánimo',
    unit: '/5',
    howMeasured: 'Escala diaria de 1 a 5 y pregunta abierta opcional.',
  },
  stress: {
    label: 'Estrés',
    unit: '/5',
    howMeasured: 'Escala diaria de 1 a 5 junto con el contexto de la carga de trabajo.',
  },
  exercise_min: {
    label: 'Ejercicio',
    unit: 'min/día',
    howMeasured: 'Minutos y tipo de sesión registrados contra el plan semanal.',
  },
  rad_dose_msv: {
    label: 'Radiación',
    unit: 'mSv/día',
    howMeasured: 'Dosímetro personal y de cabina, con confirmación de lecturas anomalas.',
  },
  co2_mmhg: {
    label: 'CO₂ de cabina',
    unit: 'mmHg',
    howMeasured: 'Sensores atmosféricos en varios puntos de la cabina.',
  },
};

export function getIndicatorMeta(id: string): IndicatorMeta {
  return (
    indicatorMeta[id] ?? {
      label: id,
      unit: '',
      howMeasured: 'Registro mediante sensor o check-in diario.',
    }
  );
}

export function formatNumber(value: number | null, maximumFractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return 'Sin dato';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits }).format(value);
}
