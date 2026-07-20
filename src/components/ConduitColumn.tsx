import React from 'react';
import { Sparkles, Trash2, Gauge, Thermometer, ChevronRight, AlertTriangle } from 'lucide-react';
import { ConduitData, CalculatedConduitMetrics } from '../types';

interface ConduitColumnProps {
  conduit: ConduitData;
  calculated: CalculatedConduitMetrics;
  deviation: number;
  ambientTemp: string;
  onUpdateConduit: (id: number, updated: Partial<ConduitData>) => void;
  onFillDemo: (id: number) => void;
  onClearConduit: (id: number) => void;
}

export const ConduitColumn: React.FC<ConduitColumnProps> = ({
  conduit,
  calculated,
  deviation,
  ambientTemp,
  onUpdateConduit,
  onFillDemo,
  onClearConduit,
}) => {
  const handleStaticPressureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateConduit(conduit.id, { staticPressure: e.target.value });
  };

  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateConduit(conduit.id, { temperature: e.target.value });
  };

  const handlePortReadingChange = (
    port: 'port1' | 'port2',
    index: number,
    value: string
  ) => {
    const readings = [...(port === 'port1' ? conduit.port1Readings : conduit.port2Readings)];
    readings[index] = value;
    if (port === 'port1') {
      onUpdateConduit(conduit.id, { port1Readings: readings });
    } else {
      onUpdateConduit(conduit.id, { port2Readings: readings });
    }
  };

  const isWarn = Math.abs(deviation) > 0.05 && calculated.hasValidReadings;

  return (
    <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl shadow-black/40">
      {/* Column Title Header */}
      <div className="px-4 py-3 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-sm font-mono font-bold text-neutral-200">
            CONDUIT {conduit.id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onFillDemo(conduit.id)}
            title="Populate demo data"
            className="p-1 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onClearConduit(conduit.id)}
            title="Reset conduit values"
            className="p-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Local Physical Parameters */}
      <div className="p-4 bg-neutral-950/40 border-b border-neutral-800 grid grid-cols-2 gap-3">
        {/* Static Pressure (inWC) */}
        <div>
          <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Gauge className="h-3 w-3 text-neutral-400" /> Static P. (inWC)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={conduit.staticPressure}
            onChange={handleStaticPressureChange}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-2.5 py-1.5 rounded text-right transition-colors"
          />
        </div>

        {/* Conduit Temp (°F) */}
        <div>
          <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Thermometer className="h-3 w-3 text-neutral-400" /> Gas Temp (°F)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={`${ambientTemp} (ambient)`}
            value={conduit.temperature}
            onChange={handleTempChange}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-2.5 py-1.5 rounded text-right transition-colors"
          />
        </div>
      </div>

      {/* 12-Point Input Matrix */}
      <div className="p-4 flex-1 space-y-3">
        <div className="grid grid-cols-3 text-center text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider pb-1 border-b border-neutral-800/65">
          <span>Port 1</span>
          <span>Point</span>
          <span>Port 2</span>
        </div>

        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
          {Array.from({ length: 12 }).map((_, index) => {
            const ptNum = index + 1;
            return (
              <div key={ptNum} className="grid grid-cols-3 items-center gap-1.5">
                {/* Port 1 */}
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  value={conduit.port1Readings[index]}
                  onChange={(e) => handlePortReadingChange('port1', index, e.target.value)}
                  className="bg-neutral-950 border border-neutral-850/80 focus:border-amber-500/50 outline-none text-neutral-300 font-mono text-xs px-2 py-1 rounded text-center transition-colors"
                />

                {/* Index Indicator */}
                <div className="text-center font-mono text-[10px] text-neutral-500 bg-neutral-950/60 py-1 border border-neutral-850/30 rounded">
                  {ptNum}
                </div>

                {/* Port 2 */}
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  value={conduit.port2Readings[index]}
                  onChange={(e) => handlePortReadingChange('port2', index, e.target.value)}
                  className="bg-neutral-950 border border-neutral-850/80 focus:border-amber-500/50 outline-none text-neutral-300 font-mono text-xs px-2 py-1 rounded text-center transition-colors"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Calculated Metric Results Card */}
      <div className="p-4 bg-neutral-950/80 border-t border-neutral-850/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-neutral-500 uppercase">Mass Flow Rate</span>
          <span className="text-xs font-mono font-bold text-white">
            {calculated.hasValidReadings ? `${calculated.massFlow.toFixed(3)} k lb/hr` : '0.000 k lb/hr'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-neutral-500 uppercase">Avg Velocity</span>
          <span className="text-xs font-mono text-neutral-300">
            {calculated.hasValidReadings ? `${calculated.avgVelocity.toFixed(0)} fpm` : '0 fpm'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-neutral-500 uppercase">Gas Density</span>
          <span className="text-xs font-mono text-neutral-400">
            {calculated.hasValidReadings ? `${calculated.density.toFixed(4)} lb/ft³` : 'N/A'}
          </span>
        </div>

        <div className="pt-2 border-t border-neutral-850/50 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Mean Deviation</span>
            <span className={`text-xs font-mono font-semibold ${isWarn ? 'text-red-400' : 'text-emerald-400'}`}>
              {calculated.hasValidReadings ? `${(deviation * 100).toFixed(1)}%` : '0.0%'}
            </span>
          </div>

          {/* Miniature Deviation Indicator Line */}
          {calculated.hasValidReadings && (
            <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden mt-1 relative">
              <div
                className={`h-full absolute left-1/2 transition-all duration-300 ${
                  isWarn ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(50, Math.abs(deviation) * 500)}%`,
                  transform: deviation >= 0 ? 'translateX(0)' : 'translateX(-100%)',
                }}
              />
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-neutral-700" />
            </div>
          )}

          {isWarn && (
            <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-red-400 leading-tight">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span>Imbalance exceeds 5% threshold!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
