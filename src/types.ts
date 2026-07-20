export interface ConduitData {
  id: number; // 1 to N
  staticPressure: string; // string to support raw input typing smoothly without losing decimal/minus signs
  temperature: string;    // string to support raw input typing
  port1Readings: string[]; // 12 values
  port2Readings: string[]; // 12 values
}

export interface SessionState {
  facility: 'QPL' | 'SBPL';
  millName: string;
  conduitSize: string;
  barometricPressure: string;
  ambientTemp: string;
  pitotCoefficient: string;
  conduits: ConduitData[];
  startTime: string;
  lastUpdated: string;
}

export interface CalculatedConduitMetrics {
  id: number;
  asvh: number;
  dp: number;
  density: number;
  areaSqFt: number;
  avgVelocity: number;
  volFlow: number;
  massFlow: number;
  hasValidReadings: boolean;
}

export interface SummaryMetrics {
  totalMassFlow: number;
  avgMassFlow: number;
  avgVelocity: number;
  deviations: { [key: number]: number }; // conduit ID -> deviation ratio
}
