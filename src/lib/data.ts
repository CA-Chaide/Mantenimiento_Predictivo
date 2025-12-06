
import { formatISO, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type Machine = { id: string; name: string };
export type MachineId = string;
export type Component = { id: string; name: string; originalName: string };

export type ChartDataPoint = {
  date: string; // "YYYY-MM-DD"
  isProjection: boolean;
  componentId: string;
  metric: 'current' | 'unbalance' | 'load_factor';
  realValue: number | null;
  
  current: { avg: number, max: number };
  unbalance: { avg: number, max: number };
  load_factor: { avg: number, max: number };

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

// Raw record from the API before aggregation
export type RawDataRecord = {
    date: string;
    isProjection: boolean;
    componentId: string;
    metric: 'current' | 'unbalance' | 'load_factor';
    realValue: number | null;
    
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

/**
 * Aggregates a large array of time-series data into daily summaries (average and max).
 * @param rawData The raw data array from the API.
 * @returns An array of aggregated data points, one for each day.
 */
export function aggregateDataByDay(rawData: RawDataRecord[]): ChartDataPoint[] {
    if (!rawData || rawData.length === 0) {
      return [];
    }
  
    // Helper to safely parse numbers
    const safeNumber = (value: any): number | null => {
      const num = Number(value);
      return isNaN(num) ? null : num;
    };
  
    // Step 1: Group data by day
    const groupedByDay = rawData.reduce((acc, record) => {
      const day = record.date.split('T')[0]; // "YYYY-MM-DD"
  
      if (!acc[day]) {
        acc[day] = {
          records: [],
          componentId: record.componentId,
          // Store first limit and ref values, assuming they are constant for the day
          "Corriente Máxima": record["Corriente Máxima"],
          "Referencia Corriente Promedio Suavizado": record["Referencia Corriente Promedio Suavizado"],
          "Umbral Desbalance": record["Umbral Desbalance"],
          "Referencia Desbalance Suavizado": record["Referencia Desbalance Suavizado"],
          "Umbral Factor Carga": record["Umbral Factor Carga"],
          "Referencia Factor De Carga Suavizado": record["Referencia Factor De Carga Suavizado"],
        };
      }
      acc[day].records.push(record);
      return acc;
    }, {} as Record<string, { 
        records: RawDataRecord[], 
        componentId: string,
        "Corriente Máxima"?: number,
        "Referencia Corriente Promedio Suavizado"?: number,
        "Umbral Desbalance"?: number,
        "Referencia Desbalance Suavizado"?: number,
        "Umbral Factor Carga"?: number,
        "Referencia Factor De Carga Suavizado"?: number,
    }>);
  
    // Step 2 & 3: Calculate averages and maximums for each group
    const aggregatedResult = Object.entries(groupedByDay).map(([day, group]) => {
      const dayMetrics = {
        current: { sum: 0, max: -Infinity, count: 0 },
        unbalance: { sum: 0, max: -Infinity, count: 0 },
        load_factor: { sum: 0, max: -Infinity, count: 0 },
      };
  
      for (const record of group.records) {
        const current = safeNumber(record["Corriente Promedio Suavizado"]);
        if (current !== null) {
          dayMetrics.current.sum += current;
          dayMetrics.current.max = Math.max(dayMetrics.current.max, current);
          dayMetrics.current.count++;
        }
  
        const unbalance = safeNumber(record["Desbalance Suavizado"]);
        if (unbalance !== null) {
          dayMetrics.unbalance.sum += unbalance;
          dayMetrics.unbalance.max = Math.max(dayMetrics.unbalance.max, unbalance);
          dayMetrics.unbalance.count++;
        }
  
        const loadFactor = safeNumber(record["Factor De Carga Suavizado"]);
        if (loadFactor !== null) {
          dayMetrics.load_factor.sum += loadFactor;
          dayMetrics.load_factor.max = Math.max(dayMetrics.load_factor.max, loadFactor);
          dayMetrics.load_factor.count++;
        }
      }
      
      const newPoint: ChartDataPoint = {
        date: day,
        componentId: group.componentId,
        isProjection: false,
        realValue: null,
        metric: 'current', // Placeholder, each metric is nested
        aprilBaseline: null,
        predictedValue: null,

        current: {
          avg: dayMetrics.current.count > 0 ? dayMetrics.current.sum / dayMetrics.current.count : 0,
          max: dayMetrics.current.max === -Infinity ? 0 : dayMetrics.current.max,
        },
        unbalance: {
          avg: dayMetrics.unbalance.count > 0 ? dayMetrics.unbalance.sum / dayMetrics.unbalance.count : 0,
          max: dayMetrics.unbalance.max === -Infinity ? 0 : dayMetrics.unbalance.max,
        },
        load_factor: {
          avg: dayMetrics.load_factor.count > 0 ? dayMetrics.load_factor.sum / dayMetrics.load_factor.count : 0,
          max: dayMetrics.load_factor.max === -Infinity ? 0 : dayMetrics.load_factor.max,
        },
        
        "Corriente Promedio Suavizado": dayMetrics.current.count > 0 ? dayMetrics.current.sum / dayMetrics.current.count : null,
        "Corriente Máxima": group["Corriente Máxima"],
        "Referencia Corriente Promedio Suavizado": group["Referencia Corriente Promedio Suavizado"],

        "Desbalance Suavizado": dayMetrics.unbalance.count > 0 ? dayMetrics.unbalance.sum / dayMetrics.unbalance.count : null,
        "Umbral Desbalance": group["Umbral Desbalance"],
        "Referencia Desbalance Suavizado": group["Referencia Desbalance Suavizado"],
        
        "Factor De Carga Suavizado": dayMetrics.load_factor.count > 0 ? dayMetrics.load_factor.sum / dayMetrics.load_factor.count : null,
        "Umbral Factor Carga": group["Umbral Factor Carga"],
        "Referencia Factor De Carga Suavizado": group["Referencia Factor De Carga Suavizado"],
      };
      
      return newPoint;
    });
  
    // Sort by date just in case
    return aggregatedResult.sort((a, b) => a.date.localeCompare(b.date));
  }
  

export async function useRealMaintenanceData(
  machineId: MachineId,
  component: Component,
  dateRange: DateRange,
  calculosService: any,
  onProgressUpdate?: (data: RawDataRecord[], progress: number) => void
): Promise<{ data: RawDataRecord[], aprilData: [] }> {
  if (!dateRange.from || !dateRange.to || !machineId || !component) {
    return { data: [], aprilData: [] };
  }

  try {
    const fromDateString = formatISO(dateRange.from, { representation: 'date' });
    const toDateString = formatISO(dateRange.to, { representation: 'date' });
    const componentNameForAPI = component.originalName;

    const totalResponse = await calculosService.getTotalByMaquinaAndComponente(
      machineId, 
      componentNameForAPI,
      fromDateString,
      toDateString
    );
    const totalRecords = totalResponse.total || 0;

    if (totalRecords === 0) {
      onProgressUpdate?.([], 100);
      return { data: [], aprilData: [] };
    }

    const limit = 1000;
    const totalPages = Math.ceil(totalRecords / limit);
    let allRecords: any[] = [];

    const fetchPage = async (page: number) => {
      return calculosService.getDataByMachineComponentAndDates({
        maquina: machineId,
        componente: componentNameForAPI,
        fecha_inicio: fromDateString,
        fecha_fin: toDateString,
        page,
        limit,
      });
    };
    
    // Fetch all pages in parallel
    const pagePromises = Array.from({ length: totalPages }, (_, i) => fetchPage(i + 1));
    
    let pagesProcessed = 0;
    for (const promise of pagePromises) {
        const response = await promise;
        if (response.data && Array.isArray(response.data)) {
          allRecords = allRecords.concat(response.data);
        }
        pagesProcessed++;
        if (onProgressUpdate) {
            const transformedData = allRecords.map(recordToDataPoint(component));
            onProgressUpdate(transformedData, (pagesProcessed / totalPages) * 100);
        }
    }
    
    const finalData = allRecords.map(recordToDataPoint(component));
    console.log('Datos transformados finales:', finalData.length, 'registros');
    return { data: finalData, aprilData: [] };

  } catch (error) {
    console.error('Error en useRealMaintenanceData:', error);
    return { data: [], aprilData: [] };
  }
}

// Helper to transform a single API record into our data point format.
const recordToDataPoint = (component: Component) => (record: any): RawDataRecord => {
  const safeNumber = (value: any): number | null => {
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  let fechaDate;
  try {
    fechaDate = new Date(
      record.AÑO,
      record.MES - 1,
      record.DIA,
      record.HORA || 0,
      record.MINUTO || 0,
      record.SEGUNDO || 0
    );
  } catch {
    fechaDate = new Date();
  }

  return {
    date: formatISO(fechaDate), // Keep full ISO string for grouping
    isProjection: false,
    componentId: component.id,
    metric: 'current', // Placeholder, as one record contains all metrics
    realValue: safeNumber(record.PromedioSuavizado),
    aprilBaseline: null,
    predictedValue: null,

    'Corriente Promedio Suavizado': safeNumber(record.PromedioSuavizado),
    'Corriente Máxima': safeNumber(record.CORREINTEMAX) ?? undefined,
    'Referencia Corriente Promedio Suavizado': safeNumber(record.PROMEDIO) ?? undefined,

    'Desbalance Suavizado': safeNumber(record.DesbalanceSuavizado),
    'Umbral Desbalance': safeNumber(record.Umbral_Desbalance) ?? undefined,
    'Referencia Desbalance Suavizado': safeNumber(record.DesbalancePorcentual) ?? undefined,

    'Factor De Carga Suavizado': safeNumber(record.FactorDeCargaSuavizado),
    'Umbral Factor Carga': safeNumber(record.Umbral_FactorCarga) ?? undefined,
    'Referencia Factor De Carga Suavizado': safeNumber(record.FactorDeCarga) ?? undefined,
  };
};

// ============ FUNCIONES DE SUAVIZADO (NO SE USAN CON DATOS AGREGADOS) ============

export function calculateEMA(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
  }
  return ema;
}

export function calculateHoltWinters(
  values: number[],
  alpha: number = 0.3,
  beta: number = 0.1,
  gamma: number = 0.1,
  seasonLength: number = 8 
): number[] {
  if (values.length < seasonLength) return values;

  const result: number[] = [];
  let level = values[0];
  let trend = (values[seasonLength] - values[0]) / seasonLength;
  const seasonal: number[] = values.slice(0, seasonLength).map(v => v - level);

  for (let i = 0; i < values.length; i++) {
    const seasonalIndex = i % seasonLength;
    const seasonalComponent = seasonal[seasonalIndex];
    const forecast = level + trend + seasonalComponent;
    result.push(forecast);

    if (i < values.length - 1) {
      const error = values[i + 1] - forecast;
      const newLevel = alpha * (values[i + 1] - seasonalComponent) + (1 - alpha) * (level + trend);
      const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
      const newSeasonal = gamma * (values[i + 1] - newLevel) + (1 - gamma) * seasonalComponent;

      level = newLevel;
      trend = newTrend;
      seasonal[seasonalIndex] = newSeasonal;
    }
  }
  return result;
}

export function calculateCubicSpline(values: number[]): number[] {
  if (values.length < 2) return values;

  const result: number[] = [];
  const n = values.length;

  const padded = [values[0], ...values, values[n - 1]];

  for (let i = 0; i < n - 1; i++) {
    const p0 = padded[i];
    const p1 = padded[i + 1];
    const p2 = padded[i + 2];
    const p3 = padded[i + 3];

    for (let t = 0; t < 1; t += 0.5) {
      const t2 = t * t;
      const t3 = t2 * t;
      const v = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
      result.push(v);
    }
  }

  result.push(values[n - 1]);
  return result;
}
