
import { eachDayOfInterval, formatISO, isBefore, parseISO, differenceInDays, max as dateMax } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export const MACHINES = [
  { id: 'laader', name: 'Laader' },
  { id: 'looper', name: 'Looper' },
  { id: 'mesa_elevadora', name: 'Mesa Elevadora' },
  { id: 'puente_grua', name: 'Puente Grúa' },
  { id: 't8', name: 'T8' },
] as const;

export type MachineId = typeof MACHINES[number]['id'];
export type Component = { id: string; name: string };

export const COMPONENTS: Record<MachineId, Component[]> = {
  laader: [{ id: 'motor_mixer', name: 'Motor Mixer' }],
  looper: [
    { id: 'motor_banda_looper', name: 'Motor Banda Looper' },
    { id: 'motor_cuchilla_looper', name: 'Motor Cuchilla Looper' },
  ],
  mesa_elevadora: [
    { id: 'motor_elevacion_derecha', name: 'Motor Elevación Derecha' },
    { id: 'motor_traslacion_der_izq', name: 'Motor Traslación Der/Izq' },
  ],
  puente_grua: [
    { id: 'motor_elevacion_derecha', name: 'Motor Elevación Derecha' },
    { id: 'motor_elevacion_izquierdo', name: 'Motor Elevación Izquierdo' },
    { id: 'motor_traslacion_der_izq', name: 'Motor Traslación Der/Izq' },
  ],
  t8: [
    { id: 'motor_cuchilla_t8', name: 'Motor Cuchilla T8' },
    { id: 'motor_traslacion_t8', name: 'Motor Traslación T8' },
  ],
};

export type ChartDataPoint = {
  date: string;
  isProjection: boolean;
  componentId: string;
  metric: 'current' | 'unbalance' | 'load_factor';
  realValue: number | null;
  minValue: number | null;
  maxValue: number | null;
  
  "Corriente Promedio Suavizado"?: number | null;
  "Corriente Máxima"?: number;
  "Referencia Corriente Promedio Suavizado"?: number;
  
  "Desbalance Suavizado"?: number | null;
  "Umbral Desbalance"?: number;
  "Referencia Desbalance Suavizado"?: number;
  
  "Factor De Carga Suavizado"?: number | null;
  "Umbral Factor Carga"?: number;
  "Referencia Factor De Carga Suavizado"?: number;

  aprilBaseline: number | null;
  predictedValue: number | null;
};

// Generates data using a Random Walk model.
const generateRandomWalk = (size: number, base: number, volatility: number, min: number, max: number, jitter: number) => {
  const series: { realValue: number; minValue: number; maxValue: number }[] = [];
  let lastValue = base;

  for (let i = 0; i < size; i++) {
    // The "walk" is the previous value plus a random change.
    const change = (Math.random() - 0.5) * volatility;
    let newValue = lastValue + change;

    // Clamp the value within the min/max physical limits.
    newValue = Math.max(min, Math.min(max, newValue));
    
    // Add some random jitter for the final "real" value to make it look noisy.
    const finalValue = newValue + (Math.random() - 0.5) * jitter;
    
    // Calculate a daily fluctuation range based on the final value.
    const rangeVolatility = finalValue > 1 ? 0.1 : 0.05;
    let minValue = finalValue * (1 - (Math.random() * rangeVolatility));
    let maxValue = finalValue * (1 + (Math.random() * rangeVolatility * 2));
    
    // Ensure the range doesn't exceed the absolute min/max.
    minValue = Math.max(min, minValue);
    maxValue = Math.min(max, maxValue);

    series.push({
      realValue: parseFloat(finalValue.toFixed(3)),
      minValue: parseFloat(minValue.toFixed(3)),
      maxValue: parseFloat(maxValue.toFixed(3)),
    });

    // The next step in the walk starts from the current value.
    lastValue = newValue;
  }
  return series;
};

// Calculates a projection using simple linear regression on the last 30 data points.
const generateProjection = (historicalData: { realValue: number }[], projectionLength: number) => {
  const series = historicalData.map(p => p.realValue).filter(v => v !== null) as number[];
  
  if (series.length < 2) {
    const lastVal = series.length > 0 ? series[series.length-1] : 0;
    return Array(projectionLength).fill(lastVal);
  }

  // Use the last 30 points for the trend calculation.
  const history = series.slice(-30);
  const n = history.length;

  if (n < 2) {
    const lastVal = n > 0 ? history[n-1] : 0;
    return Array(projectionLength).fill(lastVal);
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += history[i];
    sumXY += i * history[i];
    sumXX += i * i;
  }

  // Calculate slope (m) and intercept (b) for y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;
  
  const projection: number[] = [];
  
  for (let i = 0; i < projectionLength; i++) {
    // Project the next value based on the linear trend.
    let predicted = slope * (n + i) + intercept;
    
    // Add some random noise to make the projection look less perfect.
    const noiseScale = predicted > 1 ? 0.05 : 0.008; 
    const noise = (Math.random() - 0.5) * (predicted * noiseScale);
    predicted += noise;
    
    // Physical constraint: value cannot be negative.
    predicted = Math.max(0, predicted);

    projection.push(parseFloat(predicted.toFixed(3)));
  }

  return projection;
};


