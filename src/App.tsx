import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Cpu,
  BookOpen,
  ArrowRight,
  Lock,
  ChevronLeft,
  Settings,
  Grid,
  List,
  Sparkles,
  RotateCcw,
  Download,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Activity,
  FileText,
  Database,
  RefreshCw,
  Send,
  AlertCircle,
} from 'lucide-react';
import { SessionState, ConduitData } from './types';
import { calculateAllMetrics, generateDemoReadings } from './utils/calculations';
import { StateRecoveryBanner } from './components/StateRecoveryBanner';
import { ConduitColumn } from './components/ConduitColumn';
import { ExportModal } from './components/ExportModal';

const STORAGE_KEY = 'field_engineer_toolbox_session';

function getInitialSession(facility: 'QPL' | 'SBPL' = 'QPL'): SessionState {
  const conduitsCount = facility === 'QPL' ? 5 : 4;
  const size = facility === 'QPL' ? '20.5' : '24.0';

  const conduits: ConduitData[] = Array.from({ length: conduitsCount }).map((_, i) => ({
    id: i + 1,
    staticPressure: '',
    temperature: '',
    port1Readings: Array(12).fill(''),
    port2Readings: Array(12).fill(''),
  }));

  return {
    facility,
    millName: 'Mill A',
    conduitSize: size,
    barometricPressure: '29.60',
    ambientTemp: '82.4',
    pitotCoefficient: '0.94',
    conduits,
    startTime: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'sampling'>('dashboard');
  const [session, setSession] = useState<SessionState>(() => getInitialSession('QPL'));
  const [layoutMode, setLayoutMode] = useState<'tabbed' | 'grid'>('tabbed');
  const [activeConduitId, setActiveConduitId] = useState<number>(1);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Recovery States
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [recoveredData, setRecoveredData] = useState<SessionState | null>(null);

  // Neon Postgres Live Team Logging State
  const [teamLogs, setTeamLogs] = useState<{ content: string }[]>([]);
  const [newLogText, setNewLogText] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const fetchTeamLogs = async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const response = await fetch('/api/get-logs');
      if (!response.ok) {
        throw new Error(`Failed to load team logs: ${response.statusText}`);
      }
      const data = await response.json();
      setTeamLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setLogsError(err.message || 'Failed to sync with Neon Postgres.');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveTeamLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim()) return;

    setIsSavingLog(true);
    setLogsError(null);
    try {
      const response = await fetch('/api/save-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newLogText.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to submit log: ${response.statusText}`);
      }

      setNewLogText('');
      await fetchTeamLogs();
    } catch (err: any) {
      console.error('Error saving log:', err);
      setLogsError(err.message || 'Failed to write log to Neon Postgres.');
    } finally {
      setIsSavingLog(false);
    }
  };

  // Fetch logs on mount
  useEffect(() => {
    fetchTeamLogs();
  }, []);

  // Check for recovered data on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as SessionState;
        if (parsed && parsed.conduits && parsed.conduits.length > 0) {
          // If there's some actual data entered or updated
          setRecoveredData(parsed);
          setShowRecoveryBanner(true);
        }
      }
    } catch (e) {
      console.error('Failed to parse cached session:', e);
    }
  }, []);

  // Save session state to localStorage on modification
  const saveSession = (newSession: SessionState) => {
    setSession(newSession);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    } catch (e) {
      console.error('Failed to save session state:', e);
    }
  };

  // Facility-specific mill names
  const millOptions = useMemo(() => {
    if (session.facility === 'QPL') {
      return ['Mill A', 'Mill B', 'Mill C', 'Mill D', 'Mill E'];
    } else {
      return ['Mill A', 'Mill B', 'Mill C', 'Mill D', 'Mill E', 'Mill F'];
    }
  }, [session.facility]);

  // Handle facility switch
  const handleFacilityChange = (facility: 'QPL' | 'SBPL') => {
    const updated = getInitialSession(facility);
    updated.millName = facility === 'QPL' ? 'Mill A' : 'Mill A';
    setActiveConduitId(1);
    saveSession(updated);
  };

  // Handle generic parameters updates
  const handleParamChange = (key: keyof SessionState, value: string) => {
    const updated = {
      ...session,
      [key]: value,
      lastUpdated: new Date().toISOString(),
    };
    saveSession(updated);
  };

  // Handle update of a single conduit's state
  const handleUpdateConduit = (id: number, updatedFields: Partial<ConduitData>) => {
    const updatedConduits = session.conduits.map((c) => {
      if (c.id === id) {
        return { ...c, ...updatedFields };
      }
      return c;
    });

    const updated = {
      ...session,
      conduits: updatedConduits,
      lastUpdated: new Date().toISOString(),
    };
    saveSession(updated);
  };

  // Populate individual conduit demo values
  const handleFillDemoConduit = (id: number) => {
    const port1 = generateDemoReadings();
    const port2 = generateDemoReadings();
    const staticPres = (Math.random() * -3.0 - 0.5).toFixed(2); // Random static pressure like -1.82
    const temp = (120 + Math.random() * 40).toFixed(1); // Flue gas temp like 135.4 F

    handleUpdateConduit(id, {
      staticPressure: staticPres,
      temperature: temp,
      port1Readings: port1,
      port2Readings: port2,
    });
  };

  // Clear individual conduit
  const handleClearConduit = (id: number) => {
    handleUpdateConduit(id, {
      staticPressure: '',
      temperature: '',
      port1Readings: Array(12).fill(''),
      port2Readings: Array(12).fill(''),
    });
  };

  // Bulk populate all conduits
  const handleFillAllConduits = () => {
    const updatedConduits = session.conduits.map((c) => {
      const port1 = generateDemoReadings();
      const port2 = generateDemoReadings();
      const staticPres = (Math.random() * -3.0 - 0.5).toFixed(2);
      const temp = (120 + Math.random() * 40).toFixed(1);
      return {
        ...c,
        staticPressure: staticPres,
        temperature: temp,
        port1Readings: port1,
        port2Readings: port2,
      };
    });

    const updated = {
      ...session,
      conduits: updatedConduits,
      lastUpdated: new Date().toISOString(),
    };
    saveSession(updated);
  };

  // Bulk clear all conduits
  const handleClearAllConduits = () => {
    const updatedConduits = session.conduits.map((c) => ({
      ...c,
      staticPressure: '',
      temperature: '',
      port1Readings: Array(12).fill(''),
      port2Readings: Array(12).fill(''),
    }));

    const updated = {
      ...session,
      conduits: updatedConduits,
      lastUpdated: new Date().toISOString(),
    };
    saveSession(updated);
  };

  // Recovery Actions
  const handleKeepData = () => {
    if (recoveredData) {
      setSession(recoveredData);
      // If the recovered facility doesn't match active, active tab might be out of range
      if (recoveredData.conduits.length < activeConduitId) {
        setActiveConduitId(1);
      }
    }
    setShowRecoveryBanner(false);
  };

  const handleStartFresh = () => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = getInitialSession('QPL');
    setSession(fresh);
    setActiveConduitId(1);
    setShowRecoveryBanner(false);
  };

  // Calculate live results based on the current state
  const { conduitMetrics, summary } = useMemo(() => {
    return calculateAllMetrics(session);
  }, [session]);

  // Check if a conduit has any non-empty entered values (to show dot)
  const getConduitHasData = (conduit: ConduitData) => {
    const hasStatic = conduit.staticPressure.trim() !== '';
    const hasTemp = conduit.temperature.trim() !== '';
    const hasPort1 = conduit.port1Readings.some((r) => r.trim() !== '');
    const hasPort2 = conduit.port2Readings.some((r) => r.trim() !== '');
    return hasStatic || hasTemp || hasPort1 || hasPort2;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      
      {/* 1. Global Application Header */}
      <header className="border-b border-neutral-900 bg-neutral-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo / Left title */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg shadow-inner text-amber-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-mono font-bold text-base md:text-lg tracking-tight">
                  Field Engineer Toolbox System
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-800 border border-neutral-750 text-neutral-400 rounded">
                  v2.6 (JS)
                </span>
              </div>
              <p className="text-neutral-500 text-[10px] md:text-xs uppercase tracking-wider flex items-center gap-2 mt-0.5 font-mono">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Local Engines Active
                <span className="text-neutral-700">|</span>
                Operating in Offline Direct Repository Mode
              </p>
            </div>
          </div>

          {/* System status / Right elements */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950 border border-neutral-850/85 rounded-lg text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-subtle-pulse shadow-sm shadow-emerald-400/20"></span>
              <span className="text-neutral-400 uppercase">Local Cache Status:</span>
              <span className="text-emerald-400 font-semibold">Synced</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Recovery Banner placement */}
        {showRecoveryBanner && (
          <StateRecoveryBanner
            timestamp={recoveredData?.lastUpdated || new Date().toISOString()}
            onKeep={handleKeepData}
            onClear={handleStartFresh}
          />
        )}

        {/* 2. Unified Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Ambient Hero Card */}
            <div className="relative border border-neutral-900 bg-neutral-900/20 rounded-2xl p-6 md:p-8 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 z-10 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-mono rounded-full border border-amber-500/20">
                  <Activity className="h-3 w-3 animate-pulse" /> Thermal Plant Field Utility Suite
                </span>
                <h2 className="text-2xl md:text-3xl text-white font-sans font-semibold tracking-tight">
                  High-Precision Sampling & Diagnostic Tools
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Engineered specifically for heavy mechanical field specialists. This web-only suite resolves isokinetic flue sweeps, fluid dynamics, and head parameters with zero network latency.
                </p>
              </div>
              <div className="shrink-0 font-mono text-[11px] text-neutral-500 space-y-1.5 bg-neutral-950/60 p-4 border border-neutral-900 rounded-xl z-10 w-full md:w-auto">
                <div className="text-neutral-400 border-b border-neutral-900 pb-1.5 font-bold uppercase tracking-wider">System Hardware Info</div>
                <div>CPU CORE EMULATION: <span className="text-white">Active</span></div>
                <div>LOCAL DIRECT STORAGE: <span className="text-white">localStorage DB</span></div>
                <div>TARGET DIRECTORY: <span className="text-amber-400">/src/App.tsx</span></div>
              </div>
              {/* background vector accents */}
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/5 to-transparent pointer-events-none" />
            </div>

            {/* Modules Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
                Select Operational Module
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Active Module: Isokinetic Coal Sampling */}
                <div className="border border-amber-500/30 hover:border-amber-400/50 bg-neutral-900/60 hover:bg-neutral-900/90 rounded-xl p-5 flex flex-col justify-between gap-6 transition-all group shadow-lg shadow-amber-500/5">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                        <Flame className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 rounded-full font-semibold">
                        Ready
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-sans font-semibold text-base group-hover:text-amber-400 transition-colors">
                        Isokinetic Coal Sampling
                      </h4>
                      <p className="text-neutral-400 text-xs mt-1.5 leading-relaxed">
                        Calculate average square velocity heads (ASVH), flue densities, volume flow ratios, and mass flow rates with deviation mapping.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('sampling')}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all group-hover:translate-y-[-2px] shadow-sm shadow-amber-500/10"
                    id="btn-launch-coal"
                  >
                    Launch Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Locked Module: Pump A */}
                <div className="border border-neutral-900 bg-neutral-950/30 rounded-xl p-5 flex flex-col justify-between gap-6 opacity-65 relative overflow-hidden group">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 bg-neutral-900 border border-neutral-850 text-neutral-500 rounded-lg">
                        <Settings className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 text-neutral-500 border border-neutral-800 rounded-full">
                        Locked
                      </span>
                    </div>
                    <div>
                      <h4 className="text-neutral-400 font-sans font-semibold text-base">
                        Inspection of Pump A
                      </h4>
                      <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed">
                        Verify suction and discharge heads, compute net positive suction head (NPSH), and plot efficiency performance envelopes.
                      </p>
                    </div>
                  </div>
                  <div className="w-full py-2 bg-neutral-900 border border-neutral-850 text-neutral-500 text-xs rounded-lg flex items-center justify-center gap-1.5 font-mono cursor-not-allowed">
                    <Lock className="h-3.5 w-3.5" /> System Lock (v2.7)
                  </div>
                </div>

                {/* Locked Module: Pump B Sweeps */}
                <div className="border border-neutral-900 bg-neutral-950/30 rounded-xl p-5 flex flex-col justify-between gap-6 opacity-65 relative overflow-hidden group">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 bg-neutral-900 border border-neutral-850 text-neutral-500 rounded-lg">
                        <Layers className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 text-neutral-500 border border-neutral-800 rounded-full">
                        Locked
                      </span>
                    </div>
                    <div>
                      <h4 className="text-neutral-400 font-sans font-semibold text-base">
                        Boiler Feed Pump B Sweeps
                      </h4>
                      <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed">
                        Assess continuous multi-stage thermal pump metrics, vibration thresholds, and turbine sweep logs.
                      </p>
                    </div>
                  </div>
                  <div className="w-full py-2 bg-neutral-900 border border-neutral-850 text-neutral-500 text-xs rounded-lg flex items-center justify-center gap-1.5 font-mono cursor-not-allowed">
                    <Lock className="h-3.5 w-3.5" /> System Lock (v2.7)
                  </div>
                </div>

                {/* Locked Module: Condenser Air In-Leakage */}
                <div className="border border-neutral-900 bg-neutral-950/30 rounded-xl p-5 flex flex-col justify-between gap-6 opacity-65 relative overflow-hidden group">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 bg-neutral-900 border border-neutral-850 text-neutral-500 rounded-lg">
                        <Activity className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 text-neutral-500 border border-neutral-800 rounded-full">
                        Locked
                      </span>
                    </div>
                    <div>
                      <h4 className="text-neutral-400 font-sans font-semibold text-base">
                        Condenser Air In-Leakage
                      </h4>
                      <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed">
                        Audit vacuum decay times, compute mass leakage rates, and calculate efficiency drop impact from condenser fouling.
                      </p>
                    </div>
                  </div>
                  <div className="w-full py-2 bg-neutral-900 border border-neutral-850 text-neutral-500 text-xs rounded-lg flex items-center justify-center gap-1.5 font-mono cursor-not-allowed">
                    <Lock className="h-3.5 w-3.5" /> System Lock (v2.8)
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Tutorial Guidance */}
            <div className="p-6 bg-neutral-900 border border-neutral-850/80 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-amber-400" />
                <h3 className="text-white font-sans font-semibold text-sm">
                  Field Engineer Fast-Track Guide (Isokinetic Sampling)
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase">
                    <span className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[11px]">01</span>
                    Configure Parameters
                  </div>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Select your active site (QPL / SBPL) and Mill identifier. This automatically sizes the calculation array. Adjust conduit size, ambient temp, and barometric variables as required.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase">
                    <span className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[11px]">02</span>
                    Input Point Vectors
                  </div>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Type 12-point velocity head readouts directly for both Port 1 and Port 2. Use the <strong className="text-neutral-300 font-mono">Fill Demo Data</strong> action to instantly load pre-modeled, realistic physical values.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase">
                    <span className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[11px]">03</span>
                    Monitor and Dispatch
                  </div>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Check the real-time deviation indicators to find distribution discrepancies. Open the Export Modal to obtain your structured spreadsheet .CSV and launch pre-addressed emails.
                  </p>
                </div>
              </div>
            </div>

            {/* Neon Postgres Live Team Logging */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-neutral-900/60">
              {/* Left Form: Entry Form */}
              <div className="lg:col-span-1 bg-neutral-900 border border-neutral-850/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                    <Database className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-white font-sans font-semibold text-sm">
                      Log New Operation
                    </h3>
                    <p className="text-neutral-500 text-[11px] font-mono uppercase tracking-wider">
                      Neon DB Live Portal
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveTeamLog} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">
                      Operational Log Entry Text
                    </label>
                    <textarea
                      value={newLogText}
                      onChange={(e) => setNewLogText(e.target.value)}
                      placeholder="e.g. Swept Pitot calibration complete on Mill A, Conduit 1."
                      className="w-full h-24 bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-sans text-xs p-3 rounded-lg transition-colors resize-none placeholder-neutral-600"
                      disabled={isSavingLog}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingLog || !newLogText.trim()}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-amber-500/10"
                  >
                    {isSavingLog ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Logging Entry...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Dispatch to Neon DB
                      </>
                    )}
                  </button>
                </form>
                
                <p className="text-neutral-500 text-[10px] leading-relaxed">
                  Every entry is transmitted through secure Vercel Serverless proxy and stored immediately in a serverless Neon PostgreSQL cluster.
                </p>
              </div>

              {/* Right List: Synchronized Database Logs */}
              <div className="lg:col-span-2 bg-neutral-900 border border-neutral-850/80 rounded-2xl p-5 flex flex-col h-[320px]">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-amber-400" />
                    <div>
                      <h3 className="text-white font-sans font-semibold text-sm">
                        Synchronized Operations Log
                      </h3>
                      <p className="text-neutral-500 text-[11px] font-mono uppercase tracking-wider">
                        Recent 50 Entries (Live Database Sync)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status indicator */}
                    <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active
                    </div>
                    
                    <button
                      onClick={fetchTeamLogs}
                      disabled={isLoadingLogs}
                      className="p-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors"
                      title="Sync with database"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Logs Scroll List */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                  {logsError ? (
                    <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-2.5 text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="text-xs font-bold font-mono">Neon DB Sync Warn</div>
                        <p className="text-[11px] leading-normal text-neutral-400">
                          {logsError}
                        </p>
                        <button
                          onClick={fetchTeamLogs}
                          className="text-[10px] font-mono px-2 py-0.5 bg-red-900/20 hover:bg-red-900/30 border border-red-900/40 rounded text-red-300 font-bold transition-all mt-1"
                        >
                          Retry Sync
                        </button>
                      </div>
                    </div>
                  ) : isLoadingLogs && teamLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-2 py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
                      <span className="text-xs font-mono">Querying Postgres cluster...</span>
                    </div>
                  ) : teamLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 py-8 text-center space-y-2">
                      <Database className="h-7 w-7 text-neutral-700" />
                      <p className="text-xs font-mono max-w-sm">
                        No team log rows fetched. Submit a log entry on the left to append to Neon Postgres!
                      </p>
                    </div>
                  ) : (
                    teamLogs.map((log, index) => (
                      <div
                        key={index}
                        className="p-3 bg-neutral-950/60 border border-neutral-850/60 hover:border-neutral-800 rounded-xl flex items-start gap-3 transition-colors group"
                      >
                        <div className="p-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-md shrink-0 group-hover:text-amber-400 transition-colors">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs text-neutral-200 leading-relaxed font-sans break-words whitespace-pre-wrap">
                            {log.content}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-600">
                            <span>Index {teamLogs.length - index}</span>
                            <span>•</span>
                            <span className="text-neutral-500">Neon Postgres Managed Row</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Core Workspace View (Isokinetic Coal Sampling) */}
        {currentView === 'sampling' && (
          <div className="space-y-6 animate-fade-in">
            {/* Navigation back and quick actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="self-start inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 rounded-lg text-xs font-mono transition-colors"
                id="btn-back-to-dashboard"
              >
                <ChevronLeft className="h-4 w-4 text-amber-400" />
                Back to Dashboard
              </button>

              <div className="flex items-center gap-2 self-end">
                <button
                  onClick={handleFillAllConduits}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-amber-400 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
                  id="btn-fill-all-demo"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Fill All Demo Data
                </button>
                <button
                  onClick={handleClearAllConduits}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-red-400 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
                  id="btn-clear-all-data"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear All Data
                </button>
              </div>
            </div>

            {/* Header Parameters Card */}
            <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-6 space-y-6 shadow-xl shadow-black/30">
              <div className="border-b border-neutral-800/80 pb-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-white font-sans font-semibold text-lg flex items-center gap-2">
                    <Flame className="h-5 w-5 text-amber-400" />
                    Isokinetic Coal Sampling Configuration
                  </h3>
                  <p className="text-neutral-400 text-xs mt-0.5">
                    Configure active facility, mill identification, and system constants below to resolve live gas density models.
                  </p>
                </div>

                {/* Facility Button Group */}
                <div className="flex items-center gap-2 bg-neutral-950 p-1 border border-neutral-800/80 rounded-lg shrink-0">
                  <button
                    onClick={() => handleFacilityChange('QPL')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase transition-all ${
                      session.facility === 'QPL'
                        ? 'bg-amber-500 text-neutral-950 shadow-md'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                    }`}
                    id="btn-facility-qpl"
                  >
                    QPL Facility (5 Conduits)
                  </button>
                  <button
                    onClick={() => handleFacilityChange('SBPL')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase transition-all ${
                      session.facility === 'SBPL'
                        ? 'bg-amber-500 text-neutral-950 shadow-md'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                    }`}
                    id="btn-facility-sbpl"
                  >
                    SBPL Facility (4 Conduits)
                  </button>
                </div>
              </div>

              {/* Six Control Grid inputs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Mill Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    Mill Identifier
                  </label>
                  <select
                    value={session.millName}
                    onChange={(e) => handleParamChange('millName', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    id="select-mill-name"
                  >
                    {millOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conduit Size */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    Conduit Size (inches)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={session.conduitSize}
                    onChange={(e) => handleParamChange('conduitSize', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2 rounded-lg transition-colors text-right"
                    id="input-conduit-size"
                  />
                </div>

                {/* Barometric Pressure */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    Barometric P. (inHg)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={session.barometricPressure}
                    onChange={(e) => handleParamChange('barometricPressure', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2 rounded-lg transition-colors text-right"
                    id="input-barometric"
                  />
                </div>

                {/* Ambient Temp */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    Ambient Temp (°F)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={session.ambientTemp}
                    onChange={(e) => handleParamChange('ambientTemp', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2 rounded-lg transition-colors text-right"
                    id="input-ambient-temp"
                  />
                </div>

                {/* Pitot Coefficient */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    Pitot Coefficient (C)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={session.pitotCoefficient}
                    onChange={(e) => handleParamChange('pitotCoefficient', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2 rounded-lg transition-colors text-right"
                    id="input-pitot"
                  />
                </div>

                {/* Visual Indicators Summary Info */}
                <div className="bg-neutral-950 border border-neutral-850/80 rounded-lg p-2.5 flex flex-col justify-center text-[10px] font-mono text-neutral-500 leading-normal">
                  <div className="text-neutral-400 font-bold uppercase mb-0.5">Physical Constant fallback</div>
                  <div>Temp Fallback: <span className="text-amber-400 font-bold">{session.ambientTemp}°F</span></div>
                  <div>Area: <span className="text-white">
                    {(
                      (Math.PI * Math.pow((parseFloat(session.conduitSize) || 20.5) / 2, 2)) /
                      144
                    ).toFixed(3)} ft²
                  </span></div>
                </div>
              </div>
            </div>

            {/* Layout Toggle and Active Tabs for Conduits */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-850/90 rounded-2xl p-4">
              {/* Layout toggler */}
              <div className="flex items-center gap-2 bg-neutral-950 p-1 border border-neutral-800 rounded-lg">
                <button
                  onClick={() => setLayoutMode('tabbed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    layoutMode === 'tabbed'
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700/60'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  id="btn-layout-tabbed"
                >
                  <List className="h-3.5 w-3.5" />
                  Tabbed View
                </button>
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    layoutMode === 'grid'
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700/60'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  id="btn-layout-grid"
                >
                  <Grid className="h-3.5 w-3.5" />
                  Side-by-Side (Grid)
                </button>
              </div>

              {/* If in tabbed view: render horizontal tab buttons */}
              {layoutMode === 'tabbed' && (
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {session.conduits.map((c) => {
                    const hasData = getConduitHasData(c);
                    const isActive = activeConduitId === c.id;
                    const calculated = conduitMetrics.find((m) => m.id === c.id);
                    const isConduitWarn = calculated && calculated.hasValidReadings && Math.abs(summary.deviations[c.id] || 0) > 0.05;

                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveConduitId(c.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 border ${
                          isActive
                            ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-md'
                            : 'bg-neutral-950 text-neutral-400 hover:text-white border-neutral-800 hover:bg-neutral-900'
                        }`}
                        id={`tab-conduit-${c.id}`}
                      >
                        Conduit {c.id}
                        {hasData && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isConduitWarn
                                ? 'bg-red-500 shadow-sm shadow-red-500/40 animate-pulse'
                                : isActive
                                ? 'bg-neutral-950'
                                : 'bg-emerald-400 shadow-sm shadow-emerald-400/40'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Conduit Input Columns */}
            {layoutMode === 'tabbed' ? (
              // Tabbed View: Single selected conduit column
              <div className="max-w-md mx-auto w-full animate-fade-in">
                {session.conduits.map((c) => {
                  if (c.id !== activeConduitId) return null;
                  const calc = conduitMetrics.find((m) => m.id === c.id)!;
                  const dev = summary.deviations[c.id] || 0;

                  return (
                    <ConduitColumn
                      key={c.id}
                      conduit={c}
                      calculated={calc}
                      deviation={dev}
                      ambientTemp={session.ambientTemp}
                      onUpdateConduit={handleUpdateConduit}
                      onFillDemo={handleFillDemoConduit}
                      onClearConduit={handleClearConduit}
                    />
                  );
                })}
              </div>
            ) : (
              // Side-by-Side (Grid View)
              <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin">
                <div className="flex gap-6 min-w-[1200px] select-none">
                  {session.conduits.map((c) => {
                    const calc = conduitMetrics.find((m) => m.id === c.id)!;
                    const dev = summary.deviations[c.id] || 0;

                    return (
                      <div key={c.id} className="w-[300px] shrink-0 animate-fade-in">
                        <ConduitColumn
                          conduit={c}
                          calculated={calc}
                          deviation={dev}
                          ambientTemp={session.ambientTemp}
                          onUpdateConduit={handleUpdateConduit}
                          onFillDemo={handleFillDemoConduit}
                          onClearConduit={handleClearConduit}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary Metrics Board */}
            <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-6 space-y-6 shadow-xl shadow-black/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-850/70 pb-4 gap-4">
                <div>
                  <h3 className="text-white font-sans font-semibold text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    Consolidated Summary Metrics Board
                  </h3>
                  <p className="text-neutral-400 text-xs mt-0.5">
                    Continuous overall summaries and mass distributions resolved from active conduits.
                  </p>
                </div>

                <button
                  onClick={() => setIsExportOpen(true)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10"
                  id="btn-open-export-modal"
                >
                  <Download className="h-4 w-4" />
                  Export & Dispatch Report
                </button>
              </div>

              {/* KPI metrics row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Metric 1 */}
                <div className="p-4 bg-neutral-950/60 border border-neutral-850/80 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                    Total Mass Flow Rate
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl md:text-3xl font-mono font-bold text-white">
                      {summary.totalMassFlow.toFixed(3)}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">k lb/hr</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal">
                    Aggregate coal dust conveyance flow calculated across active test pipes.
                  </p>
                </div>

                {/* Metric 2 */}
                <div className="p-4 bg-neutral-950/60 border border-neutral-850/80 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                    Average Mass Flow Rate
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl md:text-3xl font-mono font-bold text-amber-400">
                      {summary.avgMassFlow.toFixed(3)}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">k lb/hr</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal">
                    Arithmetic mean flow rate distributed per individual conduit pipe (total {session.conduits.length}).
                  </p>
                </div>

                {/* Metric 3 */}
                <div className="p-4 bg-neutral-950/60 border border-neutral-850/80 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                    Average Air Velocity
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl md:text-3xl font-mono font-bold text-emerald-400">
                      {summary.avgVelocity.toFixed(0)}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">fpm</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal">
                    Average gas stream speed resolved from valid isokinetic Pitot-static sweep measurements.
                  </p>
                </div>

              </div>

              {/* Deviances Graph Section */}
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-white font-sans font-semibold text-sm">
                    Individual Conduit Mass Flow Deviations from Mean
                  </h4>
                  <p className="text-neutral-400 text-xs mt-0.5">
                    Imbalances exceeding <span className="text-red-400 font-bold">±5.0%</span> are highlighted with amber alerts to prevent localized fuel starvation or line clogging.
                  </p>
                </div>

                {/* Deviation grid visualization */}
                <div className="p-4 bg-neutral-950 border border-neutral-850/80 rounded-xl space-y-4">
                  {conduitMetrics.map((m) => {
                    const devVal = summary.deviations[m.id] || 0;
                    const devPctStr = (devVal * 100).toFixed(1);
                    const isExceeds = Math.abs(devVal) > 0.05 && m.hasValidReadings;
                    
                    // Left bias or right bias percentage widths
                    // Minimum boundary mapping to center (50% position)
                    const normalizedWidth = Math.min(50, Math.abs(devVal) * 100);

                    return (
                      <div key={m.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                        {/* Conduit Label */}
                        <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-2">
                          <span className="text-xs font-mono font-bold text-neutral-300">
                            Conduit {m.id}
                          </span>
                          {!m.hasValidReadings ? (
                            <span className="text-[10px] font-mono text-neutral-600">
                              (No Data)
                            </span>
                          ) : isExceeds ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-950/60 text-red-400 border border-red-900/40 rounded">
                              EXCEEDS
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 rounded">
                              BALANCED
                            </span>
                          )}
                        </div>

                        {/* Conduit Current flow rate */}
                        <div className="md:col-span-2 text-right text-xs font-mono text-neutral-400 md:pr-4">
                          {m.hasValidReadings ? `${m.massFlow.toFixed(3)} k lb/h` : '0.000'}
                        </div>

                        {/* Deviation range bar visualization */}
                        <div className="md:col-span-6 relative h-6 bg-neutral-900/60 border border-neutral-850 rounded-lg overflow-hidden flex items-center">
                          {/* Centered zero line */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-neutral-800 z-10" />

                          {/* -50% and +50% marker ticks */}
                          <div className="absolute left-[25%] top-0 bottom-0 w-[1px] bg-neutral-900/30 border-dashed" />
                          <div className="absolute left-[75%] top-0 bottom-0 w-[1px] bg-neutral-900/30 border-dashed" />

                          {m.hasValidReadings && (
                            <>
                              {devVal < 0 ? (
                                // Negative deviation: grow left from center
                                <div
                                  className={`absolute right-1/2 h-full transition-all duration-300 ${
                                    isExceeds
                                      ? 'bg-gradient-to-l from-red-500/20 to-red-500'
                                      : 'bg-gradient-to-l from-emerald-500/20 to-emerald-500'
                                  }`}
                                  style={{ width: `${normalizedWidth}%` }}
                                />
                              ) : (
                                // Positive deviation: grow right from center
                                <div
                                  className={`absolute left-1/2 h-full transition-all duration-300 ${
                                    isExceeds
                                      ? 'bg-gradient-to-r from-red-500/20 to-red-500'
                                      : 'bg-gradient-to-r from-emerald-500/20 to-emerald-500'
                                  }`}
                                  style={{ width: `${normalizedWidth}%` }}
                                />
                              )}
                            </>
                          )}

                          {/* Overlaying dynamic percentage label inside */}
                          <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none text-[10px] font-mono z-20">
                            <span className="text-neutral-600">-50%</span>
                            <span className="text-neutral-600">0%</span>
                            <span className="text-neutral-600">+50%</span>
                          </div>
                        </div>

                        {/* Numeric deviation readout */}
                        <div className="md:col-span-2 text-right font-mono text-xs font-semibold">
                          {m.hasValidReadings ? (
                            <span className={isExceeds ? 'text-red-400' : 'text-emerald-400'}>
                              {devVal >= 0 ? '+' : ''}
                              {devPctStr}%
                            </span>
                          ) : (
                            <span className="text-neutral-600">0.0%</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 4. Global Footer with Offline Indicator details */}
      <footer className="border-t border-neutral-900 bg-neutral-950 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div>
            &copy; 2026 Thermal Engineering Field Services Group. All calculations comply with ASME PTC 4.2 Coal Sampling standards.
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              SECURE STANDALONE CONTAINER
            </span>
          </div>
        </div>
      </footer>

      {/* 5. Export Report Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        session={session}
        conduitMetrics={conduitMetrics}
        summary={summary}
      />
    </div>
  );
}
