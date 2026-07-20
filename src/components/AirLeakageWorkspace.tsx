import React, { useState, useEffect } from 'react';
import { ChevronLeft, RotateCcw, Activity, Info } from 'lucide-react';
import { NeonSaveWidget } from './NeonSaveWidget';

interface AirLeakageWorkspaceProps {
  onBack: () => void;
  teamLogs: { id: number; content: string }[];
  onSaveSuccess: () => Promise<void>;
}

export function AirLeakageWorkspace({ onBack, teamLogs, onSaveSuccess }: AirLeakageWorkspaceProps) {
  const [decayTime, setDecayTime] = useState('10.0');
  const [initVacuum, setInitVacuum] = useState('28.5');
  const [finalVacuum, setFinalVacuum] = useState('24.2');
  const [volume, setVolume] = useState('12000');

  const [leakageRate, setLeakageRate] = useState(0);
  const [coalPenalty, setCoalPenalty] = useState(0);

  useEffect(() => {
    const t = parseFloat(decayTime) || 1.0;
    const v1 = parseFloat(initVacuum) || 0;
    const v2 = parseFloat(finalVacuum) || 0;
    const vol = parseFloat(volume) || 0;

    // Standard Heat Exchange Institute (HEI) Air Leakage calculation:
    // Leakage (lb/hr) = 0.15 * Volume (cu ft) * (P2 - P1 in inHg) / Time (minutes)
    // Note: Vacuum decay means pressure increases, so (initVacuum - finalVacuum)
    const dp = Math.max(0, v1 - v2);
    const rate = (0.15 * vol * dp) / t;
    
    setLeakageRate(rate);

    // Approximate heat rate penalty (Btu/kWh or fraction of efficiency loss)
    // E.g., for every 5 lb/hr leakage, turbine backpressure increases, causing ~0.15% fuel penalty
    const penaltyPct = (rate / 5) * 0.15;
    setCoalPenalty(Math.max(0, penaltyPct));
  }, [decayTime, initVacuum, finalVacuum, volume]);

  const handleReset = () => {
    setDecayTime('10.0');
    setInitVacuum('28.5');
    setFinalVacuum('24.2');
    setVolume('12000');
  };

  const moduleData = {
    decayTimeMinutes: decayTime,
    initialVacuumInHg: initVacuum,
    finalVacuumInHg: finalVacuum,
    condenserVolumeCuFt: volume,
    calculatedLeakageRateLbHr: leakageRate.toFixed(2),
    calculatedHeatRatePenaltyPercent: coalPenalty.toFixed(3),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="self-start inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 rounded-lg text-xs font-mono transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-amber-400" />
          Back to Dashboard
        </button>

        <button
          onClick={handleReset}
          className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Calculation & UI */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-6 space-y-6 shadow-xl">
            <div>
              <h3 className="text-white font-sans font-semibold text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-400" />
                Condenser Air In-Leakage Diagnostics
              </h3>
              <p className="text-neutral-400 text-xs mt-0.5">
                Execute ASTM/HEI vacuum decay tests to calculate air ingress flow rates and evaluate heat rate fuel penalties.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Decay Test Duration */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Decay Test Duration (Minutes)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={decayTime}
                  onChange={(e) => setDecayTime(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Initial Vacuum */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Initial Vacuum (inHg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={initVacuum}
                  onChange={(e) => setInitVacuum(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Final Vacuum */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Final Vacuum (inHg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={finalVacuum}
                  onChange={(e) => setFinalVacuum(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Condenser volume */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Total Condenser Gas Volume (ft³)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              <div className="md:col-span-2 bg-neutral-950 border border-neutral-850/80 rounded-lg p-3 flex items-start gap-2.5 text-[10px] font-mono text-neutral-500">
                <Info className="h-4 w-4 text-neutral-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-neutral-400 font-bold uppercase block mb-0.5">HEI Formula Alignment</span>
                  Calculated using HEI standards: <code className="text-amber-400/90">Rate = (0.15 * Vol * dP) / t</code> where dP is in inches of mercury and t is test time.
                </div>
              </div>
            </div>
          </div>

          {/* Results Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-5 shadow-xl space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Calculated In-Leakage Rate
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-3xl font-mono font-bold text-amber-400">
                  {leakageRate.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-neutral-400">SCFM / (lb/hr)</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Air ingress flow rate directly degrading the steam vacuum barrier.
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-5 shadow-xl space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Estimated Turbine Heat Rate Penalty
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-3xl font-mono font-bold text-emerald-400">
                  +{coalPenalty.toFixed(3)}%
                </span>
                <span className="text-xs font-mono text-neutral-400">Heat Rate Rise</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Resulting generation efficiency decline and extra coal fuel consumption.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Save database action widget */}
        <div className="lg:col-span-1">
          <NeonSaveWidget
            moduleName="Condenser Air In-Leakage"
            moduleData={moduleData}
            teamLogs={teamLogs}
            onSaveSuccess={onSaveSuccess}
          />
        </div>
      </div>
    </div>
  );
}
