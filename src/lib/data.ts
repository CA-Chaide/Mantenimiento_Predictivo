
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

const createSeededRandom = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const generateRandomWalk = (size: number, seed: number, base: number, volatility: number, min: number, max: number, jitter: number) => {
  const random = createSeededRandom(seed);
  const series: { realValue: number; minValue: number; maxValue: number }[] = [];
  let lastValue = base;

  for (let i = 0; i < size; i++) {
    const change = (random() - 0.5) * volatility;
    let newValue = lastValue + change;
    newValue = Math.max(min, Math.min(max, newValue));
    
    const finalValue = newValue + (random() - 0.5) * jitter;
    
    const rangeVolatility = finalValue > 1 ? 0.1 : 0.05;
    let minValue = finalValue * (1 - (random() * rangeVolatility));
    let maxValue = finalValue * (1 + (random() * rangeVolatility * 2));
    
    minValue = Math.max(min, minValue);
    maxValue = Math.min(max, maxValue);

    series.push({
      realValue: parseFloat(finalValue.toFixed(3)),
      minValue: parseFloat(minValue.toFixed(3)),
      maxValue: parseFloat(maxValue.toFixed(3)),
    });

    lastValue = newValue;
  }
  return series;
};

const generateProjection = (series: { realValue: number }[], projectionLength: number) => {
  if (series.length < 2) {
    const lastVal = series.length > 0 ? series[series.length-1].realValue : 0;
    return Array(projectionLength).fill(lastVal);
  }

  const history = series.slice(-30).map(p => p.realValue);
  const n = history.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += history[i];
    sumXY += i * history[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
  
  const lastKnownRealValue = history[n - 1];

  const projection: number[] = [];
  let lastValue = lastKnownRealValue;

  for (let i = 0; i < projectionLength; i++) {
    let predicted = lastValue + slope; 
    
    const noiseScale = lastValue > 1 ? 0.02 : 0.005; 
    const noise = (Math.random() - 0.5) * (lastValue * noiseScale);
    predicted += noise;
    
    predicted = Math.max(0, predicted);

    projection.push(parseFloat(predicted.toFixed(3)));
    lastValue = predicted;
  }

  return projection;
};


const getMetricConfig = (metric: 'current' | 'unbalance' | 'load_factor') => {
    switch (metric) {
        case 'current': {
            const limit = 50;
            return { base: 15, volatility: 2, min: 10, max: 20, limit, ref: limit * 0.5, jitter: 0.4 };
        }
        case 'unbalance': {
            const limit = 0.2;
            return { base: 0.1, volatility: 0.05, min: 0.05, max: 0.2, limit, ref: limit * 0.7, jitter: 0.01 };
        }
        case 'load_factor': {
            const limit = 0.6;
            return { base: 0.3, volatility: 0.1, min: 0.2, max: 0.4, limit, ref: limit * 0.6, jitter: 0.02 };
        }
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
        const seed = machineId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 
                     component.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
                     metric.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        const aprilWalk = generateRandomWalk(aprilDays.length, seed + 1000, config.base * 0.9, config.volatility * 0.8, config.min, config.max, config.jitter);
        aprilDataStore[component.id][metric] = aprilWalk.map(p => p.realValue);
    });
  });

  let data: ChartDataPoint[] = [];
  
  machineComponents.forEach((component) => {
    allMetrics.forEach(metric => {
        const config = getMetricConfig(metric);
        const seed = machineId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 
                     component.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
                     metric.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        const historicalDaysCount = differenceInDays(simulatedToday, correctedFrom) + 1;
        const totalDaysCount = allDays.length;

        const fullHistoricalWalk = generateRandomWalk(historicalDaysCount > 0 ? historicalDaysCount : 0, seed, config.base, config.volatility, config.min, config.max, config.jitter);
        const projectionLength = totalDaysCount - historicalDaysCount > 0 ? totalDaysCount - historicalDaysCount : 0;
        const projectionWalk = generateProjection(fullHistoricalWalk, projectionLength);

        const aprilPatternData = aprilDataStore[component.id]?.[metric] ?? [];
        
        allDays.forEach((day, index) => {
            const isProjection = isBefore(simulatedToday, day);
            const walkPoint = fullHistoricalWalk[index];

            const realValue = !isProjection ? walkPoint?.realValue : null;
            const minValue = !isProjection ? walkPoint?.minValue : null;
            const maxValue = !isProjection ? walkPoint?.maxValue : null;
            const predictedValue = isProjection ? projectionWalk[index - historicalDaysCount] : null;
            
            const aprilDatasetLength = aprilPatternData.length;
            const currentIndexFromEnd = totalDaysCount - 1 - index;
            const aprilIndex = aprilDatasetLength - 1 - currentIndexFromEnd;
            const aprilBaseline = (aprilIndex >= 0 && aprilIndex < aprilDatasetLength) ? aprilPatternData[aprilIndex] : null;
            
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
