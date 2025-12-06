
import { formatISO, parseISO, addDays, differenceInDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type Machine = { id: string; name: string };
export type MachineId = string;
export type Component = { id: string; name: string; originalName: string };

export type ChartDataPoint = {
  date: string; // "YYYY-MM-DD"
  isProjection: boolean;
  componentId: string;
  metric: 'current' | 'unbalance' | 'load_factor';
  
  "Corriente Promedio Suavizado"?: number | null;
  "Corriente Máxima"?: number;
  "Referencia Corriente Promedio Suavizado"?: number;
  
  "Desbalance Suavizado"?: number | null;
  "Umbral Desbalance"?: number;
  "Referencia Desbalance Suavizado"?: number;
  
  "Factor De Carga Suavizado"?: number | null;
  "Umbral Factor Carga"?: number;
  "Referencia Factor De Carga Suavizado"?: number;

  predictedValue?: number | null;
  [key: string]: any; // Allow other properties
};

// Raw record from the API before aggregation
export type RawDataRecord = {
    date: string;
    isProjection: boolean;
    componentId: string;
    
    "Corriente Promedio Suavizado"?: number | null;
    "Corriente Máxima"?: number;
    "Referencia Corriente Promedio Suavizado"?: number;
    
    "Desbalance Suavizado"?: number | null;
    "Umbral Desbalance"?: number;
    "Referencia Desbalance Suavizado"?: number;
    
    "Factor De Carga Suavizado"?: number | null;
    "Umbral Factor Carga"?: number;
    "Referencia Factor De Carga Suavizado"?: number;
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
  
    // Step 2 & 3: Calculate averages for each group
    const aggregatedResult = Object.entries(groupedByDay).map(([day, group]) => {
      const dayMetrics = {
        current: { sum: 0, count: 0 },
        unbalance: { sum: 0, count: 0 },
        load_factor: { sum: 0, count: 0 },
      };
  
      for (const record of group.records) {
        const current = safeNumber(record["Corriente Promedio Suavizado"]);
        if (current !== null) {
          dayMetrics.current.sum += current;
          dayMetrics.current.count++;
        }
  
        const unbalance = safeNumber(record["Desbalance Suavizado"]);
        if (unbalance !== null) {
          dayMetrics.unbalance.sum += unbalance;
          dayMetrics.unbalance.count++;
        }
  
        const loadFactor = safeNumber(record["Factor De Carga Suavizado"]);
        if (loadFactor !== null) {
          dayMetrics.load_factor.sum += loadFactor;
          dayMetrics.load_factor.count++;
        }
      }
      
      const newPoint: ChartDataPoint = {
        date: day,
        componentId: group.componentId,
        isProjection: false,
        metric: 'current', // Placeholder, not used per-metric anymore

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
  
export function calculateLinearRegressionAndProject(
  data: ChartDataPoint[],
  metricKey: keyof ChartDataPoint,
  daysToProject: number = 90
): ChartDataPoint[] {
    const cleanData = data.map((p, i) => ({
      x: i,
      y: p[metricKey] as number,
      date: p.date,
    })).filter(p => p.y !== null && !isNaN(p.y));

    if (cleanData.length < 2) {
      return []; // Cannot perform regression on less than 2 points
    }

    // Simple linear regression calculation
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = cleanData.length;

    for (const point of cleanData) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumXX += point.x * point.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    if (isNaN(slope) || isNaN(intercept)) {
      return []; // Invalid regression result
    }

    const lastPoint = cleanData[n - 1];
    const lastDate = parseISO(lastPoint.date);
    const projection: ChartDataPoint[] = [];

    for (let i = 1; i <= daysToProject; i++) {
        const x = lastPoint.x + i;
        const y = slope * x + intercept;
        const newDate = addDays(lastDate, i);
        
        const basePoint = data[0]; // Get a base point for limit/ref values

        projection.push({
          date: formatISO(newDate, { representation: 'date' }),
          isProjection: true,
          componentId: data[0].componentId,
          metric: data[0].metric, // This is a placeholder
          predictedValue: y,
          // Carry over limit and reference lines into the future
          "Corriente Máxima": basePoint["Corriente Máxima"],
          "Referencia Corriente Promedio Suavizado": basePoint["Referencia Corriente Promedio Suavizado"],
          "Umbral Desbalance": basePoint["Umbral Desbalance"],
          "Referencia Desbalance Suavizado": basePoint["Referencia Desbalance Suavizado"],
          "Umbral Factor Carga": basePoint["Umbral Factor Carga"],
          "Referencia Factor De Carga Suavizado": basePoint["Referencia Factor De Carga Suavizado"],
        });
    }

    return projection;
}


export async function useRealMaintenanceData(
  machineId: MachineId,
  component: Component,
  dateRange: DateRange,
  calculosService: any,
  onProgressUpdate?: (data: RawDataRecord[], progress: number) => void
): Promise<{ data: ChartDataPoint[] }> {
  if (!dateRange || !dateRange.from || !dateRange.to || !machineId || !component) {
    return { data: [] };
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
      return { data: [] };
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
            onProgressUpdate(transformedData, (pagesProcessed / totalPages) * 90); // 90% for fetching
        }
    }
    
    const rawTransformedData = allRecords.map(recordToDataPoint(component));
    const aggregatedData = aggregateDataByDay(rawTransformedData);
    
    if (aggregatedData.length < 2) {
      onProgressUpdate?.(rawTransformedData, 100);
      return { data: aggregatedData };
    }

    // Calculate projections for each metric
    const projCorriente = calculateLinearRegressionAndProject(aggregatedData, "Corriente Promedio Suavizado");
    const projDesbalance = calculateLinearRegressionAndProject(aggregatedData, "Desbalance Suavizado");
    const projFactorCarga = calculateLinearRegressionAndProject(aggregatedData, "Factor De Carga Suavizado");

    // Merge projections into a single array
    const allProjections = new Map<string, Partial<ChartDataPoint>>();

    const mergeProjection = (proj: ChartDataPoint[], key: string) => {
      proj.forEach(p => {
        if (!allProjections.has(p.date)) {
          allProjections.set(p.date, { ...p, predictedValue: undefined });
        }
        const existing = allProjections.get(p.date)!;
        existing[key] = p.predictedValue;
      });
    };

    mergeProjection(projCorriente, 'predictedValueCurrent');
    mergeProjection(projDesbalance, 'predictedValueUnbalance');
    mergeProjection(projFactorCarga, 'predictedValueLoadFactor');
    
    const finalProjection: ChartDataPoint[] = Array.from(allProjections.values()).map(p => {
       // This mapping is tricky. Let's just create one projection for each metric
       return {
         ...p,
         "Corriente Promedio Suavizado": p['predictedValueCurrent'],
         "Desbalance Suavizado": p['predictedValueUnbalance'],
         "Factor De Carga Suavizado": p['predictedValueLoadFactor'],
       } as ChartDataPoint;
    });

    const combinedData = [...aggregatedData, ...finalProjection];
    onProgressUpdate?.(rawTransformedData, 100);
    
    return { data: combinedData };

  } catch (error) {
    console.error('Error en useRealMaintenanceData:', error);
    return { data: [] };
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

// ============ SMOOTHING FUNCTIONS (NOT USED WITH AGGREGATED DATA) ============

export function calculateEMA(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
  }
  return ema;
}
