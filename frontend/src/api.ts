import { demoCrew, demoDashboard } from './demo';
import { responseProtocol, severityRank } from './domain';
import type {
  BaselineStats,
  CrewMember,
  DashboardData,
  HazardId,
  HazardStatus,
  IndicatorStatus,
  SeriesDataset,
  SeriesPoint,
  Severity,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const HAZARD_INDICATORS: Record<string, string[]> = {
  rad: ['rad_dose_msv', 'sleep_h', 'stress'],
  iso: ['mood', 'stress', 'sleep_h'],
  grav: ['exercise_min', 'hr_rest'],
  env: ['co2_mmhg', 'headache', 'sleep_h'],
  dist: [],
};

type JsonRecord = Record<string, unknown>;

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeRole(value: unknown): string {
  const role = readString(value) ?? 'Tripulación';
  const labels: Record<string, string> = {
    comandante: 'Comandante',
    piloto: 'Piloto',
    cientifico: 'Ciencia',
    ingeniero: 'Ingeniería',
    medico: 'Medicina',
    especialista: 'Especialista',
  };
  return labels[role.toLowerCase()] ?? role;
}

function knownSeverity(value: unknown): Severity | null {
  const normalized = typeof value === 'string' ? value.toLowerCase().trim() : '';
  if (normalized === 'normal' || normalized === 'ok') return 'normal';
  if (normalized === 'watch' || normalized === 'warning') return 'watch';
  if (normalized === 'act' || normalized === 'alert') return 'act';
  if (normalized === 'emergency' || normalized === 'critical') return 'emergency';
  return null;
}

function requireSeverity(value: unknown, context: string): Severity {
  const severity = knownSeverity(value);
  if (!severity) {
    throw new ApiError(`${context} devolvió un nivel de semáforo no válido.`);
  }
  return severity;
}

function errorDetail(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const detail = payload.detail;
  if (typeof detail === 'string') return detail;
  return null;
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // La API puede responder con un cuerpo vacío; el estado HTTP basta para explicar el fallo.
    }
    throw new ApiError(errorDetail(payload) ?? `La API respondió con estado ${response.status}.`, response.status);
  }

  return response.json() as Promise<unknown>;
}

function normalizeCrewMember(payload: unknown): CrewMember | null {
  if (!isRecord(payload)) return null;
  const id = readString(payload.id);
  if (!id) return null;

  const name = readString(payload.name) ?? 'Tripulante';
  return {
    id,
    name,
    role: normalizeRole(payload.role),
    severity: requireSeverity(payload.level ?? payload.severity, `El tripulante "${name}"`),
    missionDay: readNumber(payload.mission_day) ?? undefined,
  };
}

export async function fetchCrew(day: number, signal?: AbortSignal): Promise<CrewMember[]> {
  if (DEMO_MODE) return demoCrew;

  const query = new URLSearchParams({ day: String(day) });
  const payload = await getJson(`/api/crew?${query.toString()}`, signal);
  const rawMembers = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.crew)
      ? payload.crew
      : null;

  if (!rawMembers) {
    throw new ApiError('La respuesta de /api/crew no contiene una lista de tripulantes.');
  }

  const members = rawMembers.map(normalizeCrewMember).filter((member): member is CrewMember => member !== null);
  if (members.length === 0) {
    throw new ApiError('La API no devolvió tripulantes para mostrar.');
  }
  return members;
}

function deriveHazardAction(
  id: HazardId,
  level: Severity,
  indicators: IndicatorStatus[],
  explicitAction: string | null,
): string {
  if (explicitAction) return explicitAction;

  const relatedIds = HAZARD_INDICATORS[id] ?? [];
  const relatedIndicator = indicators
    .filter((indicator) => relatedIds.includes(indicator.id) && indicator.action)
    .sort((left, right) => severityRank[right.level] - severityRank[left.level])[0];

  return relatedIndicator?.action ?? responseProtocol[level].action;
}

function normalizeIndicator(payload: unknown): IndicatorStatus {
  if (!isRecord(payload)) {
    throw new ApiError('La API devolvió un indicador con un formato no válido.');
  }
  const id = readString(payload.id);
  if (!id) {
    throw new ApiError('La API devolvió un indicador sin identificador.');
  }

  const level = requireSeverity(payload.level ?? payload.severity, `El indicador "${id}"`);
  return {
    id,
    value: readNumber(payload.value),
    baseline: readNumber(payload.baseline),
    level,
    z: readNumber(payload.z),
    why: readStringArray(payload.why),
    action: readString(payload.action) ?? responseProtocol[level].action,
    escalate: readString(payload.escalate),
    daysToThreshold: readNumber(payload.days_to_threshold),
  };
}

