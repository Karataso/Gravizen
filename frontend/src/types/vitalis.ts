export type HazardLevel = 'normal' | 'watch' | 'act' | 'emergency';

export type ReportStatus = 'transit' | 'received' | 'responded';

// Claves = ids que espera la API (docs/api.md).
export interface SymptomChecklist {
  headache: boolean;
  vision_change: boolean;
  dizziness: boolean;
  nausea: boolean;
  back_pain: boolean;
  fever: boolean;
  self_harm: boolean;
}

export interface CheckInPayload extends SymptomChecklist {
  crew_id: string;
  day: number;
  sleep_h: number;
  mood: number;
  stress: number;
  note?: string;
  recorded_at: string;
}

export interface OfflineCheckIn extends CheckInPayload {
  local_id?: number;
  synced: boolean;
}

export interface EarthReportPayload {
  crew_id: string;
  day: number;
  hazard: string;
  level: HazardLevel;
  message: string;
  created_at: string;
}

export interface EarthReport extends EarthReportPayload {
  id?: string | number;
  local_id?: number;
  status: ReportStatus;
  synced: boolean;
  earth_reply?: string;
}
