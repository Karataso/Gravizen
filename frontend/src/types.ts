export type Severity = 'normal' | 'watch' | 'act' | 'emergency';

export type HazardId = 'rad' | 'iso' | 'dist' | 'grav' | 'env' | (string & {});

export type MissionProfile = 'station' | 'moon' | 'mars_transit';

export interface MissionReport {
  id: string;
  day: number;
  level: Severity;
  hazard: string | null;
  message: string;
  status: 'transit' | 'received' | 'responded';
  etaMinutes: number;
  createdAt: string;
  responseMessage: string | null;
}

export type EscalationTarget = 'crew' | 'flight_surgeon' | 'mission_control' | (string & {});

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  severity: Severity;
  missionDay?: number;
}

export interface IndicatorStatus {
  id: string;
  value: number | null;
  baseline: number | null;
  level: Severity;
  z: number | null;
  why: string[];
  action: string;
  escalate: EscalationTarget | null;
  daysToThreshold: number | null;
}

export interface HazardStatus {
  id: HazardId;
  level: Severity;
  anomaly: number | null;
  why: string[];
  daysToThreshold: number | null;
  action: string;
  urgency: string;
}

export interface BaselineStats {
  median: number;
  mad: number | null;
}

export interface SeriesDataset {
  days: number[];
  values: Record<string, Array<number | null>>;
  baseline: Record<string, BaselineStats>;
}

export interface SeriesPoint {
  day: number;
  value: number | null;
  baseline: number | null;
  baselineLow: number | null;
  baselineHigh: number | null;
}

export interface DashboardData {
  crewId: string;
  missionDay: number;
  profile: string | null;
  indicators: IndicatorStatus[];
  hazards: HazardStatus[];
  series: SeriesDataset;
  source: 'api' | 'demo';
}
