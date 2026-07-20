import React, { useMemo } from 'react';
import { X, Download, Mail, Copy, Check, ExternalLink } from 'lucide-react';
import { SessionState, CalculatedConduitMetrics, SummaryMetrics } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionState;
  conduitMetrics: CalculatedConduitMetrics[];
  summary: SummaryMetrics;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  session,
  conduitMetrics,
  summary,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Generate Date stamp
  const dateStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const formattedDateTime = useMemo(() => {
    return new Date().toLocaleString();
  }, []);

  // 1. Generate CSV Data
  const csvContent = useMemo(() => {
    const rows: string[][] = [];

    // Header Metadata
    rows.push(['FIELD ENGINEER COAL SAMPLING REPORT']);
    rows.push(['Generated At', formattedDateTime]);
    rows.push(['Facility', session.facility]);
    rows.push(['Mill Name', session.millName]);
    rows.push(['Conduit Size (in)', session.conduitSize]);
    rows.push(['Barometric Pressure (inHg)', session.barometricPressure]);
    rows.push(['Ambient Temp (°F)', session.ambientTemp]);
    rows.push(['Pitot Coefficient', session.pitotCoefficient]);
    rows.push([]);

    // Summary Totals
    rows.push(['SUMMARY TOTALS']);
    rows.push(['Total Mass Flow Rate (k lb/hr)', summary.totalMassFlow.toFixed(3)]);
    rows.push(['Average Mass Flow Rate (k lb/hr)', summary.avgMassFlow.toFixed(3)]);
    rows.push(['Average Air Velocity (fpm)', summary.avgVelocity.toFixed(1)]);
    rows.push([]);

    // Conduit Level Headers
    const conduitHeaders = [
      'Metric / Port Point',
      ...session.conduits.map((c) => `Conduit ${c.id}`),
    ];
    rows.push(conduitHeaders);

    // Static Pressure
    rows.push([
      'Static Pressure (inWC)',
      ...session.conduits.map((c) => c.staticPressure || '0'),
    ]);

    // Temp
    rows.push([
      'Conduit Gas Temp (°F)',
      ...session.conduits.map((c) => c.temperature || session.ambientTemp),
    ]);

    // ASVH
    rows.push([
      'ASVH (Average Sq Velocity Head)',
      ...conduitMetrics.map((m) => (m.hasValidReadings ? m.asvh.toFixed(4) : 'N/A')),
    ]);

    // DP
    rows.push([
      'DP (Differential Pressure, inWC)',
      ...conduitMetrics.map((m) => (m.hasValidReadings ? m.dp.toFixed(4) : 'N/A')),
    ]);

    // Density
    rows.push([
      'Flue Gas Density (lb/ft3)',
      ...conduitMetrics.map((m) => (m.hasValidReadings ? m.density.toFixed(4) : 'N/A')),
    ]);

    // Avg Velocity
    rows.push([
      'Avg Air Velocity (fpm)',
      ...conduitMetrics.map((m) => (m.hasValidReadings ? m.avgVelocity.toFixed(1) : '0')),
    ]);

    // Vol Flow
    rows.push([
      'Vol Flow Rate (acfm)',
      ...conduitMetrics.map((m) => (m.hasValidReadings ? m.volFlow.toFixed(1) : '0')),
    ]);

    // Mass Flow
    rows.push([
      'Mass Flow Rate (k lb/hr)',
      ...conduitMetrics.map((m) => (m.hasValidReadings ? m.massFlow.toFixed(3) : '0')),
    ]);

    // Deviation
    rows.push([
      'Deviation from Mean (%)',
      ...conduitMetrics.map((m) => {
        const dev = summary.deviations[m.id];
        return m.hasValidReadings && dev !== undefined ? `${(dev * 100).toFixed(1)}%` : '0%';
      }),
    ]);

    rows.push([]);
    rows.push(['PORT READINGS MATRIX']);

    // Port 1 readings (1 to 12)
    for (let point = 1; point <= 12; point++) {
      const row = [
        `Port 1 Point ${point}`,
        ...session.conduits.map((c) => c.port1Readings[point - 1] || ''),
      ];
      rows.push(row);
    }

    // Port 2 readings (1 to 12)
    for (let point = 1; point <= 12; point++) {
      const row = [
        `Port 2 Point ${point}`,
        ...session.conduits.map((c) => c.port2Readings[point - 1] || ''),
      ];
      rows.push(row);
    }

    // Convert to CSV string
    return rows
      .map((r) =>
        r
          .map((val) => {
            const escaped = val.replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
              ? `"${escaped}"`
              : escaped;
          })
          .join(',')
      )
      .join('\n');
  }, [session, conduitMetrics, summary, formattedDateTime]);

  // Download CSV trigger
  const handleDownloadCSV = () => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `coal_sampling_report_${session.facility}_${session.millName || 'Mill'}_${dateStr}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compile Plaintext Report Summary for Email Dispatch
  const emailBody = useMemo(() => {
    let body = `FIELD ENGINEER COAL SAMPLING REPORT SUMMARY\n`;
    body += `==========================================\n`;
    body += `Facility: ${session.facility} Facility\n`;
    body += `Mill Name: ${session.millName || 'N/A'}\n`;
    body += `Dispatch Date/Time: ${formattedDateTime}\n\n`;

    body += `GLOBAL PARAMETERS:\n`;
    body += `- Conduit Size: ${session.conduitSize} in\n`;
    body += `- Barometric Pressure: ${session.barometricPressure} inHg\n`;
    body += `- Ambient Temp: ${session.ambientTemp} °F\n`;
    body += `- Pitot Coefficient: ${session.pitotCoefficient}\n\n`;

    body += `SUMMARY METRICS:\n`;
    body += `- Total Mass Flow Rate: ${summary.totalMassFlow.toFixed(3)} k lb/hr\n`;
    body += `- Average Mass Flow Rate: ${summary.avgMassFlow.toFixed(3)} k lb/hr\n`;
    body += `- Average Air Velocity: ${summary.avgVelocity.toFixed(1)} fpm\n\n`;

    body += `CONDUIT BREAKDOWN:\n`;
    conduitMetrics.forEach((m) => {
      const cData = session.conduits.find((c) => c.id === m.id);
      const dev = summary.deviations[m.id];
      const devPct = dev !== undefined ? (dev * 100).toFixed(1) : '0';
      const isWarn = Math.abs(dev || 0) > 0.05;

      body += `Conduit ${m.id}:\n`;
      if (!m.hasValidReadings) {
        body += `  - STATUS: INACTIVE (No measurements recorded)\n\n`;
        return;
      }
      body += `  - Static Pressure: ${cData?.staticPressure || '0'} inWC\n`;
      body += `  - Flue Gas Temp: ${cData?.temperature || session.ambientTemp} °F\n`;
      body += `  - DP (Calculated): ${m.dp.toFixed(4)} inWC\n`;
      body += `  - Flue Gas Density: ${m.density.toFixed(4)} lb/ft3\n`;
      body += `  - Avg Air Velocity: ${m.avgVelocity.toFixed(1)} fpm\n`;
      body += `  - Mass Flow Rate: ${m.massFlow.toFixed(3)} k lb/hr\n`;
      body += `  - Deviation from Mean: ${devPct}% ${isWarn ? '⚠️ EXCEEDS DEVIANCE LIMIT (>5%)' : '(Normal)'}\n\n`;
    });

    body += `INSTRUCTIONS TO RECEIVER:\n`;
    body += `1. An official detailed CSV data sheet has been downloaded locally by the sender.\n`;
    body += `2. Please request the sender to attach 'coal_sampling_report_${session.facility}_${session.millName || 'Mill'}_${dateStr}.csv' if not already done.\n`;
    body += `\nSent via Field Engineer Toolbox System.`;

    return body;
  }, [session, conduitMetrics, summary, formattedDateTime, dateStr]);

  const subject = `Coal Sampling Field Report - ${session.facility} [${session.millName || 'Mill'}] - ${dateStr}`;

  // Copy Plaintext summary to Clipboard
  const handleCopySummary = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dispatch Targets
  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  const outlookLink = `https://outlook.live.com/default.aspx?rru=compose&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        id="export-modal-container"
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl shadow-black/80"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-amber-400" />
            <h3 className="text-white font-sans font-semibold text-lg">
              Export and Dispatch Report
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Download CSV */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-sans font-medium text-neutral-300">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs border border-amber-500/20 font-mono">1</span>
              <span>Primary Data Export</span>
            </div>
            <p className="text-neutral-400 text-xs pl-7 leading-relaxed">
              Export the raw 12-point velocity grid matrix, global barometric readings, flue density profiles, and computed deviations in standard CSV layout.
            </p>
            <div className="pl-7">
              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-lg text-sm transition-all shadow-md shadow-amber-500/5"
                id="btn-download-csv"
              >
                <Download className="h-4 w-4" />
                Download Report (.CSV)
              </button>
            </div>
          </div>

          <div className="border-t border-neutral-800/85"></div>

          {/* Step 2: Email Dispatcher */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-sans font-medium text-neutral-300">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs border border-amber-500/20 font-mono">2</span>
              <span>Structured Email Dispatch</span>
            </div>
            <p className="text-neutral-400 text-xs pl-7 leading-relaxed">
              Select an email endpoint to open a pre-formatted draft with all consolidated averages, individual velocities, and deviances. Drag-and-drop your downloaded CSV file directly into your draft!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-7">
              <a
                href={gmailLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 hover:text-white transition-all text-center"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Gmail Webmail
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
              <a
                href={outlookLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 hover:text-white transition-all text-center"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Outlook Web
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
              <a
                href={mailtoLink}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 hover:text-white transition-all text-center"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Client
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            </div>
          </div>

          <div className="border-t border-neutral-800/85"></div>

          {/* Quick Copy Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-7">
              <span className="text-xs font-sans font-medium text-neutral-400">Plaintext Summary Preview</span>
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded text-[11px] font-mono transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Copy Summary'}
              </button>
            </div>
            <div className="pl-7">
              <pre className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg text-[10px] font-mono text-neutral-400 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                {emailBody}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-neutral-950/40 border-t border-neutral-800/60">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg text-xs font-mono transition-colors"
          >
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
