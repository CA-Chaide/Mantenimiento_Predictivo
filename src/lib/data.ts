

import { format, formatISO, parseISO, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

export type Machine = { id: string; name: string };
export type MachineId = string;
export type Component = { id: string; name: string; originalName: string };

export type ChartDataPoint = {
  date: string; // "YYYY-MM-DD" or "YYYY-MM"
  isProjection: boolean;
  componentId: string;
  
  "Corriente Promedio Suavizado"?: number | null;
  "Referencia Corriente Promedio Suavizado"?: number | null;
  "Corriente Máxima"?: number | null;
  
  "Desbalance Suavizado"?: number | null;
  "Umbral Desbalance"?: number | null;
  
  "Factor De Carga Suavizado"?: number | null;
  "Umbral Factor Carga"?: number | null;

  "proyeccion_corriente_tendencia"?: number | null;
  "proyeccion_corriente_pesimista"?: number | null;
  "proyeccion_corriente_optimista"?: number | null;
  
  "proyeccion_referencia_corriente_tendencia"?: number | null;
  
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
    "Referencia Corriente Promedio Suavizado"?: number | null;
    "Corriente Máxima"?: number | null;
    
    "Desbalance Suavizado"?: number | null;
    "Umbral Desbalance"?: number | null;
    
    "Factor De Carga Suavizado"?: number | null;
    "Umbral Factor Carga"?: number | null;
  };

// --- RED DE SEGURIDAD: VALORES MANUALES ---
// Se usará SOLO si la columna de la base de datos sigue fallando o viene vacía.
function getManualCurrentLimit(componentName: string, machineId: string): number | null {
    const name = componentName.toLowerCase();
    
    // T8
    if (name.includes('cuchilla t8')) return 5.50;
    if (name.includes('traslacion t8')) return 3.35;

    // LOOPER
    if (name.includes('banda looper')) return 14.60;
    if (name.includes('cuchilla looper')) return 8.20;

    // LAADER / LOADER
    if (name.includes('laader') || name.includes('loader')) return 51.70;

    // Contexto Maquinas
    const isPuente = machineId.toLowerCase().includes('puente') || name.includes('puente');
    const isMesa = machineId.toLowerCase().includes('mesa') || name.includes('mesa');

    if (name.includes('elevacion derecha')) {
        if (isPuente) return 14.00;
        return 26.50; 
    }
    
    if (name.includes('elevacion izquierdo') || name.includes('elevacion izquierda')) {
        return 14.00; 
    }

    if (name.includes('traslacion der/izq') || name.includes('traslacion')) {
        if (isPuente) return 5.00;
        if (isMesa) return 3.25;
    }
    
    if (name.includes('motor elevacion') && isMesa) return 26.50;

    return null;
}
// -----------------------------------------------------

export function aggregateDataByMonth(rawData: RawDataRecord[]): ChartDataPoint[] {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    const groupedByMonth = rawData.reduce((acc, record) => {
      if (!record.date) return acc;
      const month = format(parseISO(record.date), 'yyyy-MM');
      if (!acc[month]) {
        acc[month] = { records: [], componentId: record.componentId };
      }
      acc[month].records.push(record);
      return acc;
    }, {} as Record<string, { records: RawDataRecord[], componentId: string }>);

    const aggregatedResult = Object.entries(groupedByMonth).map(([month, group]) => {
      const metrics = {
        current: { sum: 0, count: 0 },
        refCurrent: { sum: 0, count: 0 },
        unbalance: { sum: 0, count: 0 },
        load_factor: { sum: 0, count: 0 },
        current_limit: { sum: 0, count: 0 },
        unbalance_limit: { sum: 0, count: 0 },
        load_factor_limit: { sum: 0, count: 0 },
      };

      for (const record of group.records) {
        const current = Number(record["Corriente Promedio Suavizado"]);
        if (!isNaN(current)) {
          metrics.current.sum += current;
          metrics.current.count++;
        }
        const refCurrent = Number(record["Referencia Corriente Promedio Suavizado"]);
        if (!isNaN(refCurrent)) {
            metrics.refCurrent.sum += refCurrent;
            metrics.refCurrent.count++;
        }
        const unbalance = Number(record["Desbalance Suavizado"]);
        if (!isNaN(unbalance)) {
          metrics.unbalance.sum += unbalance;
          metrics.unbalance.count++;
        }
        const loadFactor = Number(record["Factor De Carga Suavizado"]);
        if (!isNaN(loadFactor)) {
          metrics.load_factor.sum += loadFactor;
          metrics.load_factor.count++;
        }
        
        const currentLimit = Number(record["Corriente Máxima"]);
        if (!isNaN(currentLimit) && currentLimit > 0) { 
            metrics.current_limit.sum += currentLimit;
            metrics.current_limit.count++;
        }
        const unbalanceLimit = Number(record["Umbral Desbalance"]);
        if (!isNaN(unbalanceLimit) && unbalanceLimit > 0) {
            metrics.unbalance_limit.sum += unbalanceLimit;
            metrics.unbalance_limit.count++;
        }
        const loadFactorLimit = Number(record["Umbral Factor Carga"]);
        if (!isNaN(loadFactorLimit) && loadFactorLimit > 0) {
            metrics.load_factor_limit.sum += loadFactorLimit;
            metrics.load_factor_limit.count++;
        }
      }
      
      return {
        date: month,
        componentId: group.componentId,
        isProjection: false,
        "Corriente Promedio Suavizado": metrics.current.count > 0 ? metrics.current.sum / metrics.current.count : null,
        "Referencia Corriente Promedio Suavizado": metrics.refCurrent.count > 0 ? metrics.refCurrent.sum / metrics.refCurrent.count : null,
        "Corriente Máxima": metrics.current_limit.count > 0 ? metrics.current_limit.sum / metrics.current_limit.count : null,
        "Desbalance Suavizado": metrics.unbalance.count > 0 ? metrics.unbalance.sum / metrics.unbalance.count : null,
        "Umbral Desbalance": metrics.unbalance_limit.count > 0 ? metrics.unbalance_limit.sum / metrics.unbalance_limit.count : null,
        "Factor De Carga Suavizado": metrics.load_factor.count > 0 ? metrics.load_factor.sum / metrics.load_factor.count : null,
        "Umbral Factor Carga": metrics.load_factor_limit.count > 0 ? metrics.load_factor_limit.sum / metrics.load_factor_limit.count : null,
      };
    });

    return aggregatedResult.sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateDataByDay(rawData: RawDataRecord[]): ChartDataPoint[] {
    if (!rawData || rawData.length === 0) {
        return [];
    }

    const groupedByDay = rawData.reduce((acc, record) => {
        if (!record.date) return acc;
        const day = record.date.split('T')[0];
        if (!acc[day]) {
            acc[day] = { records: [], componentId: record.componentId };
        }
        acc[day].records.push(record);
        return acc;
    }, {} as Record<string, { records: RawDataRecord[], componentId: string }>);

    const safeNumber = (value: any): number | null => {
        const num = Number(value);
        return isNaN(num) || value === null ? null : num;
    };
    
    const aggregatedResult = Object.entries(groupedByDay).map(([day, group]) => {
        const dayMetrics = {
            current: { sum: 0, count: 0 },
            refCurrent: { sum: 0, count: 0 },
            unbalance: { sum: 0, count: 0 },
            load_factor: { sum: 0, count: 0 },
        };
        
        const findFirstValidLimit = (key: keyof RawDataRecord): number | null => {
            for (const record of group.records) {
                const value = safeNumber(record[key]);
                if (typeof value === 'number' && !isNaN(value) && value > 0) {
                    return value;
                }
            }
            return null;
        };

        const currentLimit = findFirstValidLimit("Corriente Máxima");
        const unbalanceLimit = findFirstValidLimit("Umbral Desbalance");
        const loadFactorLimit = findFirstValidLimit("Umbral Factor Carga");

        for (const record of group.records) {
            const current = safeNumber(record["Corriente Promedio Suavizado"]);
            if (current !== null) {
                dayMetrics.current.sum += current;
                dayMetrics.current.count++;
            }
            const refCurrent = safeNumber(record["Referencia Corriente Promedio Suavizado"]);
            if (refCurrent !== null) {
                dayMetrics.refCurrent.sum += refCurrent;
                dayMetrics.refCurrent.count++;
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
            "Referencia Corriente Promedio Suavizado": dayMetrics.refCurrent.count > 0 ? dayMetrics.refCurrent.sum / dayMetrics.refCurrent.count : null,
            "Corriente Máxima": currentLimit,
            "Desbalance Suavizado": dayMetrics.unbalance.count > 0 ? dayMetrics.unbalance.sum / dayMetrics.unbalance.count : null,
            "Umbral Desbalance": unbalanceLimit,
            "Factor De Carga Suavizado": dayMetrics.load_factor.count > 0 ? dayMetrics.load_factor.sum / dayMetrics.load_factor.count : null,
            "Umbral Factor Carga": loadFactorLimit,
        };
        return newPoint;
    });

    return aggregatedResult.sort((a, b) => a.date.localeCompare(b.date));
}
  
export function calculateLinearRegressionAndProject(
  data: ChartDataPoint[],
  valueKey: keyof ChartDataPoint,
  daysToProject: number = 90
): { [key: string]: (number | null)[] } {
    const cleanData = data.map((p, i) => ({
      x: i,
      y: p[valueKey] as number,
    })).filter(p => p.y !== null && !isNaN(p.y) && p.y > 0);

    if (cleanData.length < 5) {
      return { trend: [], pessimistic: [], optimistic: [] };
    }

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
    
    const residuals = cleanData.map(p => p.y - (slope * p.x + intercept));
    const meanResidual = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
    const squaredErrors = residuals.map(r => (r - meanResidual) ** 2);
    const variance = squaredErrors.reduce((sum, e) => sum + e, 0) / (squaredErrors.length > 1 ? squaredErrors.length - 1 : 1);
    const stdDev = Math.sqrt(variance);
    const noiseFactor = stdDev / 2;

    const lastPointX = cleanData[n - 1].x;
    const trend: (number | null)[] = [];
    const pessimistic: (number | null)[] = [];
    const optimistic: (number | null)[] = [];
    
    const pessimisticFactor = 1.5; 
    const optimisticFactor = 0.5;

    for (let i = 1; i <= daysToProject; i++) {
        const x = lastPointX + i;
        
        const noise = (Math.random() - 0.5) * 2 * noiseFactor;
        const nonNegativeSlope = Math.max(0, slope);

        const trendValue = nonNegativeSlope * x + intercept + noise;
        const pessimisticValue = (nonNegativeSlope * pessimisticFactor) * x + intercept + noise;
        const optimisticValue = (nonNegativeSlope * optimisticFactor) * x + intercept + noise;

        trend.push(trendValue > 0 ? trendValue : 0);
        pessimistic.push(pessimisticValue > 0 ? pessimisticValue : 0);
        optimistic.push(optimisticValue > 0 ? optimisticValue : 0);
    }

    return { trend, pessimistic, optimistic };
}


export async function useRealMaintenanceData(
  machineId: MachineId,
  component: Component,
  dateRange: DateRange | undefined,
  calculosService: any,
  daysToProject: number = 90,
  onProgressUpdate?: (data: RawDataRecord[], progress: number) => void
): Promise<{ data: ChartDataPoint[] }> {
  if (!dateRange || !dateRange.from || !dateRange.to || !machineId || !component) {
    return { data: [] };
  }

  const fromDate = dateRange.from;
  const toDate = dateRange.to;
  const fromDateString = formatISO(fromDate, { representation: 'date' });
  const toDateString = formatISO(toDate, { representation: 'date' });
  const componentNameForAPI = component.originalName;
  const daysDifference = differenceInDays(toDate, fromDate);
  const useAggregatedEndpoint = daysDifference > 365;

  let allApiRecords: any[] = [];
  
  if (useAggregatedEndpoint) {
      try {
        const response = await calculosService.getDataByMachineComponentAndDatesAggregated({
            maquina: machineId,
            componente: componentNameForAPI,
            fecha_inicio: fromDateString,
            fecha_fin: toDateString,
        });
        if (response.data && Array.isArray(response.data)) {
            allApiRecords = response.data;
        }
        onProgressUpdate?.([], 90);
      } catch (error) {
        console.error("Error fetching aggregated data:", error);
        throw new Error("Failed to fetch aggregated data from API.");
      }
  } else {
      let totalRecords = 0;
      try {
          const totalResponse = await calculosService.getTotalByMaquinaAndComponente(
              machineId,
              componentNameForAPI,
              fromDateString,
              toDateString
          );
          totalRecords = totalResponse.total || 0;
      } catch (error) {
          console.error("Error fetching total records:", error);
          // Do not throw here, allow the process to continue with 0 records
      }

      if (totalRecords === 0) {
          onProgressUpdate?.([], 100);
          return { data: [] };
      }

      const limit = 1000;
      const totalPages = Math.ceil(totalRecords / limit);

      for (let page = 1; page <= totalPages; page++) {
          try {
              const response = await calculosService.getDataByMachineComponentAndDates({
                  maquina: machineId,
                  componente: componentNameForAPI,
                  fecha_inicio: fromDateString,
                  fecha_fin: toDateString,
                  page,
                  limit,
              });

              if (response.data && Array.isArray(response.data)) {
                  allApiRecords = allApiRecords.concat(response.data);
              }

              if (onProgressUpdate) {
                  const transformedData = allApiRecords.map(recordToDataPoint(component)).filter(Boolean) as RawDataRecord[];
                  onProgressUpdate(transformedData, (page / totalPages) * 90);
              }
          } catch (error) {
              console.error(`Error fetching page ${page}:`, error);
              break;
          }
      }
  }
  
  if (!allApiRecords || allApiRecords.length === 0) {
    onProgressUpdate?.([], 100);
    return { data: [] };
  }

  const rawTransformedData = allApiRecords.map(recordToDataPoint(component, useAggregatedEndpoint ? 'monthly' : 'daily')).filter(Boolean) as RawDataRecord[];
  
  if (rawTransformedData.length === 0) {
    onProgressUpdate?.([], 100);
    return { data: [] };
  }

  const aggregatedData = useAggregatedEndpoint ? aggregateDataByMonth(rawTransformedData) : aggregateDataByDay(rawTransformedData);


  if (!aggregatedData || aggregatedData.length < 2) {
    onProgressUpdate?.([], 100);
    return { data: aggregatedData || [] };
  }
  
  // --- LÓGICA FINAL ROBUSTA ---
  
  // 1. Buscamos el valor en los datos (AHORA SÍ FUNCIONARÁ porque corregimos el nombre abajo)
  let finalCurrentLimit = [...aggregatedData].reverse().find(d => typeof d['Corriente Máxima'] === 'number' && d['Corriente Máxima'] > 0)?.['Corriente Máxima'];

  // 2. Si la DB sigue fallando (ej. columna vacía), usamos tus valores manuales
  if (!finalCurrentLimit) {
      finalCurrentLimit = getManualCurrentLimit(component.originalName, machineId);
  }

  // 3. Fallback de emergencia (estimación)
  if (!finalCurrentLimit) {
       const maxHistorico = Math.max(...aggregatedData.map(d => d['Corriente Promedio Suavizado'] || 0).filter(v => v !== null));
       finalCurrentLimit = maxHistorico > 0 ? maxHistorico * 1.25 : 0;
  }
  
  const lastKnownCurrentLimit = finalCurrentLimit || 0;
  const lastKnownUnbalanceLimit = [...aggregatedData].reverse().find(d => typeof d['Umbral Desbalance'] === 'number' && d['Umbral Desbalance'] > 0)?.['Umbral Desbalance'] ?? 0;
  const lastKnownLoadFactorLimit = [...aggregatedData].reverse().find(d => typeof d['Umbral Factor Carga'] === 'number' && d['Umbral Factor Carga'] > 0)?.['Umbral Factor Carga'] ?? 0;

  // 4. Rellenamos datos históricos para continuidad visual
  aggregatedData.forEach(d => {
      if (lastKnownCurrentLimit > 0) d['Corriente Máxima'] = lastKnownCurrentLimit;
      if (lastKnownUnbalanceLimit > 0) d['Umbral Desbalance'] = lastKnownUnbalanceLimit;
      if (lastKnownLoadFactorLimit > 0) d['Umbral Factor Carga'] = lastKnownLoadFactorLimit;
  });

  const projCorriente = calculateLinearRegressionAndProject(aggregatedData, "Corriente Promedio Suavizado", daysToProject);
  const projRefCorriente = calculateLinearRegressionAndProject(aggregatedData, "Referencia Corriente Promedio Suavizado", daysToProject);
  const projDesbalance = calculateLinearRegressionAndProject(aggregatedData, "Desbalance Suavizado", daysToProject);
  const projFactorCarga = calculateLinearRegressionAndProject(aggregatedData, "Factor De Carga Suavizado", daysToProject);

  const projectionPoints: ChartDataPoint[] = [];
  const lastDate = parseISO(aggregatedData[aggregatedData.length - 1].date);

  for (let i = 0; i < daysToProject; i++) {
      const newDate = addDays(lastDate, i + 1);
      const newPoint: ChartDataPoint = {
          date: formatISO(newDate, { representation: 'date' }),
          isProjection: true,
          componentId: component.id,

          "Corriente Máxima": lastKnownCurrentLimit,
          "proyeccion_corriente_tendencia": projCorriente.trend[i],
          "proyeccion_corriente_pesimista": projCorriente.pessimistic[i],
          "proyeccion_corriente_optimista": projCorriente.optimistic[i],
          "proyeccion_referencia_corriente_tendencia": projRefCorriente.trend[i],

          "Umbral Desbalance": lastKnownUnbalanceLimit,
          "proyeccion_desbalance_tendencia": projDesbalance.trend[i],
          "proyeccion_desbalance_pesimista": projDesbalance.pessimistic[i],
          "proyeccion_desbalance_optimista": projDesbalance.optimistic[i],

          "Umbral Factor Carga": lastKnownLoadFactorLimit,
          "proyeccion_factor_carga_tendencia": projFactorCarga.trend[i],
          "proyeccion_factor_carga_pesimista": projFactorCarga.pessimistic[i],
          "proyeccion_factor_carga_optimista": projFactorCarga.optimistic[i],
      };
      projectionPoints.push(newPoint);
  }
  
  let combinedData = [...aggregatedData, ...projectionPoints];

  onProgressUpdate?.([], 100);
  
  return { data: combinedData };

}

const recordToDataPoint = (component: Component, aggregation: 'daily' | 'monthly' = 'daily') => (record: any): RawDataRecord | null => {
  const safeNumber = (value: any): number | null => {
    const num = Number(value);
    return isNaN(num) || value === null ? null : num;
  };
  
  const isValidNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);

  let fechaDate;
  
  const year = safeNumber(record.AÑO);
  const month = safeNumber(record.MES_REFERENCIA) || safeNumber(record.MES); // Prioriza MES_REFERENCIA
  const day = aggregation === 'daily' ? safeNumber(record.DIA) : 15;

  if (!isValidNumber(year) || !isValidNumber(month) || !isValidNumber(day)) {
    return null; // Si la fecha es inválida, descartamos el registro completo.
  }

  if (aggregation === 'monthly') {
      fechaDate = new Date(year, month - 1, 15);
  } else {
      const hour = safeNumber(record.HORA) || 0;
      const minute = safeNumber(record.MINUTO) || 0;
      const second = safeNumber(record.SEGUNDO) || 0;
      fechaDate = new Date(year, month - 1, day, hour, minute, second);
  }

  // Comprobación final por si la fecha sigue siendo inválida por alguna razón (ej. día 32)
  if (isNaN(fechaDate.getTime())) {
    return null;
  }

  return {
    date: formatISO(fechaDate),
    isProjection: false,
    componentId: component.id,
    
    // Gráfico de Corriente: usa la columna CorrientePromedioSuavizado de la API.
    'Corriente Promedio Suavizado': safeNumber(record.CorrientePromedioSuavizado),
    
    // Gráfico de Corriente (Referencia): usa la columna Referencia_CorrientePromedioSuavizado de la API.
    'Referencia Corriente Promedio Suavizado': safeNumber(record.Referencia_CorrientePromedioSuavizado),

    // Gráfico de Desbalance: usa la columna DesbalanceSuavizado de la API.
    'Desbalance Suavizado': safeNumber(record.DesbalanceSuavizado),

    // Gráfico de Factor de Carga: usa la columna FactorDeCargaSuavizado de la API.
    'Factor De Carga Suavizado': safeNumber(record.FactorDeCargaSuavizado),

    // --- Límites ---
    'Corriente Máxima': safeNumber(record.Corriente_Max),
    'Umbral Desbalance': safeNumber(record.Umbral_Desbalance),
    'Umbral Factor Carga': safeNumber(record.Umbral_FactorCarga),
  };
};


export function calculateEMA(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
  }
  return ema;
}