// Configuration for each metric based on senior data engineer's input.
const getMetricConfig = (metric: 'current' | 'unbalance' | 'load_factor') => {
    switch (metric) {
        case 'current':
            return { base: 3.75, volatility: 5.0, min: 2.0, max: 15.0, limit: 13.0, ref: 8.0, jitter: 0.5 };
        case 'unbalance':
            return { base: 0.11, volatility: 0.06, min: 0.05, max: 0.55, limit: 0.50, ref: 0.35, jitter: 0.01 };
        case 'load_factor':
            return { base: 0.33, volatility: 0.12, min: 0.1, max: 0.9, limit: 0.85, ref: 0.6, jitter: 0.03 };
    }
}

export function useMaintenanceData(machineId: MachineId, dateRange: DateRange, simulatedToday: Date) {
  const minDataDate = new Date('2025-04-10T00:00:00Z');
  
  if (!dateRange.from || !dateRange.to) {
    return { data: [], aprilData: [] };
  }
  
  const correctedFrom = dateMax([dateRange.from, minDataDate]);
  
  const allDays = eachDayOfInterval({ start: correctedFrom, end: dateRange.to });
  const machineComponents = COMPONENTS[machineId];
  const allMetrics: ('current' | 'unbalance' | 'load_factor')[] = ['current', 'unbalance', 'load_factor'];
  
  const aprilStartDate = new Date('2025-04-10T00:00:00Z');
  const aprilEndDate = new Date('2025-04-30T00:00:00Z');
  const aprilDays = eachDayOfInterval({ start: aprilStartDate, end: aprilEndDate });

  const aprilDataStore: Record<string, Record<string, number[]>> = {};

  machineComponents.forEach((component) => {
    aprilDataStore[component.id] = {};
    allMetrics.forEach(metric => {
        const config = getMetricConfig(metric);
        // We use a seeded random generator for the April baseline so it's consistent.
        const seed = machineId.length + component.id.length + metric.length;
        const createSeededRandom = (seed: number) => () => {
            let t = (seed += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const random = createSeededRandom(seed);
        
        const aprilWalk = Array.from({ length: aprilDays.length }, () => {
             const base = config.base * 0.9;
             const volatility = config.volatility * 0.8;
             let val = base + (random() - 0.5) * volatility;
             return Math.max(config.min, Math.min(config.max, val));
        });
        aprilDataStore[component.id][metric] = aprilWalk;
    });
  });

  let data: ChartDataPoint[] = [];
  
  machineComponents.forEach((component) => {
    allMetrics.forEach(metric => {
        const config = getMetricConfig(metric);
        
        const historicalDaysCount = Math.max(0, differenceInDays(simulatedToday, correctedFrom) + 1);
        const projectionLength = Math.max(0, allDays.length - historicalDaysCount);

        // The main random walk now uses Math.random() for dynamic refresh effect.
        const fullHistoricalWalk = generateRandomWalk(historicalDaysCount, config.base, config.volatility, config.min, config.max, config.jitter);
        const projectionWalk = generateProjection(fullHistoricalWalk, projectionLength);
        
        const aprilPatternData = aprilDataStore[component.id]?.[metric] ?? [];

        allDays.forEach((day, index) => {
            const isProjection = isBefore(simulatedToday, day);
            const walkPoint = fullHistoricalWalk[index];

            const realValue = !isProjection ? walkPoint?.realValue : null;
            const minValue = !isProjection ? walkPoint?.minValue : null;
            const maxValue = !isProjection ? walkPoint?.maxValue : null;
            const predictedValue = isProjection ? projectionWalk[index - historicalDaysCount] : null;
            
            // Cyclical mapping for the April baseline.
            const aprilBaseline = aprilPatternData.length > 0 ? aprilPatternData[index % aprilPatternData.length] : null;
            
            const point: ChartDataPoint = {
                date: formatISO(day, { representation: 'date' }),
                isProjection,
                componentId: component.id,
                metric: metric,
                aprilBaseline,
                predictedValue,
                realValue,
                minValue,
                maxValue
            };

            if (metric === 'current') {
                point["Corriente Promedio Suavizado"] = realValue;
                point["Corriente Máxima"] = config.limit;
                point["Referencia Corriente Promedio Suavizado"] = config.ref;
            } else if (metric === 'unbalance') {
                point["Desbalance Suavizado"] = realValue;
                point["Umbral Desbalance"] = config.limit;
                point["Referencia Desbalance Suavizado"] = config.ref;
            } else if (metric === 'load_factor') {
                point["Factor De Carga Suavizado"] = realValue;
                point["Umbral Factor Carga"] = config.limit;
                point["Referencia Factor De Carga Suavizado"] = config.ref;
            }

            data.push(point);
        });
    });
  });

  return { data, aprilData: [] };
}
