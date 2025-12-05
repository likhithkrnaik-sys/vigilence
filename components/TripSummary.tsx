import React, { useEffect, useState } from 'react';
import { DrowsinessStats } from '../types';
import { generateTripCoaching } from '../services/geminiService';
import { CheckCircle, AlertTriangle, Moon, Clock, RefreshCw, X } from 'lucide-react';

interface Props {
  stats: DrowsinessStats;
  onClose: () => void;
}

const TripSummary: React.FC<Props> = ({ stats, onClose }) => {
  const [advice, setAdvice] = useState<string>("Analyzing your trip data...");

  useEffect(() => {
    const fetchAdvice = async () => {
      const text = await generateTripCoaching(stats);
      setAdvice(text);
    };
    fetchAdvice();
  }, [stats]);

  const durationMin = Math.floor(stats.monitoringDurationMs / 60000);
  
  return (
    <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Trip Summary</h2>
            <p className="text-gray-400 text-sm">Review your driving alertness</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700/50 p-4 rounded-2xl flex flex-col items-center">
            <Clock className="w-6 h-6 text-blue-400 mb-2" />
            <span className="text-2xl font-bold text-white">{durationMin}m</span>
            <span className="text-xs text-gray-400">Duration</span>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-2xl flex flex-col items-center">
            <Moon className="w-6 h-6 text-purple-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.microsleepCount}</span>
            <span className="text-xs text-gray-400">Microsleeps</span>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-2xl flex flex-col items-center">
            <AlertTriangle className="w-6 h-6 text-yellow-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.distractionEvents}</span>
            <span className="text-xs text-gray-400">Distractions</span>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-2xl flex flex-col items-center">
            <RefreshCw className="w-6 h-6 text-green-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.blinkCount}</span>
            <span className="text-xs text-gray-400">Blinks</span>
          </div>
        </div>

        {/* AI Coach */}
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-20">
             <CheckCircle className="w-16 h-16 text-blue-400" />
           </div>
           <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-2">VigiLens Coach</h3>
           <p className="text-gray-200 text-sm leading-relaxed italic">
             "{advice}"
           </p>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all"
        >
          Start New Trip
        </button>

      </div>
    </div>
  );
};

export default TripSummary;
