export type Severity = 'normal' | 'watch' | 'act' | 'emergency';

export type HazardId = 'sleep' | 'cardio' | 'mood' | 'radiation' | 'co2';

export interface HazardStatus {
  id: HazardId;
  label: string;
  value: string;
  unit: string;
  severity: Severity;
  explanation: string;
  action: string;
  urgency: string;
  daysToThreshold: number | null;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  severity: Severity;
}

export interface SeriesPoint {
  day: number;
  value: number;
  baseline: number;
}

export interface DashboardData {
  crewId: string;
  crewName: string;
  missionDay: number;
  hazards: HazardStatus[];
  crew: CrewMember[];
  series: SeriesPoint[];
  source: 'api' | 'demo';
}
