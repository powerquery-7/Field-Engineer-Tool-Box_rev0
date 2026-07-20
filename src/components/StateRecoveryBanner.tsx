import React from 'react';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface StateRecoveryBannerProps {
  timestamp: string;
  onKeep: () => void;
  onClear: () => void;
}

export const StateRecoveryBanner: React.FC<StateRecoveryBannerProps> = ({
  timestamp,
  onKeep,
  onClear,
}) => {
  const formattedTime = React.useMemo(() => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  }, [timestamp]);

  return (
    <div className="border border-amber-500/30 bg-amber-950/20 backdrop-blur-md rounded-lg p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-amber-400 font-medium font-sans text-sm md:text-base">
            Previous Session Data Retrieved
          </h4>
          <p className="text-neutral-400 text-xs md:text-sm mt-0.5">
            System detected active isokinetic calculations cached from{' '}
            <span className="font-mono text-amber-300 font-semibold">{formattedTime}</span>.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
        <button
          onClick={onClear}
          className="flex-1 md:flex-none px-4 py-2 bg-neutral-900 hover:bg-red-950/40 border border-neutral-800 hover:border-red-900/30 text-neutral-400 hover:text-red-400 rounded-md text-xs font-mono transition-colors flex items-center justify-center gap-1.5"
          id="btn-start-fresh"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
          Start Fresh
        </button>
        <button
          onClick={onKeep}
          className="flex-1 md:flex-none px-4 py-2 bg-amber-500 text-neutral-950 hover:bg-amber-400 font-semibold rounded-md text-xs font-sans transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
          id="btn-keep-retrieved"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Keep Data
        </button>
      </div>
    </div>
  );
};