function normalizeHazard(payload: unknown, indicators: IndicatorStatus[]): HazardStatus {
  if (!isRecord(payload)) {
    throw new ApiError('La API devolvió un peligro con un formato no válido.');
  }
  const id = readString(payload.id);
  if (!id) {
    throw new ApiError('La API devolvió un peligro sin identificador.');
  }

  const level = requireSeverity(payload.level ?? payload.severity, `El peligro "${id}"`);
  return {
    id,
    level,
    anomaly: readNumber(payload.anomaly),
    why: readStringArray(payload.why),
    daysToThreshold: readNumber(payload.days_to_threshold),
    action: deriveHazardAction(id, level, indicators, readString(payload.action)),
    urgency: readString(payload.urgency) ?? responseProtocol[level].urgency,
  };
}

export async function fetchStatus(crewId: string, day: number, signal?: AbortSignal) {
  if (DEMO_MODE) {
    const demo = demoDashboard(crewId, day);
    return {
      indicators: demo.indicators,
      hazards: demo.hazards,
      profile: demo.profile,
      missionDay: demo.missionDay,
    };
  }

  const query = new URLSearchParams({ day: String(day) });
  const payload = await getJson(`/api/crew/${encodeURIComponent(crewId)}/status?${query.toString()}`, signal);
  if (!isRecord(payload)) {
    throw new ApiError('La respuesta del estado de misión no es válida.');
  }

  const indicators = Array.isArray(payload.indicators)
    ? payload.indicators.map(normalizeIndicator)
    : [];
  const hazards = Array.isArray(payload.hazards)
    ? payload.hazards.map((hazard) => normalizeHazard(hazard, indicators))
    : [];

  if (indicators.length === 0 && hazards.length === 0) {
    throw new ApiError(`La API no devolvió alertas ni indicadores para el día ${day}.`);
  }

  return {
    indicators,
    hazards,
    profile: readString(payload.profile),
    missionDay: readNumber(payload.day) ?? day,
  };
}

function normalizeSeries(payload: unknown): SeriesDataset {
  if (!isRecord(payload)) {
    throw new ApiError('La respuesta de la serie de indicadores no es válida.');
  }

  const rawSeries = isRecord(payload.series) ? payload.series : {};
  const rawBaseline = isRecord(payload.baseline) ? payload.baseline : {};
  const values: Record<string, Array<number | null>> = {};
  const baseline: Record<string, BaselineStats> = {};

  for (const [id, rawValues] of Object.entries(rawSeries)) {
    values[id] = Array.isArray(rawValues) ? rawValues.map(readNumber) : [];
  }

  for (const [id, rawStats] of Object.entries(rawBaseline)) {
    if (!isRecord(rawStats)) continue;
    const median = readNumber(rawStats.median);
    const mad = readNumber(rawStats.mad);
    if (median !== null) baseline[id] = { median, mad: mad ?? 0 };
  }

  const inferredDays = Math.max(0, ...Object.values(values).map((series) => series.length));
  const days = Array.isArray(payload.days)
    ? payload.days.map((rawDay, index) => {
      const day = readNumber(rawDay);
      if (day === null) {
        throw new ApiError(`La API devolvió un día de serie no válido en la posición ${index}.`);
      }
      return day;
    })
    : Array.from({ length: inferredDays }, (_, index) => index);

  return { days, values, baseline };
}

export async function fetchSeries(crewId: string, day: number, signal?: AbortSignal): Promise<SeriesDataset> {
  if (DEMO_MODE) return demoDashboard(crewId, day).series;

  const query = new URLSearchParams({ end_day: String(day), days: '30' });
  const payload = await getJson(`/api/crew/${encodeURIComponent(crewId)}/series?${query.toString()}`, signal);
  return normalizeSeries(payload);
}

export async function loadDashboard(crewId: string, day: number, signal?: AbortSignal): Promise<DashboardData> {
  if (DEMO_MODE) return demoDashboard(crewId, day);

  const [status, series] = await Promise.all([
    fetchStatus(crewId, day, signal),
    fetchSeries(crewId, day, signal),
  ]);

  return {
    crewId,
    missionDay: status.missionDay,
    profile: status.profile,
    indicators: status.indicators,
    hazards: status.hazards,
    series,
    source: 'api',
  };
}

export function getSeriesPoints(dataset: SeriesDataset, indicatorId: string): SeriesPoint[] {
  const values = dataset.values[indicatorId] ?? [];
  const baseline = dataset.baseline[indicatorId];

  return dataset.days.map((day, index) => {
    const value = values[index] ?? null;
    const median = baseline?.median ?? null;
    const mad = baseline?.mad ?? null;

    return {
      day,
      value,
      baseline: median,
      baselineLow: median !== null && mad !== null ? median - mad : null,
      baselineHigh: median !== null && mad !== null ? median + mad : null,
    };
  });
}
