export interface DrowsinessStats {
  score: number; // 0-100
  blinkCount: number;
  longBlinkCount: number;
  microsleepCount: number;
  yawnCount: number;
  headNodCount: number;
  distractionEvents: number;
  monitoringDurationMs: number;
  startTime: number;
  endTime?: number;
}

export enum MonitoringState {
  IDLE = 'IDLE',
  CALIBRATING = 'CALIBRATING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ALARM = 'ALARM',
  EMERGENCY = 'EMERGENCY'
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface EmergencyContact {
  name: string;
  phone: string; // In a real app, this would be used for SMS
}
