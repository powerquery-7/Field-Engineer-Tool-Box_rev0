import { ConduitData, CalculatedConduitMetrics, SummaryMetrics, SessionState } from '../types';

export function calculateConduit(
  conduit: ConduitData,
  globalParams: {
    conduitSize: number;
    barometricPressure: number;
    ambientTemp: number;
    pitotCoefficient: number;
  }
): CalculatedConduitMetrics {
  // 1. Gather all valid readings from Port 1 and Port 2
  const allReadings = [...conduit.port1Readings, ...conduit.port2Readings];
  const validReadings: number[] = [];

  for (const r of allReadings) {
    if (r.trim() !== '') {
      const val = parseFloat(r);
      if (!isNaN(val) && val !== 0) {
        validReadings.push(val);
      }
    }
  }

  const count = validReadings.length;
  const hasValidReadings = count > 0;

  // 2. ASVH
  let asvh = 0;
  if (hasValidReadings) {
    const sumSquares = validReadings.reduce((sum, val) => sum + val * val, 0);
    asvh = sumSquares / count;
  }

  // 3. DP
  const dp = 1.573 * (asvh * asvh) * (globalParams.pitotCoefficient * globalParams.pitotCoefficient);

  // 4. Density
  const parsedStatic = parseFloat(conduit.staticPressure);
  const pStatic = isNaN(parsedStatic) ? 0 : parsedStatic;

  const parsedTemp = parseFloat(conduit.temperature);
  const tF = isNaN(parsedTemp) ? globalParams.ambientTemp : parsedTemp;

  // Density formula: 530 / (460 + T_F) * (29.92 + P_static / 13.6) / 29.92 * 0.075
  const tempFactor = 530 / (460 + tF);
  const pressFactor = (29.92 + pStatic / 13.6) / 29.92;
  const density = tempFactor * pressFactor * 0.075;

  // 5. Area
  const radius = globalParams.conduitSize / 2;
  const areaSqIn = Math.PI * radius * radius;
  const areaSqFt = areaSqIn / 144;

  // 6. Avg Velocity
  let avgVelocity = 0;
  if (density > 0 && hasValidReadings) {
    avgVelocity = ((1096 * asvh) / Math.sqrt(density)) * globalParams.pitotCoefficient;
  }

  // 7. Vol Flow
  const volFlow = avgVelocity * areaSqFt;

  // 8. Mass Flow
  const massFlow = (volFlow * density * 60) / 1000;

  return {
    id: conduit.id,
    asvh,
    dp,
    density,
    areaSqFt,
    avgVelocity,
    volFlow,
    massFlow,
    hasValidReadings,
  };
}

export function calculateAllMetrics(session: SessionState): {
  conduitMetrics: CalculatedConduitMetrics[];
  summary: SummaryMetrics;
} {
  const size = parseFloat(session.conduitSize) || (session.facility === 'QPL' ? 20.5 : 24);
  const baro = parseFloat(session.barometricPressure) || 29.6;
  const ambient = parseFloat(session.ambientTemp) || 82.4;
  const pitot = parseFloat(session.pitotCoefficient) || 0.94;

  const globalParams = {
    conduitSize: size,
    barometricPressure: baro,
    ambientTemp: ambient,
    pitotCoefficient: pitot,
  };

  const conduitMetrics = session.conduits.map((c) => calculateConduit(c, globalParams));

  // Filter active conduits (conduits with some valid entries, or all of them depending on calculation rules)
  // Let's compute average based on conduits that have readings, or all conduits if they're configured.
  // The user says "Total Mass Flow Rate of all active conduits. Average Mass Flow Rate across all conduits. Average Air Velocity across all conduits."
  // Wait, "active conduits" are those that have valid readings. "All conduits" means the total conduits of the facility (4 or 5).
  // Let's calculate:
  const activeMetrics = conduitMetrics.filter((m) => m.hasValidReadings);
  
  const totalMassFlow = activeMetrics.reduce((sum, m) => sum + m.massFlow, 0);
  
  // "Average Mass Flow Rate across all conduits" or across active ones?
  // Let's calculate across all conduits configured for the facility (e.g. 5 or 4) as the denominator,
  // or active ones if the user specified that. The prompt says: "Average Mass Flow Rate (k lb/hr) across all conduits."
  // Let's use the total number of conduits in the facility (conduitMetrics.length) as the divisor,
  // but if total is 0, then 0. Let's make it clear.
  const totalConduitsCount = conduitMetrics.length || 1;
  const avgMassFlow = totalMassFlow / totalConduitsCount;

  const totalVelocityActive = activeMetrics.reduce((sum, m) => sum + m.avgVelocity, 0);
  const avgVelocity = activeMetrics.length > 0 ? totalVelocityActive / activeMetrics.length : 0;

  const deviations: { [key: number]: number } = {};
  conduitMetrics.forEach((m) => {
    if (avgMassFlow > 0) {
      // Deviation_i = (AverageMassFlow - MassFlow_i) / AverageMassFlow
      deviations[m.id] = (avgMassFlow - m.massFlow) / avgMassFlow;
    } else {
      deviations[m.id] = 0;
    }
  });

  return {
    conduitMetrics,
    summary: {
      totalMassFlow,
      avgMassFlow,
      avgVelocity,
      deviations,
    },
  };
}

export function generateDemoReadings(): string[] {
  const readings: string[] = [];
  for (let i = 0; i < 12; i++) {
    // Random realistic field readings ranging between 0.150 and 0.450
    const val = 0.150 + Math.random() * 0.300;
    readings.push(val.toFixed(3));
  }
  return readings;
}
