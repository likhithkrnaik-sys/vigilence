
// Eye Aspect Ratio (EAR) Thresholds
// Increased to 0.25 to more easily detect closed eyes (standard webcams often read 0.20-0.22 when closed)
export const EAR_THRESHOLD_CLOSED = 0.25; 
export const EAR_THRESHOLD_DROWSY = 0.30; 

// Mouth Aspect Ratio (MAR) Threshold
export const MAR_THRESHOLD_YAWN = 0.5; // Mouth wide open

// Durations (in milliseconds)
// Reduced to 1.5s to make testing easier and safer
export const DURATION_MICROSLEEP = 1500; 
export const DURATION_LONG_BLINK = 400; // 400ms - 2s
export const DURATION_YAWN = 2000; // Yawn must last this long
export const DURATION_DISTRACTION = 3000; // Look away time
export const ESCALATION_DELAY = 10000; // 10 seconds to escalate to emergency
export const FACE_MISSING_WARNING_DELAY = 5000;
export const FACE_MISSING_PAUSE_DELAY = 30000;

// Scoring
export const SCORE_MAX = 100;
export const SCORE_CRITICAL = 60;
export const SCORE_WARNING = 30;

// Alarm Sound
export const ALARM_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Public domain loud alarm
