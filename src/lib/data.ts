import { eachDayOfInterval, formatISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export const MACHINES = [
  { id: 'laader', name: 'Laader' },
  { id: 'looper', name: 'Looper' },
  { id: 'mesa_elevadora', name: 'Mesa Elevadora' },
  { id: 'puente_grua', name: 'Puente Grua' },
  { id: 't8', name: 'T8' },
] as const;

export type MachineId = typeof MACHINES[number]['id'];

export const COMPONENTS: Record<MachineId, { id: string; name: string }[]> = {
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
    { id: 'motor_elevacion_izquierdo', name: 'Motor Elevacion izquierdo' },
    { id: 'motor_traslacion_der_izq', name: 'Motor traslacion Der/Izq' },
  ],
  t8: [
    { id: 'motor_cuchilla_t8', name: 'Motor Cuchilla T8' },
    { id: 'motor_traslacion_t8', name: 'Motor Traslacion T8' },
  ],
};

export type ComponentId = string;

export type MetricDataPoint = {
  timestamp: string; // ISO string
  metrics: {
    current: { max: number; ref_smooth: number; val_smooth: number };
    unbalance: { threshold: number; ref_smooth: number; val_smooth: number };
    load_factor: { threshold: number; ref_smooth: number; val_smooth: number };
  };
};

const createWalkingValue = (
  base: number,
  volatility: number,
  min: number,
  max: number
) => {
  let lastValue = base;
  return () => {
    const change = (Math.random() - 0.5) * volatility;
    let newValue = lastValue + change;
    newValue = Math.max(min, Math.min(max, newValue));
    lastValue = newValue;
    return parseFloat(newValue.toFixed(2));
  };
};

export function generateMockData(
  machineId: MachineId,
  componentId: ComponentId,
  dateRange: DateRange
): MetricDataPoint[] {
  if (!dateRange.from || !dateRange.to) {
    return [];
  }

  const interval = { start: dateRange.from, end: dateRange.to };
  const days = eachDayOfInterval(interval);

  // Seed with machine and component ID for deterministic randomness
  const seed = machineId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 
             componentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use a simple seeded random function
  let seededRandom = () => {
      const x = Math.sin(seed + days.length) * 10000;
      return x - Math.floor(x);
  };
  
  const baseCurrent = 10 + seededRandom() * 5;
  const baseUnbalance = 0.15 + seededRandom() * 0.1;
  const baseLoadFactor = 0.7 + seededRandom() * 0.2;

  const currentGen = createWalkingValue(baseCurrent, 0.5, 8, 14.5);
  const unbalanceGen = createWalkingValue(baseUnbalance, 0.05, 0.1, 0.45);
  const loadFactorGen = createWalkingValue(baseLoadFactor, 0.1, 0.5, 1.05);

  return days.map(day => {
    return {
      timestamp: formatISO(day, { representation: 'date' }),
      metrics: {
        current: {
          max: 15.0,
          ref_smooth: 12.5,
          val_smooth: currentGen(),
        },
        unbalance: {
          threshold: 0.5,
          ref_smooth: 0.2,
          val_smooth: unbalanceGen(),
        },
        load_factor: {
          threshold: 1.1,
          ref_smooth: 0.8,
          val_smooth: loadFactorGen(),
        },
      },
    };
  });
}
