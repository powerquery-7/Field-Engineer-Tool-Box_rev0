import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Send, AlertTriangle, User, Briefcase, FileText, Check } from 'lucide-react';

interface NeonSaveWidgetProps {
  moduleName: string;
  moduleData: any;
  teamLogs: { id: number; content: string }[];
  onSaveSuccess: () => Promise<void>;
}

export function NeonSaveWidget({
  moduleName,
  moduleData,
  teamLogs,
  onSaveSuccess,
}: NeonSaveWidgetProps) {
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('neo_operator_name') || '');
  const [role, setRole] = useState(() => localStorage.getItem('neo_operator_role') || 'Field Operations');
  const [badge, setBadge] = useState(() => localStorage.getItem('neo_operator_badge') || '');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [conflictAction, setConflictAction] = useState<'overwrite' | 'additional'>('additional');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Save profile to localStorage for convenient autofill
  useEffect(() => {
    localStorage.setItem('neo_operator_name', operatorName);
    localStorage.setItem('neo_operator_role', role);
    localStorage.setItem('neo_operator_badge', badge);
  }, [operatorName, role, badge]);

  const getTodayString = () => {
    const localDate = new Date();
    return `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  };

  const safeParseLog = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data && typeof data === 'object' && 'user' in data) {
        return data;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const findConflict = () => {
    if (!operatorName.trim()) return null;
    const todayStr = getTodayString();
    
    for (const log of teamLogs) {
      const parsed = safeParseLog(log.content);
      if (parsed) {
        if (
          parsed.user.trim().toLowerCase() === operatorName.trim().toLowerCase() &&
          parsed.module === moduleName &&
          parsed.dateString === todayStr
        ) {
          return { id: log.id, parsed };
        }
      }
    }
    return null;
  };

  const conflict = findConflict();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim() || !title.trim() || !description.trim()) {
      setError('Please complete all required fields (Operator Name, Title, and Description).');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const payloadText = `[${moduleName}] Title: ${title.trim()}\nDesc: ${description.trim()}\nParameters: ${JSON.stringify(moduleData)}`;

    const payload = {
      user: operatorName.trim(),
      role: role,
      badge: badge.trim() || undefined,
      module: moduleName,
      title: title.trim(),
      description: description.trim(),
      text: payloadText,
      timestamp: new Date().toISOString(),
      dateString: getTodayString(),
      data: moduleData
    };

    try {
      const response = await fetch('/api/save-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: JSON.stringify(payload),
          idToOverwrite: (conflict && conflictAction === 'overwrite') ? conflict.id : undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save: ${response.statusText}`);
      }

      setSuccess(true);
      setTitle('');
      setDescription('');
      setConflictAction('additional');
      await onSaveSuccess();
      
      // Auto-hide success state after 4 seconds
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while saving to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-850/90 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-white font-sans font-semibold text-sm">Save Module State</h4>
            <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-wider">
              Neon Serverless Database
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-neutral-950 px-2.5 py-0.5 rounded border border-neutral-800 text-neutral-400 uppercase">
          {moduleName}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-3.5">
        {error && (
          <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs font-mono leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs font-sans font-bold flex items-center gap-2 animate-fade-in">
            <Check className="h-4 w-4 text-emerald-400" />
            Module state committed to Neon DB successfully!
          </div>
        )}

        {/* Profile Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
              Operator Name <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-600" />
              <input
                type="text"
                required
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-sans text-xs pl-8 pr-3 py-2 rounded-lg transition-colors placeholder-neutral-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
              Department / Role
            </label>
            <div className="relative">
              <Briefcase className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-600" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-sans text-xs pl-8 pr-3 py-2 rounded-lg transition-colors cursor-pointer appearance-none"
              >
                <option value="Field Operations">Field Operations</option>
                <option value="Calibration Lab">Calibration Lab</option>
                <option value="Maintenance Shift">Maintenance Shift</option>
                <option value="Audit & Compliance">Audit & Compliance</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
              Work Title <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-600" />
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Calibration Test Run 1"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-sans text-xs pl-8 pr-3 py-2 rounded-lg transition-colors placeholder-neutral-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
              Identifier Badge (Optional)
            </label>
            <input
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="e.g. FE-092"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-mono text-xs px-3 py-2 rounded-lg transition-colors placeholder-neutral-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
            Work Description / Comments <span className="text-amber-500">*</span>
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Calibrated the Pitot tubes inside conduit A. No deviations observed."
            className="w-full h-20 bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 outline-none text-neutral-200 font-sans text-xs p-3 rounded-lg transition-colors resize-none placeholder-neutral-700"
          />
        </div>

        {/* Conflict Detection UI */}
        {conflict && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2.5 animate-fade-in">
            <div className="flex items-start gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold font-mono uppercase">Duplicate Entry Alert</div>
                <p className="text-[10px] leading-relaxed text-neutral-300">
                  You already submitted a database log for <strong className="text-amber-300">{moduleName}</strong> today. Select your strategy:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConflictAction('overwrite')}
                className={`py-1.5 px-3 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                  conflictAction === 'overwrite'
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Overwrite Previous
              </button>
              <button
                type="button"
                onClick={() => setConflictAction('additional')}
                className={`py-1.5 px-3 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                  conflictAction === 'additional'
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Save as Additional
              </button>
            </div>
            <p className="text-[9px] text-neutral-500 font-mono text-center">
              {conflictAction === 'overwrite' 
                ? 'Will REPLACE your earlier record in the database.' 
                : 'Will CREATE a brand new, separate entry.'}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving || !operatorName.trim() || !title.trim() || !description.trim()}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Saving to Neon Database...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Save State to Database
            </>
          )}
        </button>
      </form>
    </div>
  );
}
