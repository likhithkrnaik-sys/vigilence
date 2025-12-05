import React, { useState } from 'react';
import DrowsinessMonitor from './components/DrowsinessMonitor';
import TripSummary from './components/TripSummary';
import { DrowsinessStats, MonitoringState } from './types';
import { ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [currentStats, setCurrentStats] = useState<DrowsinessStats | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [monitorState, setMonitorState] = useState<MonitoringState>(MonitoringState.IDLE);
  const [tripStats, setTripStats] = useState<DrowsinessStats | null>(null);

  const handleStatsUpdate = (stats: DrowsinessStats) => {
    setCurrentStats(stats);
  };

  const handleTripEnd = (finalStats: DrowsinessStats) => {
    setTripStats(finalStats);
    setShowSummary(true);
  };

  const handleStateChange = (state: MonitoringState) => {
    setMonitorState(state);
  };

  const closeSummary = () => {
    setShowSummary(false);
    setTripStats(null);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${monitorState === MonitoringState.ALARM ? 'bg-red-950 alarm-active' : 'bg-slate-950'}`}>
      
      {/* Header */}
      <header className="w-full max-w-lg flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">VigiLens</h1>
        </div>
        <div className="flex items-center space-x-4">
           {monitorState === MonitoringState.ACTIVE && currentStats && (
             <div className="text-right">
                <p className="text-xs text-gray-400">TIME ELAPSED</p>
                <p className="text-sm font-mono text-white font-bold">
                  {new Date(currentStats.monitoringDurationMs).toISOString().substr(11, 8)}
                </p>
             </div>
           )}
        </div>
      </header>

      {/* Main Container */}
      <main className="relative w-full max-w-lg aspect-[3/4] md:aspect-[4/3] bg-black rounded-3xl shadow-2xl ring-1 ring-white/10">
        <DrowsinessMonitor 
          onStatsUpdate={handleStatsUpdate} 
          onTripEnd={handleTripEnd}
          onStateChange={handleStateChange}
        />
        
        {showSummary && tripStats && (
          <TripSummary stats={tripStats} onClose={closeSummary} />
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="mt-8 text-center max-w-sm">
        <p className="text-gray-500 text-xs">
          {monitorState === MonitoringState.IDLE 
            ? "Position your device so your face is clearly visible. Ensure good lighting for best results."
            : "Keep your eyes on the road. VigiLens is monitoring your alertness."}
        </p>
      </footer>

    </div>
  );
};

export default App;
