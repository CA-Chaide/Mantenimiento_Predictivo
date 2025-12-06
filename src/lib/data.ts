
import { formatISO, parseISO, addDays, differenceInDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type Machine = { id: string; name: string };
export type MachineId = string;
export type Component = { id: string; name: string; originalName: string };

export type ChartDataPoint = {
  date: string; // "YYYY-MM-DD"
  isProjection: boolean;
  componentId: string;
  
  "Corriente Promedio Suavizado"?: number | null;
  "Corriente Máxima"?: number;
  
  "Desbalance Suavizado"?: number | null;
  "Umbral Desbalance"?: number;
  
  "Factor De Carga Suavizado"?: number | null;
  "Umbral Factor Carga"?: number;

  "proyeccion_corriente_tendencia"?: number | null;
  "proyeccion_corriente_pesimista"?: number | null;
  "proyeccion_corriente_optimista"?: number | null;
  
  "proyeccion_desbalance_tendencia"?: number | null;
  "proyeccion_desbalance_pesimista"?: number | null;
  "proyeccion_desbalance_optimista"?: number | null;

  "proyeccion_factor_carga_tendencia"?: number | null;
  "proyeccion_factor_carga_pesimista"?: number | null;
  "proyeccion_factor_carga_optimista"?: number | null;
  [key: string]: any; 
};

// Raw record from the API before aggregation
export type RawDataRecord = {
    date: string;
    isProjection: boolean;
    componentId: string;
    
    "Corriente Promedio Suavizado"?: number | null;
    "Corriente Máxima"?: number;
    
    "Desbalance Suavizado"?: number | null;
    "Umbral Desbalance"?: number;
    
    "Factor De Carga Suavizado"?: number | null;
    "Umbral Factor Carga"?: number;
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
          "Umbral Desbalance": record["Umbral Desbalance"],
          "Umbral Factor Carga": record["Umbral Factor Carga"],
        };
      }
      acc[day].records.push(record);
      return acc;
    }, {} as Record<string, { 
        records: RawDataRecord[], 
        componentId: string,
        "Corriente Máxima"?: number,
        "Umbral Desbalance"?: number,
        "Umbral Factor Carga"?: number,
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

        "Corriente Promedio Suavizado": dayMetrics.current.count > 0 ? dayMetrics.current.sum / dayMetrics.current.count : null,
        "Corriente Máxima": group["Corriente Máxima"],

        "Desbalance Suavizado": dayMetrics.unbalance.count > 0 ? dayMetrics.unbalance.sum / dayMetrics.unbalance.count : null,
        "Umbral Desbalance": group["Umbral Desbalance"],
        
        "Factor De Carga Suavizado": dayMetrics.load_factor.count > 0 ? dayMetrics.load_factor.sum / dayMetrics.load_factor.count : null,
        "Umbral Factor Carga": group["Umbral Factor Carga"],
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
): { trend: ChartDataPoint[], pessimistic: ChartDataPoint[], optimistic: ChartDataPoint[] } {
    const cleanData = data.map((p, i) => ({
      x: i,
      y: p[metricKey] as number,
      date: p.date,
    })).filter(p => p.y !== null && !isNaN(p.y) && p.y > 0); // Filter out zero/null values

    if (cleanData.length < 5) { // Increased minimum points for a more stable trend
      return { trend: [], pessimistic: [], optimistic: [] };
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
      return { trend: [], pessimistic: [], optimistic: [] };
    }
    
    // Calculate residuals and standard deviation for noise generation
    const residuals = cleanData.map(p => p.y - (slope * p.x + intercept));
    const meanResidual = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
    const squaredErrors = residuals.map(r => (r - meanResidual) ** 2);
    const variance = squaredErrors.reduce((sum, e) => sum + e, 0) / (squaredErrors.length > 1 ? squaredErrors.length - 1 : 1);
    const stdDev = Math.sqrt(variance);
    const noiseFactor = stdDev / 2; // Reduce noise amplitude

    const lastPoint = cleanData[n - 1];
    const lastDate = parseISO(lastPoint.date);
    const trend: ChartDataPoint[] = [];
    const pessimistic: ChartDataPoint[] = [];
    const optimistic: ChartDataPoint[] = [];
    
    const pessimisticFactor = 1.5; 
    const optimisticFactor = 0.5;

    for (let i = 1; i <= daysToProject; i++) {
        const x = lastPoint.x + i;
        const newDate = addDays(lastDate, i);
        
        const noise = (Math.random() - 0.5) * 2 * noiseFactor;

        // Ensure slope is not negative to prevent decreasing trends
        const nonNegativeSlope = Math.max(0, slope);

        const trendValue = nonNegativeSlope * x + intercept + noise;
        const pessimisticValue = (nonNegativeSlope * pessimisticFactor) * x + intercept + noise;
        const optimisticValue = (nonNegativeSlope * optimisticFactor) * x + intercept + noise;

        const basePoint = data[0]; 

        const createFullProjectionPoint = (
            trendVal: number,
            pessimisticVal: number,
            optimisticVal: number
        ) => {
            const point: ChartDataPoint = {
                date: formatISO(newDate, { representation: 'date' }),
                isProjection: true,
                componentId: data[0].componentId,
                 "Corriente Máxima": basePoint["Corriente Máxima"],
                "Umbral Desbalance": basePoint["Umbral Desbalance"],
                "Umbral Factor Carga": basePoint["Umbral Factor Carga"],
                predictedValue: trendVal > 0 ? trendVal : 0,
                predictedValuePesimistic: pessimisticVal > 0 ? pessimisticVal : 0,
                predictedValueOptimistic: optimisticVal > 0 ? optimisticVal : 0,
            };
            return point;
        }

        trend.push(createFullProjectionPoint(trendValue, pessimisticValue, optimisticValue));
        pessimistic.push(createFullProjectionPoint(trendValue, pessimisticValue, optimisticValue));
        optimistic.push(createFullProjectionPoint(trendValue, pessimisticValue, optimisticValue));
    }

    return { trend, pessimistic, optimistic };
}


