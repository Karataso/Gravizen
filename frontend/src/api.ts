import { demoCrew, demoDashboard } from './demo';
import { getHazardAction, responseProtocol } from './domain';
import type {
  BaselineStats,
  CrewMember,
  DashboardData,
  HazardStatus,
  IndicatorStatus,
  MissionProfile,
  MissionReport,
  SeriesDataset,
  SeriesPoint,
  Severity,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

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

function readNullableNumber(value: unknown, context: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new ApiError(`${context} devolvió un valor numérico no válido.`);
}

function requireStringArray(value: unknown, context: string): string[] {
  if (!Array.isArray(value)) {
    throw new ApiError(`${context} devolvió una lista de explicaciones con un formato no válido.`);
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new ApiError(`${context} devolvió una explicación no textual en la posición ${index}.`);
    }
    return item.trim();
  }).filter((item) => item.length > 0);
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

function normalizeCrewMember(payload: unknown, index: number): CrewMember {
  if (!isRecord(payload)) {
    throw new ApiError(`La API devolvió un tripulante inválido en la posición ${index}.`);
  }
  const id = readString(payload.id);
  if (!id) {
    throw new ApiError(`La API devolvió un tripulante sin identificador en la posición ${index}.`);
  }

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
  if (DEMO_MODE) return demoCrew(day);

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

  const members = rawMembers.map(normalizeCrewMember);
  if (members.length === 0) {
    throw new ApiError('La API no devolvió tripulantes para mostrar.');
  }

  const memberIds = new Set<string>();
  for (const member of members) {
    if (memberIds.has(member.id)) {
      throw new ApiError(`La API devolvió el identificador de tripulante duplicado "${member.id}".`);
    }
    memberIds.add(member.id);
  }
  return members;
}

function normalizeIndicator(payload: unknown, index: number): IndicatorStatus {
  if (!isRecord(payload)) {
    throw new ApiError(`La API devolvió un indicador con un formato no válido en la posición ${index}.`);
  }
  const id = readString(payload.id);
  if (!id) {
    throw new ApiError(`La API devolvió un indicador sin identificador en la posición ${index}.`);
  }

  const level = requireSeverity(payload.level ?? payload.severity, `El indicador "${id}"`);
  return {
    id,
    value: readNumber(payload.value),
    baseline: readNumber(payload.baseline),
    level,
    z: readNumber(payload.z),
    why: requireStringArray(payload.why, `El indicador "${id}"`),
    action: readString(payload.action) ?? responseProtocol[level].action,
    escalate: readString(payload.escalate),
    daysToThreshold: readNumber(payload.days_to_threshold),
  };
}

