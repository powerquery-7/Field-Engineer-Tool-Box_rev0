import React, { useState, useEffect } from 'react';
import { ChevronLeft, RotateCcw, Activity, ShieldAlert, Cpu, Check, Database, RefreshCw } from 'lucide-react';
import { NeonSaveWidget } from './NeonSaveWidget';

interface PumpBSweepsWorkspaceProps {
  onBack: () => void;
  teamLogs: { id: number; content: string }[];
  onSaveSuccess: () => Promise<void>;
}

export function PumpBSweepsWorkspace({ onBack, teamLogs, onSaveSuccess }: PumpBSweepsWorkspaceProps) {
  const [speed, setSpeed] = useState('3450');
  const [vibStage1, setVibStage1] = useState('1.15');
  const [vibStage2, setVibStage2] = useState('1.32');
  const [sealTemp, setSealTemp] = useState('138.0');
  const [vacuum, setVacuum] = useState('25.8');

  const [maxVib, setMaxVib] = useState(0);
  const [vibStatus, setVibStatus] = useState<'Normal' | 'Warning' | 'Critical'>('Normal');

  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [isQuickSuccess, setIsQuickSuccess] = useState(false);

  useEffect(() => {
    const v1 = parseFloat(vibStage1) || 0;
    const v2 = parseFloat(vibStage2) || 0;
    const peak = Math.max(v1, v2);
    setMaxVib(peak);

    if (peak >= 2.0) {
      setVibStatus('Critical');
    } else if (peak >= 1.5) {
      setVibStatus('Warning');
    } else {
      setVibStatus('Normal');
    }
  }, [vibStage1, vibStage2]);

  const handleReset = () => {
    setSpeed('3450');
    setVibStage1('1.15');
    setVibStage2('1.32');
    setSealTemp('138.0');
    setVacuum('25.8');
  };

  const handleQuickSave = async () => {
    setIsQuickSaving(true);
    const operatorName = localStorage.getItem('neo_operator_name') || 'Christian de la Cruz';
    const payload = {
      user: operatorName,
      role: 'Field Operations',
      module: 'Boiler Feed Pump B Sweeps',
      title: 'Pump B Sweeps - Quick Upload',
      description: 'Quick 1-click snapshot save.',
      text: `[Boiler Feed Pump B Sweeps] Rotor Speed: ${speed} RPM | Vib S1: ${vibStage1} mils | Vib S2: ${vibStage2} mils | Seal Temp: ${sealTemp} °F | Vacuum: ${vacuum} inHg | Peak Vib: ${maxVib.toFixed(2)} mils`,
      timestamp: new Date().toISOString(),
      dateString: new Date().toISOString().split('T')[0],
      data: moduleData
    };

    try {
      const response = await fetch('/api/save-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: JSON.stringify(payload) }),
      });
      if (!response.ok) throw new Error('Failed to save');
      setIsQuickSuccess(true);
      await onSaveSuccess();
      setTimeout(() => setIsQuickSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to upload to database: ' + err);
    } finally {
      setIsQuickSaving(false);
    }
  };

  const moduleData = {
    turbineSpeedRpm: speed,
    stage1VibrationMils: vibStage1,
    stage2VibrationMils: vibStage2,
    sealWaterTempF: sealTemp,
    exhaustVacuumInHg: vacuum,
    calculatedPeakVibrationMils: maxVib.toFixed(2),
    vibrationStatus: vibStatus,
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

        <div className="flex items-center gap-2 self-end">
          <button
            onClick={handleQuickSave}
            disabled={isQuickSaving}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isQuickSaving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : isQuickSuccess ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
            {isQuickSaving ? 'Uploading...' : isQuickSuccess ? 'Uploaded to DB!' : 'Upload to Neon DB'}
          </button>

          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-6 space-y-6 shadow-xl">
            <div>
              <h3 className="text-white font-sans font-semibold text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-400 animate-pulse" />
                Boiler Feed Pump B - Sweep Diagnostics
              </h3>
              <p className="text-neutral-400 text-xs mt-0.5">
                Monitor bearing dynamics, vibration limits, and continuous turbine speed metrics to guard high-speed feed systems.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Turbine Speed */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Turbine Rotor Speed (RPM)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Stage 1 Bearing Vibration */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Stage 1 Bearing Vibration (mils)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={vibStage1}
                  onChange={(e) => setVibStage1(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Stage 2 Bearing Vibration */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Stage 2 Bearing Vibration (mils)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={vibStage2}
                  onChange={(e) => setVibStage2(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Seal Water Temperature */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Seal Water Temp (°F)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sealTemp}
                  onChange={(e) => setSealTemp(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Exhaust Vacuum */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Exhaust Vacuum (inHg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={vacuum}
                  onChange={(e) => setVacuum(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              <div className="bg-neutral-950 border border-neutral-850/80 rounded-lg p-3 flex flex-col justify-center text-[10px] font-mono text-neutral-500">
                <span className="text-neutral-400 font-bold uppercase mb-1">Threshold Guide</span>
                <div>Warning Trigger: <span className="text-amber-500">&gt;= 1.5 mils</span></div>
                <div>Danger Trigger: <span className="text-red-500">&gt;= 2.0 mils</span></div>
              </div>
            </div>
          </div>

          {/* Sweep Results Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-5 shadow-xl space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Peak Resolved Vibration
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-mono font-bold text-amber-400">
                  {maxVib.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-neutral-400">mils</span>
                <span className={`ml-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  vibStatus === 'Critical'
                    ? 'bg-red-950/60 text-red-400 border border-red-900/40'
                    : vibStatus === 'Warning'
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-900/40'
                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40'
                }`}>
                  {vibStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Maximum active shaft excursion recorded across bearing sensors.
              </p>
            </div>

            {vibStatus !== 'Normal' && (
              <div className="bg-neutral-900 border border-red-950/40 rounded-2xl p-5 shadow-xl flex items-center gap-4 animate-fade-in">
                <div className="p-3 bg-red-950/40 border border-red-900/30 text-red-400 rounded-xl">
                  <ShieldAlert className="h-6 w-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-sans font-bold">Turbine Excursion Warning</h4>
                  <p className="text-neutral-400 text-[11px] leading-relaxed mt-1">
                    Peak bearing vibration exceeds permissible thresholds. Verify rotor shaft alignment and inspect casing support anchors.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Neon Save Widget Column */}
        <div className="lg:col-span-1">
          <NeonSaveWidget
            moduleName="Boiler Feed Pump B Sweeps"
            moduleData={moduleData}
            teamLogs={teamLogs}
            onSaveSuccess={onSaveSuccess}
          />
        </div>
      </div>
    </div>
  );
}
