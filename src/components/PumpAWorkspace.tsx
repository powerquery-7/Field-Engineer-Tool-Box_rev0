import React, { useState, useEffect } from 'react';
import { ChevronLeft, RotateCcw, Activity, Gauge, Cpu, Check, Database, RefreshCw } from 'lucide-react';
import { NeonSaveWidget } from './NeonSaveWidget';

interface PumpAWorkspaceProps {
  onBack: () => void;
  teamLogs: { id: number; content: string }[];
  onSaveSuccess: () => Promise<void>;
}

export function PumpAWorkspace({ onBack, teamLogs, onSaveSuccess }: PumpAWorkspaceProps) {
  const [suction, setSuction] = useState('14.2');
  const [discharge, setDischarge] = useState('82.5');
  const [speed, setSpeed] = useState('1750');
  const [flow, setFlow] = useState('350');
  const [sg, setSg] = useState('1.0');

  const [tdh, setTdh] = useState(0);
  const [power, setPower] = useState(0);

  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [isQuickSuccess, setIsQuickSuccess] = useState(false);

  // Recalculate pump metrics
  useEffect(() => {
    const sVal = parseFloat(suction) || 0;
    const dVal = parseFloat(discharge) || 0;
    const fVal = parseFloat(flow) || 0;
    const sgVal = parseFloat(sg) || 1.0;

    const head = Math.max(0, (dVal - sVal) * 2.31 / sgVal);
    const hydPower = (fVal * head * sgVal) / 3960;

    setTdh(head);
    setPower(hydPower);
  }, [suction, discharge, flow, sg]);

  const handleReset = () => {
    setSuction('14.2');
    setDischarge('82.5');
    setSpeed('1750');
    setFlow('350');
    setSg('1.0');
  };

  const handleQuickSave = async () => {
    setIsQuickSaving(true);
    const operatorName = localStorage.getItem('neo_operator_name') || 'Christian de la Cruz';
    const payload = {
      user: operatorName,
      role: 'Field Operations',
      module: 'Inspection of Pump A',
      title: 'Pump A Diagnostics - Quick Upload',
      description: 'Quick 1-click snapshot save.',
      text: `[Inspection of Pump A] Suction: ${suction} PSI | Discharge: ${discharge} PSI | Speed: ${speed} RPM | Flow: ${flow} GPM | TDH: ${tdh.toFixed(1)} ft | Power: ${power.toFixed(2)} HP`,
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
    suctionPressurePsi: suction,
    dischargePressurePsi: discharge,
    motorSpeedRpm: speed,
    flowRateGpm: flow,
    specificGravity: sg,
    calculatedTdhFeet: tdh.toFixed(1),
    calculatedHydraulicPowerHp: power.toFixed(2),
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
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Middle: Calculation Forms and Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-6 space-y-6 shadow-xl">
            <div>
              <h3 className="text-white font-sans font-semibold text-lg flex items-center gap-2">
                <Gauge className="h-5 w-5 text-amber-400" />
                Inspection of Pump A - Diagnostic Suite
              </h3>
              <p className="text-neutral-400 text-xs mt-0.5">
                Verify pump performance by evaluating suction heads, discharge margins, and Total Dynamic Head (TDH).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Suction Pressure */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Suction Pressure (PSI)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={suction}
                  onChange={(e) => setSuction(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Discharge Pressure */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Discharge Pressure (PSI)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={discharge}
                  onChange={(e) => setDischarge(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Motor Speed */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Motor Speed (RPM)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Flow Rate */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Volumetric Flow Rate (GPM)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={flow}
                  onChange={(e) => setFlow(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              {/* Specific Gravity */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Fluid Specific Gravity (SG)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sg}
                  onChange={(e) => setSg(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2.5 rounded-lg transition-colors text-right"
                />
              </div>

              <div className="bg-neutral-950 border border-neutral-850/80 rounded-lg p-3 flex flex-col justify-center text-[10px] font-mono text-neutral-500">
                <span className="text-neutral-400 font-bold uppercase mb-1">Standard Constants</span>
                <div>TDH Multiplier: <span className="text-white">2.31 ft/psi</span></div>
                <div>Fluid Medium: <span className="text-amber-400">Water / Condensate</span></div>
              </div>
            </div>
          </div>

          {/* Results Board */}
          <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-neutral-950/60 border border-neutral-850/80 rounded-xl space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Total Dynamic Head (TDH)
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-3xl font-mono font-bold text-amber-400">
                  {tdh.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-neutral-400">Feet of Head</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Net work performed by the pump to overcome piping resistance.
              </p>
            </div>

            <div className="p-4 bg-neutral-950/60 border border-neutral-850/80 rounded-xl space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Hydraulic Fluid Power
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-3xl font-mono font-bold text-emerald-400">
                  {power.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-neutral-400">Horsepower (HP)</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                The theoretical work rate transmitted directly to the fluid medium.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Neon Database Action Widget */}
        <div className="lg:col-span-1">
          <NeonSaveWidget
            moduleName="Inspection of Pump A"
            moduleData={moduleData}
            teamLogs={teamLogs}
            onSaveSuccess={onSaveSuccess}
          />
        </div>
      </div>
    </div>
  );
}