export async function useRealMaintenanceData(
  machineId: MachineId,
  component: Component,
  dateRange: DateRange | undefined,
  calculosService: any,
  onProgressUpdate?: (data: RawDataRecord[], progress: number) => void
): Promise<{ data: ChartDataPoint[] }> {
  if (!dateRange || !dateRange.from || !dateRange.to || !machineId || !component) {
    return { data: [] };
  }

  try {
    const fromDate = dateRange.from;
    const toDate = dateRange.to;
    const fromDateString = formatISO(fromDate, { representation: 'date' });
    const toDateString = formatISO(toDate, { representation: 'date' });
    const componentNameForAPI = component.originalName;

    let allRecords: any[] = [];
    let aggregatedData: ChartDataPoint[];

    // Fetch and process data
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

    for (let page = 1; page <= totalPages; page++) {
      const response = await calculosService.getDataByMachineComponentAndDates({
        maquina: machineId,
        componente: componentNameForAPI,
        fecha_inicio: fromDateString,
        fecha_fin: toDateString,
        page,
        limit,
      });

      if (response.data && Array.isArray(response.data)) {
        allRecords = allRecords.concat(response.data);
      }

      if (onProgressUpdate) {
        const transformedData = allRecords.map(recordToDataPoint(component, false));
        onProgressUpdate(transformedData, (page / totalPages) * 90);
      }
    }

    const rawTransformedData = allRecords.map(recordToDataPoint(component, false));
    aggregatedData = aggregateDataByDay(rawTransformedData);

    if (aggregatedData.length < 2) {
      onProgressUpdate?.([], 100);
      return { data: aggregatedData };
    }
    
    // Calculate projections for all metrics
    const { trend: projCorriente, pessimistic: projCorrientePes, optimistic: projCorrienteOpt } = calculateLinearRegressionAndProject(aggregatedData, "Corriente Promedio Suavizado");
    const { trend: projDesbalance, pessimistic: projDesbalancePes, optimistic: projDesbalanceOpt } = calculateLinearRegressionAndProject(aggregatedData, "Desbalance Suavizado");
    const { trend: projFactorCarga, pessimistic: projFactorCargaPes, optimistic: projFactorCargaOpt } = calculateLinearRegressionAndProject(aggregatedData, "Factor De Carga Suavizado");

    // Merge all projections into one array of points
    const projectionMap = new Map<string, ChartDataPoint>();
    
    const allProjections = [
      { key: 'proyeccion_corriente_tendencia', data: projCorriente },
      { key: 'proyeccion_corriente_pesimista', data: projCorrientePes },
      { key: 'proyeccion_corriente_optimista', data: projCorrienteOpt },
      { key: 'proyeccion_desbalance_tendencia', data: projDesbalance },
      { key: 'proyeccion_desbalance_pesimista', data: projDesbalancePes },
      { key: 'proyeccion_desbalance_optimista', data: projDesbalanceOpt },
      { key: 'proyeccion_factor_carga_tendencia', data: projFactorCarga },
      { key: 'proyeccion_factor_carga_pesimista', data: projFactorCargaPes },
      { key: 'proyeccion_factor_carga_optimista', data: projFactorCargaOpt },
    ];

    allProjections.forEach(({ key, data }) => {
        data.forEach(p => {
            const existing = projectionMap.get(p.date) || { ...p, date: p.date, isProjection: true, componentId: p.componentId };
            if (key.includes('corriente')) {
              if (key.endsWith('tendencia')) existing['proyeccion_corriente_tendencia'] = p.predictedValue;
              if (key.endsWith('pesimista')) existing['proyeccion_corriente_pesimista'] = p.predictedValuePesimistic;
              if (key.endsWith('optimista')) existing['proyeccion_corriente_optimista'] = p.predictedValueOptimistic;
            } else if (key.includes('desbalance')) {
                if (key.endsWith('tendencia')) existing['proyeccion_desbalance_tendencia'] = p.predictedValue;
                if (key.endsWith('pesimista')) existing['proyeccion_desbalance_pesimista'] = p.predictedValuePesimistic;
                if (key.endsWith('optimista')) existing['proyeccion_desbalance_optimista'] = p.predictedValueOptimistic;
            } else if (key.includes('factor_carga')) {
                if (key.endsWith('tendencia')) existing['proyeccion_factor_carga_tendencia'] = p.predictedValue;
                if (key.endsWith('pesimista')) existing['proyeccion_factor_carga_pesimista'] = p.predictedValuePesimistic;
                if (key.endsWith('optimista')) existing['proyeccion_factor_carga_optimista'] = p.predictedValueOptimistic;
            }
            projectionMap.set(p.date, existing);
        })
    });

    const allProjectedPoints = Array.from(projectionMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    let combinedData = [...aggregatedData, ...allProjectedPoints];

    onProgressUpdate?.([], 100);
    
    return { data: combinedData };

  } catch (error) {
    throw error;
  }
}

// Helper to transform a single API record into our data point format.
const recordToDataPoint = (component: Component, isAggregated: boolean) => (record: any): RawDataRecord => {
  const safeNumber = (value: any): number | null => {
    const num = Number(value);
    return isNaN(num) ? null : num;
  };
  
  // Handle detailed data format
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
    'Corriente Máxima': safeNumber(record.CORRIENTEMAX) ?? undefined,

    'Desbalance Suavizado': safeNumber(record.DesbalanceSuavizado),
    'Umbral Desbalance': safeNumber(record.Umbral_Desbalance) ?? undefined,

    'Factor De Carga Suavizado': safeNumber(record.FactorDeCargaSuavizado),
    'Umbral Factor Carga': safeNumber(record.Umbral_FactorCarga) ?? undefined,
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
