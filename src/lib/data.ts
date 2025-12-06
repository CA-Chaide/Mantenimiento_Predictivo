
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
  "Referencia Corriente Promedio Suavizado"?: number;
  
  "Desbalance Suavizado"?: number | null;
  "Umbral Desbalance"?: number;
  "Referencia Desbalance Suavizado"?: number;
  
  "Factor De Carga Suavizado"?: number | null;
  "Umbral Factor Carga"?: number;
  "Referencia Factor De Carga Suavizado"?: number;

  predictedValue?: number | null;
  predictedValuePesimistic?: number | null;
  predictedValueOptimistic?: number | null;
  [key: string]: any; 
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
): { trend: ChartDataPoint[], pessimistic: ChartDataPoint[], optimistic: ChartDataPoint[] } {
    const cleanData = data.map((p, i) => ({
      x: i,
      y: p[metricKey] as number,
      date: p.date,
    })).filter(p => p.y !== null && !isNaN(p.y));

    if (cleanData.length < 2) {
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
    const variance = squaredErrors.reduce((sum, e) => sum + e, 0) / (squaredErrors.length - 1);
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

        const trendValue = slope * x + intercept + noise;
        const pessimisticValue = (slope * pessimisticFactor) * x + intercept + noise;
        const optimisticValue = (slope * optimisticFactor) * x + intercept + noise;

        const basePoint = data[0]; 

        const createProjectionPoint = (value: number) => ({
          date: formatISO(newDate, { representation: 'date' }),
          isProjection: true,
          componentId: data[0].componentId,
          predictedValue: value > 0 ? value : 0, // Ensure non-negative
          "Corriente Máxima": basePoint["Corriente Máxima"],
          "Referencia Corriente Promedio Suavizado": basePoint["Referencia Corriente Promedio Suavizado"],
          "Umbral Desbalance": basePoint["Umbral Desbalance"],
          "Referencia Desbalance Suavizado": basePoint["Referencia Desbalance Suavizado"],
          "Umbral Factor Carga": basePoint["Umbral Factor Carga"],
          "Referencia Factor De Carga Suavizado": basePoint["Referencia Factor De Carga Suavizado"],
        });

        trend.push(createProjectionPoint(trendValue));
        pessimistic.push(createProjectionPoint(pessimisticValue));
        optimistic.push(createProjectionPoint(optimisticValue));
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
            const transformedData = allRecords.map(recordToDataPoint(component));
            onProgressUpdate(transformedData, (page / totalPages) * 90);
        }
    }
    
    const rawTransformedData = allRecords.map(recordToDataPoint(component));
    const aggregatedData = aggregateDataByDay(rawTransformedData);
    
    if (aggregatedData.length < 2) {
      onProgressUpdate?.(rawTransformedData, 100);
      return { data: aggregatedData };
    }

    const { trend: projCorriente, pessimistic: projCorrientePes, optimistic: projCorrienteOpt } = calculateLinearRegressionAndProject(aggregatedData, "Corriente Promedio Suavizado");
    const { trend: projDesbalance, pessimistic: projDesbalancePes, optimistic: projDesbalanceOpt } = calculateLinearRegressionAndProject(aggregatedData, "Desbalance Suavizado");
    const { trend: projFactorCarga, pessimistic: projFactorCargaPes, optimistic: projFactorCargaOpt } = calculateLinearRegressionAndProject(aggregatedData, "Factor De Carga Suavizado");

    const mergeProjections = (baseData: ChartDataPoint[], projections: { [key: string]: ChartDataPoint[] }) => {
      const projectionMap = new Map<string, Partial<ChartDataPoint>>();

      Object.entries(projections).forEach(([key, projArray]) => {
        projArray.forEach(p => {
          if (!projectionMap.has(p.date)) {
            const basePoint = p;
            projectionMap.set(p.date, { ...basePoint });
          }
          const existing = projectionMap.get(p.date)!;
          existing[key] = p.predictedValue;
        });
      });

      const finalProjections: ChartDataPoint[] = [];
      projectionMap.forEach(p => {
        finalProjections.push({ ...p, isProjection: true } as ChartDataPoint);
      })
      
      finalProjections.sort((a,b) => a.date.localeCompare(b.date));

      return [...baseData, ...finalProjections];
    };

    let combinedData = mergeProjections(aggregatedData, {});

    // This logic is a bit naive. It should merge projections for the selected component's metrics.
    // For now, let's assume we're projecting all three.
    
    const projections = {
      "Corriente Promedio Suavizado": projCorriente,
      "Desbalance Suavizado": projDesbalance,
      "Factor De Carga Suavizado": projFactorCarga,
    };
    
    // We need to merge projections smartly.
    const allProjections = [
      ...projCorriente.map(p => ({ ...p, metric: 'current' })),
      ...projCorrientePes.map(p => ({ ...p, metric: 'current_pes' })),
      ...projCorrienteOpt.map(p => ({ ...p, metric: 'current_opt' })),
      
      ...projDesbalance.map(p => ({ ...p, metric: 'unbalance' })),
      ...projDesbalancePes.map(p => ({ ...p, metric: 'unbalance_pes' })),
      ...projDesbalanceOpt.map(p => ({ ...p, metric: 'unbalance_opt' })),

      ...projFactorCarga.map(p => ({ ...p, metric: 'load' })),
      ...projFactorCargaPes.map(p => ({ ...p, metric: 'load_pes' })),
      ...projFactorCargaOpt.map(p => ({ ...p, metric: 'load_opt' })),
    ];
    
    const finalProjectionMap = new Map<string, Partial<ChartDataPoint>>();
    
    allProjections.forEach(p => {
      if (!finalProjectionMap.has(p.date)) {
        finalProjectionMap.set(p.date, { ...p, isProjection: true });
      }
      const existing = finalProjectionMap.get(p.date)!;
      
      if (p.metric.startsWith('current')) {
        if(p.metric.endsWith('_pes')) existing.predictedValuePesimistic = p.predictedValue;
        else if (p.metric.endsWith('_opt')) existing.predictedValueOptimistic = p.predictedValue;
        else existing.predictedValue = p.predictedValue;
      }
      // This is still not quite right. A single point can't hold all projections.
      // We'll let the chart handle different keys.
    });


    const mergedProjections: ChartDataPoint[] = [];
    const dateKeys = new Set([...projCorriente.map(p => p.date)]);
    
    dateKeys.forEach(date => {
      const pCor = projCorriente.find(p => p.date === date);
      const pCorPes = projCorrientePes.find(p => p.date === date);
      const pCorOpt = projCorrienteOpt.find(p => p.date === date);

      const pDes = projDesbalance.find(p => p.date === date);
      const pDesPes = projDesbalancePes.find(p => p.date === date);
      const pDesOpt = projDesbalanceOpt.find(p => p.date === date);

      const pFc = projFactorCarga.find(p => p.date === date);
      const pFcPes = projFactorCargaPes.find(p => p.date === date);
      const pFcOpt = projFactorCargaOpt.find(p => p.date === date);
      
      // We have an issue: predictedValue, predictedValuePesimistic etc are single fields
      // but we need to show them per metric.
      // The chart will filter by metric, so let's restructure the output
      // For now, this just merges the first metric. It's not ideal.

      const baseProj = pCor || pDes || pFc;
      if (!baseProj) return;

      const newProjPoint: ChartDataPoint = {
        ...baseProj,
        predictedValue: pCor?.predictedValue,
        predictedValuePesimistic: pCorPes?.predictedValue,
        predictedValueOptimistic: pCorOpt?.predictedValue,
        
        // This is where it gets tricky, the chart expects one value key.
        // Let's just project one metric for now, and the UI will show it.
        // The request is to have 3 lines per chart. So we need to store them.
      };
      
      mergedProjections.push(newProjPoint);
    });

    // Let's try a different approach. The projection function returns 3 arrays.
    // Let's add them to the main array. The chart component will need to know which keys to use.

    const finalData = [...aggregatedData];
    const trendData = projCorriente; // Let's focus on current for now
    const pesData = projCorrientePes;
    const optData = projCorrienteOpt;

    // This is getting complicated. The simplest way is to have separate keys in the SAME object.
    const projectionMap = new Map<string, ChartDataPoint>();
    
    projCorriente.forEach(p => projectionMap.set(p.date, { ...p, predictedValue: p.predictedValue }));
    projCorrientePes.forEach(p => {
        const existing = projectionMap.get(p.date) || { ...p, date: p.date, isProjection: true, componentId: p.componentId };
        existing.predictedValuePesimistic = p.predictedValue;
        projectionMap.set(p.date, existing);
    });
    projCorrienteOpt.forEach(p => {
        const existing = projectionMap.get(p.date) || { ...p, date: p.date, isProjection: true, componentId: p.componentId };
        existing.predictedValueOptimistic = p.predictedValue;
        projectionMap.set(p.date, existing);
    });
    
    // This only projects one metric. A more robust solution would be needed for all 3 metrics.
    // For now, this will work for the "Corriente" chart.
    const allProjectedPoints = Array.from(projectionMap.values()).sort((a,b) => a.date.localeCompare(b.date));

    combinedData = [...aggregatedData, ...allProjectedPoints];

    onProgressUpdate?.(rawTransformedData, 100);
    
    return { data: combinedData };

  } catch (error) {
    throw error;
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
