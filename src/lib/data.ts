

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
  "Referencia Desbalance Suavizado"?: number | null;
  "Umbral Desbalance"?: number | null;
  
  "Factor De Carga Suavizado"?: number | null;
  "Referencia Factor De Carga Suavizado"?: number | null;
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
    
    'Corriente Promedio Suavizado'?: number | null;
    'Referencia Corriente Promedio Suavizado'?: number | null;
    'Corriente Máxima'?: number | null;
    
    'Desbalance Suavizado'?: number | null;
    'Referencia Desbalance Suavizado'?: number | null;
    'Umbral Desbalance'?: number | null;
    
    'Factor De Carga Suavizado'?: number | null;
    'Referencia Factor De Carga Suavizado'?: number | null;
    'Umbral Factor Carga'?: number | null;
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
        refUnbalance: { sum: 0, count: 0 },
        load_factor: { sum: 0, count: 0 },
        refLoadFactor: { sum: 0, count: 0 },
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
        const refUnbalance = Number(record["Referencia Desbalance Suavizado"]);
        if (!isNaN(refUnbalance)) {
          metrics.refUnbalance.sum += refUnbalance;
          metrics.refUnbalance.count++;
        }
        const loadFactor = Number(record["Factor De Carga Suavizado"]);
        if (!isNaN(loadFactor)) {
          metrics.load_factor.sum += loadFactor;
          metrics.load_factor.count++;
        }
        const refLoadFactor = Number(record["Referencia Factor De Carga Suavizado"]);
        if (!isNaN(refLoadFactor)) {
          metrics.refLoadFactor.sum += refLoadFactor;
          metrics.refLoadFactor.count++;
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
        "Referencia Desbalance Suavizado": metrics.refUnbalance.count > 0 ? metrics.refUnbalance.sum / metrics.refUnbalance.count : null,
        "Umbral Desbalance": metrics.unbalance_limit.count > 0 ? metrics.unbalance_limit.sum / metrics.unbalance_limit.count : null,
        "Factor De Carga Suavizado": metrics.load_factor.count > 0 ? metrics.load_factor.sum / metrics.load_factor.count : null,
        "Referencia Factor De Carga Suavizado": metrics.refLoadFactor.count > 0 ? metrics.refLoadFactor.sum / metrics.refLoadFactor.count : null,
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
            refUnbalance: { sum: 0, count: 0 },
            load_factor: { sum: 0, count: 0 },
            refLoadFactor: { sum: 0, count: 0 },
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
            if (current !== null) { dayMetrics.current.sum += current; dayMetrics.current.count++; }
            const refCurrent = safeNumber(record["Referencia Corriente Promedio Suavizado"]);
            if (refCurrent !== null) { dayMetrics.refCurrent.sum += refCurrent; dayMetrics.refCurrent.count++; }
            const unbalance = safeNumber(record["Desbalance Suavizado"]);
            if (unbalance !== null) { dayMetrics.unbalance.sum += unbalance; dayMetrics.unbalance.count++; }
            const refUnbalance = safeNumber(record["Referencia Desbalance Suavizado"]);
            if (refUnbalance !== null) { dayMetrics.refUnbalance.sum += refUnbalance; dayMetrics.refUnbalance.count++; }
            const loadFactor = safeNumber(record["Factor De Carga Suavizado"]);
            if (loadFactor !== null) { dayMetrics.load_factor.sum += loadFactor; dayMetrics.load_factor.count++; }
            const refLoadFactor = safeNumber(record["Referencia Factor De Carga Suavizado"]);
            if (refLoadFactor !== null) { dayMetrics.refLoadFactor.sum += refLoadFactor; dayMetrics.refLoadFactor.count++; }
        }
        
        const newPoint: ChartDataPoint = {
            date: day,
            componentId: group.componentId,
            isProjection: false,
            "Corriente Promedio Suavizado": dayMetrics.current.count > 0 ? dayMetrics.current.sum / dayMetrics.current.count : null,
            "Referencia Corriente Promedio Suavizado": dayMetrics.refCurrent.count > 0 ? dayMetrics.refCurrent.sum / dayMetrics.refCurrent.count : null,
            "Corriente Máxima": currentLimit,
            "Desbalance Suavizado": dayMetrics.unbalance.count > 0 ? dayMetrics.unbalance.sum / dayMetrics.unbalance.count : null,
            "Referencia Desbalance Suavizado": dayMetrics.refUnbalance.count > 0 ? dayMetrics.refUnbalance.sum / dayMetrics.refUnbalance.count : null,
            "Umbral Desbalance": unbalanceLimit,
            "Factor De Carga Suavizado": dayMetrics.load_factor.count > 0 ? dayMetrics.load_factor.sum / dayMetrics.load_factor.count : null,
            "Referencia Factor De Carga Suavizado": dayMetrics.refLoadFactor.count > 0 ? dayMetrics.refLoadFactor.sum / dayMetrics.refLoadFactor.count : null,
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
    return { data: [] };
  }

const recordToDataPoint = (component: Component, aggregation: 'daily' | 'monthly' = 'daily') => (record: any): RawDataRecord | null => {
  const safeNumber = (value: any): number | null => {
    const num = Number(value);
    return isNaN(num) || value === null ? null : num;
  };

  const isValidNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);

  const year = safeNumber(record.Año);
  // Usa MES_REFERENCIA si está disponible, si no, usa Mes
  const month = safeNumber(record.MES_REFERENCIA || record.Mes);
  const day = safeNumber(record.Dia);

  if (!isValidNumber(year) || !isValidNumber(month)) {
    return null;
  }
  
  let fechaDate;
  if (aggregation === 'monthly') {
      fechaDate = new Date(year, month - 1, 15);
  } else {
    if (!isValidNumber(day)) return null;
      const hour = safeNumber(record.Hora) || 0;
      const minute = safeNumber(record.Minuto) || 0;
      const second = safeNumber(record.Segundo) || 0;
      fechaDate = new Date(year, month - 1, day, hour, minute, second);
  }

  if (isNaN(fechaDate.getTime())) {
    return null;
  }

  return {
    date: formatISO(fechaDate),
    isProjection: false,
    componentId: component.id,
    
    // Corriente
    'Corriente Promedio Suavizado': safeNumber(record.CorrientePromedioSuavizado),
    'Referencia Corriente Promedio Suavizado': safeNumber(record.Referencia_CorrientePromedioSuavizado),
    'Corriente Máxima': safeNumber(record.Corriente_Max),

    // Desbalance
    'Desbalance Suavizado': safeNumber(record.Desbalance_Suavizado || record.DesbalanceSuavizado),
    'Referencia Desbalance Suavizado': safeNumber(record.Referencia_DesbalanceSuavizado),
    'Umbral Desbalance': safeNumber(record.Umbral_Desbalance),
    
    // Factor de Carga
    'Factor De Carga Suavizado': safeNumber(record.FactorDeCargaSuavizado),
    'Referencia Factor De Carga Suavizado': safeNumber(record.Referencia_FactorDeCargaSuavizado),
    'Umbral Factor Carga': safeNumber(record.Umbral_Factor_Carga),
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

    