import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { getFaceLandmarker } from '../services/faceLandmarkerService';
import { calculateEAR, calculateMAR, LEFT_EYE_INDICES, RIGHT_EYE_INDICES } from '../utils/mathUtils';
import { Howl, Howler } from 'howler';
import { 
  EAR_THRESHOLD_CLOSED, 
  DURATION_MICROSLEEP, 
  ALARM_SOUND_URL, 
  ESCALATION_DELAY, 
  MAR_THRESHOLD_YAWN, 
  FACE_MISSING_WARNING_DELAY 
} from '../constants';
import { MonitoringState, DrowsinessStats } from '../types';
import { Eye, EyeOff, AlertTriangle, Play, Square, Siren, MapPin } from 'lucide-react';

interface Props {
  onStatsUpdate: (stats: DrowsinessStats) => void;
  onTripEnd: (finalStats: DrowsinessStats) => void;
  onStateChange: (state: MonitoringState) => void;
}

const DrowsinessMonitor: React.FC<Props> = ({ onStatsUpdate, onTripEnd, onStateChange }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Logic State Refs (Mutable for loop performance)
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>();
  const lastVideoTimeRef = useRef<number>(-1);
  const eyesClosedStartTimeRef = useRef<number | null>(null);
  const eyesOpenStartTimeRef = useRef<number | null>(null); // New: Track sustained open eyes
  const alarmStartTimeRef = useRef<number | null>(null);
  const lastFaceDetectedTimeRef = useRef<number>(Date.now());
  const statsRef = useRef<DrowsinessStats>({
    score: 0,
    blinkCount: 0,
    longBlinkCount: 0,
    microsleepCount: 0,
    yawnCount: 0,
    headNodCount: 0,
    distractionEvents: 0,
    monitoringDurationMs: 0,
    startTime: Date.now()
  });

  // UI State
  const [monitorState, setMonitorState] = useState<MonitoringState>(MonitoringState.IDLE);
  const [debugEAR, setDebugEAR] = useState<number>(0);
  const [eyesClosedDuration, setEyesClosedDuration] = useState<number>(0); // For UI visualization
  const [modelLoaded, setModelLoaded] = useState(false);
  const [alarmSound, setAlarmSound] = useState<Howl | null>(null);

  // Setup Alarm Sound
  useEffect(() => {
    const sound = new Howl({
      src: [ALARM_SOUND_URL],
      loop: true,
      volume: 1.0,
      preload: true,
      html5: true, // Helps with playback on some devices
    });
    setAlarmSound(sound);
    return () => {
      sound.unload();
    };
  }, []);

  // Initialize MediaPipe
  useEffect(() => {
    const init = async () => {
      const landmarker = await getFaceLandmarker();
      faceLandmarkerRef.current = landmarker;
      setModelLoaded(true);
    };
    init();
  }, []);

  const triggerAlarm = useCallback(() => {
    if (monitorState !== MonitoringState.ALARM && monitorState !== MonitoringState.EMERGENCY) {
      setMonitorState(MonitoringState.ALARM);
      onStateChange(MonitoringState.ALARM);
      alarmStartTimeRef.current = Date.now();
      eyesOpenStartTimeRef.current = null; // Reset open timer
      
      // Force play and log
      console.log("TRIGGERING ALARM SOUND");
      alarmSound?.play();
      
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 1000]);
      }
    }
  }, [monitorState, onStateChange, alarmSound]);

  const stopAlarm = useCallback(() => {
    setMonitorState(MonitoringState.ACTIVE);
    onStateChange(MonitoringState.ACTIVE);
    alarmSound?.stop();
    alarmStartTimeRef.current = null;
    eyesClosedStartTimeRef.current = null;
    eyesOpenStartTimeRef.current = null;
    setEyesClosedDuration(0);
  }, [onStateChange, alarmSound]);

  const handleImAwake = () => {
    stopAlarm();
    // Add logic to log user response
  };

  const escalateEmergency = useCallback(() => {
    setMonitorState(MonitoringState.EMERGENCY);
    onStateChange(MonitoringState.EMERGENCY);
    // Keep alarm playing
    
    // Get Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Emergency Location Captured:", position.coords);
          // Here we would typically hit an API to send SMS
        },
        (error) => console.error("Location error", error)
      );
    }
  }, [onStateChange]);

  const detect = useCallback(() => {
    const video = webcamRef.current?.video;
    const landmarker = faceLandmarkerRef.current;
    
    if (video && video.readyState === 4 && landmarker) {
      // 1. Process Video Frame
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const results = landmarker.detectForVideo(video, Date.now());

        // Update Canvas for visualization (optional overlay)
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Optional: Draw landmarks
            if (results.faceLandmarks) {
               const drawingUtils = new DrawingUtils(ctx);
               for (const landmarks of results.faceLandmarks) {
                 drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
                 drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#FF3030' });
                 drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#FF3030' });
               }
            }
          }
        }

        // 2. Logic Loop
        const now = Date.now();

        if (results.faceLandmarks.length > 0) {
          lastFaceDetectedTimeRef.current = now;
          const landmarks = results.faceLandmarks[0];

          // Calculate EAR
          const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
          const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
          const avgEAR = (leftEAR + rightEAR) / 2;
          setDebugEAR(avgEAR);

          // Calculate MAR (Yawn)
          const mar = calculateMAR(landmarks);

          // --- DROWSINESS LOGIC ---
          
          // Eye Closure
          if (avgEAR < EAR_THRESHOLD_CLOSED) {
            // EYES ARE CLOSED
            eyesOpenStartTimeRef.current = null; // Reset open timer

            if (eyesClosedStartTimeRef.current === null) {
              eyesClosedStartTimeRef.current = now;
            } else {
              const closedDuration = now - eyesClosedStartTimeRef.current;
              
              // Only update UI state occasionally to save renders, or every frame if acceptable
              setEyesClosedDuration(closedDuration);

              // 2-Second Rule -> ALARM
              if (closedDuration >= DURATION_MICROSLEEP) {
                if (monitorState === MonitoringState.ACTIVE) {
                  triggerAlarm();
                  statsRef.current.microsleepCount++;
                }
              }
            }
          } else {
            // EYES ARE OPEN
            eyesClosedStartTimeRef.current = null;
            setEyesClosedDuration(0);

            // Handle Alarm Auto-Stop (Wake Up Logic)
            if (monitorState === MonitoringState.ALARM || monitorState === MonitoringState.EMERGENCY) {
                if (eyesOpenStartTimeRef.current === null) {
                  eyesOpenStartTimeRef.current = now;
                }
                
                // If eyes have been open for > 500ms, assume user is awake and stop alarm
                const openDuration = now - eyesOpenStartTimeRef.current;
                if (openDuration > 500) { 
                   stopAlarm();
                   console.log("Alarm stopped: Eyes detected open for 500ms");
                }
            } else {
              eyesOpenStartTimeRef.current = null;
            }
          }

          // Yawn Detection
          if (mar > MAR_THRESHOLD_YAWN) {
             // Basic counter (debounce needed in production)
             if (now % 20 === 0) statsRef.current.yawnCount++; 
          }

          // --- END LOGIC ---

        } else {
           // No face detected
           const timeSinceFace = now - lastFaceDetectedTimeRef.current;
           if (timeSinceFace > FACE_MISSING_WARNING_DELAY && monitorState === MonitoringState.ACTIVE) {
              console.warn("Face not detected!");
           }
        }

        // Check Escalation Timer
        if (monitorState === MonitoringState.ALARM && alarmStartTimeRef.current) {
          if (now - alarmStartTimeRef.current > ESCALATION_DELAY) {
            escalateEmergency();
          }
        }

        // Update Stats
        statsRef.current.monitoringDurationMs = now - statsRef.current.startTime;
        onStatsUpdate({ ...statsRef.current });
      }
    }
    requestRef.current = requestAnimationFrame(detect);
  }, [monitorState, triggerAlarm, stopAlarm, escalateEmergency, onStatsUpdate]);

  useEffect(() => {
    if (monitorState === MonitoringState.ACTIVE || monitorState === MonitoringState.ALARM || monitorState === MonitoringState.EMERGENCY) {
      requestRef.current = requestAnimationFrame(detect);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [monitorState, detect]);

  const startMonitoring = () => {
    if (!modelLoaded) return;
    
    // Resume Audio Context (Browser Autoplay Policy fix)
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }

    statsRef.current = {
      score: 0,
      blinkCount: 0,
      longBlinkCount: 0,
      microsleepCount: 0,
      yawnCount: 0,
      headNodCount: 0,
      distractionEvents: 0,
      monitoringDurationMs: 0,
      startTime: Date.now()
    };
    setMonitorState(MonitoringState.ACTIVE);
    onStateChange(MonitoringState.ACTIVE);
    lastFaceDetectedTimeRef.current = Date.now();
  };

  const stopMonitoring = () => {
    setMonitorState(MonitoringState.IDLE);
    onStateChange(MonitoringState.IDLE);
    alarmSound?.stop();
    statsRef.current.endTime = Date.now();
    onTripEnd(statsRef.current);
  };

  // UI Helpers
  const eyesClosedSecs = (eyesClosedDuration / 1000).toFixed(1);
  const isEyesClosed = eyesClosedDuration > 100;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
      
      {/* Video Layer */}
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={true}
        className={`absolute inset-0 w-full h-full object-cover opacity-60 ${monitorState === MonitoringState.IDLE ? 'grayscale' : ''}`}
      />
      
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full object-cover" 
        style={{ transform: 'scaleX(-1)' }} 
      />

      {/* Overlay UI */}
      <div className="z-10 w-full h-full flex flex-col justify-between p-6 bg-gradient-to-b from-black/50 via-transparent to-black/80">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${modelLoaded ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-xs font-mono text-gray-300">
              {modelLoaded ? 'SYSTEM READY' : 'LOADING AI...'}
            </span>
          </div>
          {monitorState === MonitoringState.ACTIVE && (
            <div className={`bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border ${isEyesClosed ? 'border-red-500 bg-red-900/50' : 'border-gray-700'}`}>
              <span className={`text-xs font-mono ${isEyesClosed ? 'text-red-200 font-bold' : 'text-green-400'}`}>
                EAR: {debugEAR.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Center Action / Alarm */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          
          {monitorState === MonitoringState.IDLE && (
            <button
              onClick={startMonitoring}
              disabled={!modelLoaded}
              className={`group relative flex items-center justify-center w-24 h-24 rounded-full bg-blue-600 hover:bg-blue-500 transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Play className="w-10 h-10 text-white ml-1" />
              <span className="absolute -bottom-10 text-sm font-medium text-blue-200">START DRIVE</span>
            </button>
          )}

          {/* ACTIVE STATE WARNINGS */}
          {monitorState === MonitoringState.ACTIVE && isEyesClosed && (
            <div className="flex flex-col items-center animate-pulse">
               <EyeOff className="w-16 h-16 text-yellow-400 mb-2" />
               <h2 className="text-2xl font-bold text-yellow-400">EYES CLOSED</h2>
               <div className="mt-2 text-4xl font-mono text-white bg-black/50 px-4 py-2 rounded-lg">
                 {eyesClosedSecs}s
               </div>
               <p className="text-xs text-gray-400 mt-2">Alarm at {(DURATION_MICROSLEEP / 1000).toFixed(1)}s</p>
            </div>
          )}

          {monitorState === MonitoringState.ALARM && (
            <div className="flex flex-col items-center animate-bounce">
              <Siren className="w-24 h-24 text-red-500 mb-4" />
              <h2 className="text-4xl font-bold text-red-500 tracking-wider">WAKE UP!</h2>
              <p className="text-white mt-2">Drowsiness Detected</p>
              <button 
                onClick={handleImAwake}
                className="mt-8 px-10 py-4 bg-white text-red-600 font-bold text-xl rounded-full shadow-lg active:scale-95 transition-transform"
              >
                I'M AWAKE
              </button>
            </div>
          )}

           {monitorState === MonitoringState.EMERGENCY && (
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="w-24 h-24 text-orange-500 mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-orange-500">EMERGENCY MODE</h2>
              <p className="text-gray-300 mt-4 max-w-xs">User unresponsive. Location captured. Simulating emergency contact...</p>
              <div className="mt-4 flex items-center space-x-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>GPS Active</span>
              </div>
              <button 
                onClick={handleImAwake}
                className="mt-8 px-8 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600"
              >
                Cancel Emergency
              </button>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-between items-end">
           {monitorState === MonitoringState.ACTIVE && (
             <div className="flex flex-col">
                <span className="text-xs text-gray-400 uppercase tracking-widest mb-1">Status</span>
                <div className="flex items-center space-x-2">
                  <Eye className={`w-5 h-5 ${isEyesClosed ? 'text-red-500' : 'text-blue-400'}`} />
                  <span className="text-xl font-bold text-white">MONITORING</span>
                </div>
             </div>
           )}

           {(monitorState === MonitoringState.ACTIVE || monitorState === MonitoringState.ALARM) && (
             <button 
               onClick={stopMonitoring}
               className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-lg border border-red-500/30 transition-colors"
             >
               <Square className="w-4 h-4 fill-current" />
               <span className="font-medium">STOP</span>
             </button>
           )}
        </div>

      </div>
    </div>
  );
};

export default DrowsinessMonitor;