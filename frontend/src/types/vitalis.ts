export type HazardLevel = 'normal' | 'watch' | 'act' | 'emergency';

export type ReportStatus = 'in_transit' | 'received' | 'responded';

export interface SymptomChecklist {
  headache: boolean;
  blurred_vision: boolean;
  dizziness: boolean;
  nausea: boolean;
  back_bone_pain: boolean;
  fever_malaise: boolean;
  self_harm_thoughts: boolean;
}

export interface CheckInPayload {
  crew_id: string;
  day: number;
  sleep_hours: number;
  mood: number;
  stress: number;
  symptoms: SymptomChecklist;
  notes?: string;
  recorded_at: string;
}

export interface OfflineCheckIn extends CheckInPayload {
  local_id?: number;
  synced: boolean;
}

export interface EarthReportPayload {
  crew_id: string;
  day: number;
  hazard_id: string;
  level: HazardLevel;
  summary: string;
  action_taken: string;
  created_at: string;
}

export interface EarthReport extends EarthReportPayload {
  id?: string | number;
  local_id?: number;
  status: ReportStatus;
  synced: boolean;
  earth_reply?: string;
}