function normalizeHazard(payload: unknown, index: number): HazardStatus {
  if (!isRecord(payload)) {
    throw new ApiError(`La API devolvió un peligro con un formato no válido en la posición ${index}.`);
  }
  const id = readString(payload.id);
  if (!id) {
    throw new ApiError(`La API devolvió un peligro sin identificador en la posición ${index}.`);
  }

  const level = requireSeverity(payload.level ?? payload.severity, `El peligro "${id}"`);
  return {
    id,
    level,
    anomaly: readNumber(payload.anomaly),
    why: requireStringArray(payload.why, `El peligro "${id}"`),
    daysToThreshold: readNumber(payload.days_to_threshold),
    action: readString(payload.action) ?? getHazardAction(id, level),
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

  if (!Array.isArray(payload.indicators)) {
    throw new ApiError('La respuesta del estado de misión no contiene una lista de indicadores.');
  }
  if (!Array.isArray(payload.hazards)) {
    throw new ApiError('La respuesta del estado de misión no contiene una lista de peligros.');
  }

  const indicators = payload.indicators.map(normalizeIndicator);
  const hazards = payload.hazards.map(normalizeHazard);

  const indicatorIds = new Set<string>();
  for (const indicator of indicators) {
    if (indicatorIds.has(indicator.id)) {
      throw new ApiError(`La API devolvió el indicador duplicado "${indicator.id}".`);
    }
    indicatorIds.add(indicator.id);
  }

  const hazardIds = new Set<string>();
  for (const hazard of hazards) {
    if (hazardIds.has(hazard.id)) {
      throw new ApiError(`La API devolvió el peligro duplicado "${hazard.id}".`);
    }
    hazardIds.add(hazard.id);
  }

  return {
    indicators,
    hazards,
    profile: readString(payload.profile),
    missionDay: readNumber(payload.day) ?? day,
  };
}

function normalizeSeries(payload: unknown, endDay: number): SeriesDataset {
  if (!isRecord(payload)) {
    throw new ApiError('La respuesta de la serie de indicadores no es válida.');
  }
  if (!Array.isArray(payload.days)) {
    throw new ApiError('La respuesta de la serie no contiene una lista de días.');
  }
  if (!isRecord(payload.series)) {
    throw new ApiError('La respuesta de la serie no contiene una colección de indicadores.');
  }
  if (!isRecord(payload.baseline)) {
    throw new ApiError('La respuesta de la serie no contiene una colección de líneas base.');
  }

  const days = payload.days.map((rawDay, index) => {
    const day = readNullableNumber(rawDay, `El día de serie en la posición ${index}`);
    if (day === null || !Number.isInteger(day) || day < 0) {
      throw new ApiError(`La API devolvió un día de serie no válido en la posición ${index}.`);
    }
    return day;
  });

  for (let index = 1; index < days.length; index += 1) {
    if (days[index] <= days[index - 1]) {
      throw new ApiError('La API devolvió los días de la serie duplicados o fuera de orden.');
    }
  }
  if (days.length > 0 && days[days.length - 1] !== endDay) {
    throw new ApiError(`La serie solicitada para el día ${endDay} no termina en ese día.`);
  }

  const values: Record<string, Array<number | null>> = {};
  const baseline: Record<string, BaselineStats> = {};

  for (const [id, rawValues] of Object.entries(payload.series)) {
    if (!Array.isArray(rawValues)) {
      throw new ApiError(`La API devolvió una serie no válida para el indicador "${id}".`);
    }
    if (rawValues.length > days.length) {
      throw new ApiError(`La serie del indicador "${id}" tiene más lecturas que días.`);
    }
    const readings = rawValues.map((value, index) => (
      readNullableNumber(value, `La lectura del indicador "${id}" en la posición ${index}`)
    ));
    // Alineamos de forma explícita las lecturas finalizadas antes del último día.
    values[id] = readings.concat(
      Array.from({ length: days.length - readings.length }, () => null),
    );
  }

  for (const [id, rawStats] of Object.entries(payload.baseline)) {
    if (!isRecord(rawStats)) {
      throw new ApiError(`La API devolvió una línea base no válida para el indicador "${id}".`);
    }
    const median = readNullableNumber(rawStats.median, `La mediana del indicador "${id}"`);
    if (median === null) {
      throw new ApiError(`La API devolvió una línea base sin mediana para el indicador "${id}".`);
    }
    const mad = readNullableNumber(rawStats.mad, `El MAD del indicador "${id}"`);
    baseline[id] = { median, mad };
  }

  return { days, values, baseline };
}

export async function fetchSeries(crewId: string, day: number, signal?: AbortSignal): Promise<SeriesDataset> {
  if (DEMO_MODE) return demoDashboard(crewId, day).series;

  const query = new URLSearchParams({ end_day: String(day), days: '30' });
  const payload = await getJson(`/api/crew/${encodeURIComponent(crewId)}/series?${query.toString()}`, signal);
  return normalizeSeries(payload, day);
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

export async function updateCrewProfile(
  crewId: string,
  profile: MissionProfile,
): Promise<MissionProfile> {
  const response = await fetch(`${API_URL}/api/crew/${encodeURIComponent(crewId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // El estado HTTP basta para explicar el fallo.
    }
    throw new ApiError(errorDetail(payload) ?? `La API respondió con estado ${response.status}.`, response.status);
  }

  const payload: unknown = await response.json();
  const saved = isRecord(payload) ? readString(payload.profile) : null;
  return (knownProfile(saved) ?? profile);
}

function knownProfile(value: string | null): MissionProfile | null {
  return value === 'station' || value === 'moon' || value === 'mars_transit' ? value : null;
}

export async function fetchReports(crewId: string, signal?: AbortSignal): Promise<MissionReport[]> {
  const query = new URLSearchParams({ crew_id: crewId });
  const payload = await getJson(`/api/reports?${query.toString()}`, signal);
  const raw = isRecord(payload) && Array.isArray(payload.reports) ? payload.reports : null;
  if (!raw) {
    throw new ApiError('La respuesta de /api/reports no contiene una lista de reportes.');
  }

  return raw.map((item, index) => {
    if (!isRecord(item)) {
      throw new ApiError(`La API devolvió un reporte inválido en la posición ${index}.`);
    }
    const id = readString(item.id);
    const createdAt = readString(item.created_at);
    if (!id || !createdAt) {
      throw new ApiError(`La API devolvió un reporte incompleto en la posición ${index}.`);
    }
    const status = readString(item.status);
    return {
      id,
      day: readNumber(item.day) ?? 0,
      level: requireSeverity(item.level, `El reporte "${id}"`),
      hazard: readString(item.hazard),
      message: readString(item.message) ?? '',
      status: status === 'received' || status === 'responded' ? status : 'transit',
      etaMinutes: readNumber(item.eta_minutes) ?? 0,
      createdAt,
      responseMessage: readString(item.response_message),
    };
  });
}
