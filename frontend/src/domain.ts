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

export const hazardResponseActions: Record<string, Record<Severity, string>> = {
  rad: {
    normal: 'Mantén el registro del dosímetro y sigue la pauta de protección de la misión.',
    watch: 'Confirma la lectura con un segundo sensor, registra la dosis y revisa sueño, estrés y síntomas.',
    act: 'Ve al refugio o a la zona más blindada, suspende actividades fuera de la nave y registra la dosis.',
    emergency: 'Ponte en refugio de inmediato, suspende toda salida y avisa al control de la misión.',
  },
  iso: {
    normal: 'Mantén el contacto social, la rutina de sueño y el check-in diario.',
    watch: 'Ajusta la carga de trabajo, la luz y el ejercicio; programa contacto social y vuelve a medir en 24–48 h.',
    act: 'Programa contacto social, reduce la carga y solicita apoyo del psicología de vuelo y del médico.',
    emergency: 'Pide apoyo médico y psicológico inmediato, reduce la carga y no te quedes a solas.',
  },
  dist: {
    normal: 'Mantén el protocolo de enlace con tierra y la bitácora de reportes.',
    watch: 'Prioriza la acción local, registra el estado y envía el reporte en paralelo.',
    act: 'Reduce la carga, ejecuta la acción local disponible y solicita consulta médica.',
    emergency: 'Activa la atención médica a bordo y envía un reporte urgente sin esperar la próxima ventana.',
  },
  grav: {
    normal: 'Mantén el plan semanal de ejercicio y registra tipo, minutos y cumplimiento.',
    watch: 'Replanifica las sesiones, revisa el equipo y el dolor, y recupera la carga con ritmo progresivo.',
    act: 'Replanifica el entrenamiento, revisa dolor o lesión y solicita una evaluación médica.',
    emergency: 'Suspende el esfuerzo, atiende dolor o lesión y pide atención médica inmediata.',
  },
  env: {
    normal: 'Mantén el registro ambiental y la ventilación de la cabina.',
    watch: 'Verifica el sensor, mejora la ventilación y repite la lectura de CO₂ en 30 min.',
    act: 'Ventila la cabina, revisa el depurador, reduce la actividad intensa y avisa al control.',
    emergency: 'Muévete a un módulo con mejor aire, verifica el sensor y solicita atención médica inmediata.',
  },
};

export function getHazardAction(id: HazardId, level: Severity): string {
  return hazardResponseActions[id]?.[level] ?? responseProtocol[level].action;
}

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
