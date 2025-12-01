import { eachDayOfInterval, formatISO, isBefore, addDays, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export const MACHINES = [
  { id: 'laader', name: 'Laader' },
  { id: 'looper', name: 'Looper' },
  { id: 'mesa_elevadora', name: 'Mesa Elevadora' },
  { id: 'puente_grua', name: 'Puente Grua' },
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
    { id: 'motor_elevacion_derecha', name: 'Motor Elevacion Derecha' },
    { id: 'motor_traslacion_der_izq', name: 'Motor Traslacion Der/Izq' },
  ],
  puente_grua: [
    { id: 'motor_elevacion_derecha', name: 'Motor Elevacion Derecha' },
    { id: 'motor_elevacion_izquierdo', name: 'Motor Elevacion Izquierdo' },
    { id: 'motor_traslacion_der_izq', name: 'Motor traslacion Der/Izq' },
  ],
  t8: [
    { id: 'motor_cuchilla_t8', name: 'Motor Cuchilla T8' },
    { id: 'motor_traslacion_t8', name: 'Motor Traslacion T8' },
  ],
};

export type ChartDataPoint = {
  date: string;          // ISO Date
  isProjection: boolean;
  componentId: string;
  metric: 'current' | 'unbalance' | 'load_factor';
  
  realValue: number | null;
  limitValue: number;
  refValue: number;
  aprilBaseline: number | null;
  predictedValue: number | null;
};

// A simple seeded pseudo-random number generator
const createSeededRandom = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Generates a smooth, random walk time series
const generateRandomWalk = (size: number, seed: number, base: number, volatility: number, min: number, max: number) => {
  const random = createSeededRandom(seed);
  const series: number[] = [];
  let lastValue = base;
  for (let i = 0; i < size; i++) {
    const change = (random() - 0.5) * volatility;
    let newValue = lastValue + change;
    newValue = Math.max(min, Math.min(max, newValue));
    series.push(parseFloat(newValue.toFixed(2)));
    lastValue = newValue;
  }
  return series;
};

// Generates a projection based on the last few points of a series
const generateProjection = (series: number[], projectionLength: number, volatility: number) => {
  if (series.length < 5) return Array(projectionLength).fill(series[series.length - 1] || 0);
  
  const lastValues = series.slice(-5);
  const trend = (lastValues[4] - lastValues[0]) / 4; // Simple linear trend
  
  const projection: number[] = [];
  let lastValue = series[series.length - 1];
  
  for (let i = 0; i < projectionLength; i++) {
    const randomChange = (Math.random() - 0.5) * volatility * 0.5; // Less volatile projection
    let newValue = lastValue + trend + randomChange;
    projection.push(parseFloat(newValue.toFixed(2)));
    lastValue = newValue;
  }
  return projection;
};

const getMetricConfig = (metric: 'current' | 'unbalance' | 'load_factor') => {
    switch (metric) {
        case 'current': return { base: 10, volatility: 0.5, min: 8, max: 14.5, limit: 15.0, ref: 12.5 };
        case 'unbalance': return { base: 0.15, volatility: 0.05, min: 0.1, max: 0.45, limit: 0.5, ref: 0.2 };
        case 'load_factor': return { base: 0.7, volatility: 0.1, min: 0.5, max: 1.05, limit: 1.1, ref: 0.8 };
    }
}

export function useMaintenanceData(machineId: MachineId, dateRange: DateRange, simulatedToday: Date) {
  if (!dateRange.from || !dateRange.to) {
    return { data: [], aprilData: [] };
  }

  const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const machineComponents = COMPONENTS[machineId];
  const allMetrics: ('current' | 'unbalance' | 'load_factor')[] = ['current', 'unbalance', 'load_factor'];

  const aprilRange = {
      start: new Date('2025-04-01T00:00:00Z'),
      end: new Date('2025-04-30T00:00:00Z')
  };
  const aprilDays = eachDayOfInterval(aprilRange);

  let data: ChartDataPoint[] = [];
  let aprilData: ChartDataPoint[] = [];

  machineComponents.forEach((component) => {
    allMetrics.forEach(metric => {
        const config = getMetricConfig(metric);
        const seed = machineId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 
                     component.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
                     metric.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        const historicalDaysCount = differenceInDays(simulatedToday, dateRange.from as Date) + 1;
        const totalDaysCount = allDays.length;

        // Generate full historical series
        const fullHistoricalWalk = generateRandomWalk(historicalDaysCount > 0 ? historicalDaysCount : 0, seed, config.base, config.volatility, config.min, config.max);

        // Generate projection
        const projectionLength = totalDaysCount - historicalDaysCount;
        const projectionWalk = generateProjection(fullHistoricalWalk, projectionLength > 0 ? projectionLength : 0, config.volatility);

        // Generate April baseline data
        const aprilWalk = generateRandomWalk(aprilDays.length, seed + 1000, config.base * 0.9, config.volatility * 0.8, config.min, config.max);
        
        aprilDays.forEach((day, index) => {
            aprilData.push({
                date: formatISO(day, { representation: 'date' }),
                isProjection: false,
                componentId: component.id,
                metric: metric,
                realValue: null,
                limitValue: config.limit,
                refValue: config.ref,
                aprilBaseline: aprilWalk[index],
                predictedValue: null
            });
        });

        allDays.forEach((day, index) => {
            const isProjection = isBefore(simulatedToday, day);
            
            data.push({
                date: formatISO(day, { representation: 'date' }),
                isProjection,
                componentId: component.id,
                metric: metric,
                realValue: !isProjection ? fullHistoricalWalk[index] : null,
                limitValue: config.limit,
                refValue: config.ref,
                aprilBaseline: null,
                predictedValue: isProjection ? projectionWalk[index - historicalDaysCount] : null,
            });
        });
    });
  });

  return { data, aprilData };
}
