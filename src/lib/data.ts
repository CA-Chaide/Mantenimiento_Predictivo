
import { eachDayOfInterval, formatISO, isBefore, parseISO, differenceInDays, max as dateMax } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type Machine = { id: string; name: string };
export type MachineId = string;
export type Component = { id: string; name: string; originalName: string };

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
const generateProjection = (historicalData: { realValue: number | null }[], projectionLength: number) => {
  const series = historicalData.map(p => p.realValue).filter(v => v !== null) as number[];
  
  if (series.length < 2) {
    const lastVal = series.length > 0 ? series[series.length - 1] : 0;
    return Array(projectionLength).fill(lastVal);
  }

  // Use the last 30 points for the trend calculation.
  const history = series.slice(-30);
  const n = history.length;

  if (n < 2) {
    const lastVal = n > 0 ? history[n - 1] : 0;
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
    const xFuture = n + i;
    let predicted = slope * xFuture + intercept;
    
    // Add some random noise to make the projection look less perfect.
    // The uncertainty (noise) should grow slightly over time.
    const noiseScale = (predicted > 1 ? 0.05 : 0.008) * (1 + i / projectionLength * 0.5); 
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
            return { base: 3.75, volatility: 2.5, min: 2.0, max: 15.0, limit: 13.0, ref: 8.0, jitter: 0.5 };
        case 'unbalance':
            return { base: 0.11, volatility: 0.03, min: 0.05, max: 0.55, limit: 0.50, ref: 0.35, jitter: 0.01 };
        case 'load_factor':
            return { base: 0.33, volatility: 0.06, min: 0.1, max: 0.9, limit: 0.85, ref: 0.6, jitter: 0.03 };
    }
}

export function useMaintenanceData(machineId: MachineId, dateRange: DateRange, simulatedToday: Date) {
  const minDataDate = new Date('2025-04-10T00:00:00Z');
  
  if (!dateRange.from || !dateRange.to || !machineId) {
    return { data: [], aprilData: [] };
  }
  
  const correctedFrom = dateMax([dateRange.from, minDataDate]);
  
  const allDays = eachDayOfInterval({ start: correctedFrom, end: dateRange.to });

  const allMetrics: ('current' | 'unbalance' | 'load_factor')[] = ['current', 'unbalance', 'load_factor'];
  
  const aprilStartDate = new Date('2025-04-10T00:00:00Z');
  const aprilEndDate = new Date('2025-04-30T00:00:00Z');
  const aprilDays = eachDayOfInterval({ start: aprilStartDate, end: aprilEndDate });

  const aprilDataStore: Record<string, Record<string, number[]>> = {};

  const componentsForMachine: Component[] = [
    { id: 'motor_mixer', name: 'Motor Mixer', originalName: 'Motor Mixer' }, 
    { id: 'motor_banda_looper', name: 'Motor Banda Looper', originalName: 'Motor Banda Looper' }, 
    { id: 'motor_cuchilla_looper', name: 'Motor Cuchilla Looper', originalName: 'Motor Cuchilla Looper' }, 
    { id: 'motor_elevacion_derecha', name: 'Motor Elevación Derecha', originalName: 'Motor Elevación Derecha' }, 
    { id: 'motor_traslacion_der_izq', name: 'Motor Traslación Der/Izq', originalName: 'Motor Traslación Der/Izq' }, 
    { id: 'motor_elevacion_izquierdo', name: 'Motor Elevación Izquierdo', originalName: 'Motor Elevación Izquierdo' }, 
    { id: 'motor_cuchilla_t8', name: 'Motor Cuchilla T8', originalName: 'Motor Cuchilla T8' }, 
    { id: 'motor_traslacion_t8', name: 'Motor Traslacion T8', originalName: 'Motor Traslacion T8' }
  ];

  componentsForMachine.forEach((component) => {
    aprilDataStore[component.id] = {};
    allMetrics.forEach(metric => {
        const config = getMetricConfig(metric);
        // We use a seeded random generator for the April baseline so it's consistent.
        const createSeededRandom = (seed: number) => () => {
            let t = (seed += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const seed = machineId.length + component.id.length + metric.length;
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
  
  componentsForMachine.forEach((component) => {
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

export async function useRealMaintenanceData(
  machineId: MachineId,
  component: Component,
  dateRange: DateRange,
  calculosService: any,
  onProgressUpdate?: (data: ChartDataPoint[], progress: number) => void
) {
  if (!dateRange.from || !dateRange.to || !machineId || !component) {
    return { data: [], aprilData: [] };
  }

  try {
    const fromDateString = formatISO(dateRange.from, { representation: 'date' });
    const toDateString = formatISO(dateRange.to, { representation: 'date' });

    // Usar el nombre original del componente para la petición al backend
    const componentNameForAPI = component.originalName;

    // Primero, obtener el total de registros para saber cuántas páginas hay
    const totalResponse = await calculosService.getTotalByMaquinaAndComponente(
      machineId, 
      componentNameForAPI,
      fromDateString,
      toDateString
    );
    const totalRecords = totalResponse.total || 0;

    console.log('useRealMaintenanceData - Total de registros:', totalRecords);

    if (totalRecords === 0) {
      return { data: [], aprilData: [] };
    }

    // Calcular número de páginas basado en el total
    const limit = 1000;
    const totalPages = Math.ceil(totalRecords / limit);

    // Obtener la primera página
    const firstResponse = await calculosService.getDataByMachineComponentAndDates({
      maquina: machineId,
      componente: componentNameForAPI,
      fecha_inicio: fromDateString,
      fecha_fin: toDateString,
      page: 1,
      limit,
    });

    let allRecords: any[] = firstResponse.data || [];

    // Notificar progreso de la primera página
    if (onProgressUpdate && allRecords.length > 0) {
      const transformedData: ChartDataPoint[] = allRecords
        .filter((record: any) => {
          return record.AÑO && record.MES && record.DIA;
        })
        .map((record: any) => {
          const fechaDate = new Date(
            record.AÑO,
            record.MES - 1,
            record.DIA,
            record.HORA || 0,
            record.MINUTO || 0,
            record.SEGUNDO || 0
          );
          const fecha = formatISO(fechaDate, { representation: 'date' });

          return {
            date: fecha,
            isProjection: false,
            componentId: component.id,
            metric: 'current',
            realValue: typeof record.PromedioSuavizado === 'number' ? Number(record.PromedioSuavizado) : null,
            minValue: null,
            maxValue: typeof record.CORREINTEMAX === 'number' ? Number(record.CORREINTEMAX) : null,
            aprilBaseline: null,
            predictedValue: null,
            'Corriente Promedio Suavizado': typeof record.PromedioSuavizado === 'number' ? Number(record.PromedioSuavizado) : undefined,
            'Corriente Máxima': typeof record.CORREINTEMAX === 'number' ? Number(record.CORREINTEMAX) : undefined,
            'Referencia Corriente Promedio Suavizado': typeof record.PROMEDIO === 'number' ? Number(record.PROMEDIO) : undefined,
            'Desbalance Suavizado': typeof record.DesbalanceSuavizado === 'number' ? Number(record.DesbalanceSuavizado) : undefined,
            'Umbral Desbalance': typeof record.Umbral_Desbalance === 'number' ? Number(record.Umbral_Desbalance) : undefined,
            'Referencia Desbalance Suavizado': typeof record.DesbalancePorcentual === 'number' ? Number(record.DesbalancePorcentual) : undefined,
            'Factor De Carga Suavizado': typeof record.FactorDeCargaSuavizado === 'number' ? Number(record.FactorDeCargaSuavizado) : undefined,
            'Umbral Factor Carga': typeof record.Umbral_FactorCarga === 'number' ? Number(record.Umbral_FactorCarga) : undefined,
            'Referencia Factor De Carga Suavizado': typeof record.FactorDeCarga === 'number' ? Number(record.FactorDeCarga) : undefined,
          } as ChartDataPoint;
        });

      onProgressUpdate(transformedData, (1 / totalPages) * 100);
    }

    // Si hay más páginas, obtenerlas en paralelo
    if (totalPages > 1) {
      const promesas = [];
      for (let page = 2; page <= totalPages; page++) {
        promesas.push(
          calculosService.getDataByMachineComponentAndDates({
            maquina: machineId,
            componente: componentNameForAPI,
            fecha_inicio: fromDateString,
            fecha_fin: toDateString,
            page,
            limit,
          })
        );
      }

      // Esperar todas las respuestas en paralelo
      const todasLasPaginas = await Promise.all(promesas);

      // Combinar todos los datos
      todasLasPaginas.forEach((pageData) => {
        if (pageData.data && Array.isArray(pageData.data)) {
          allRecords = [...allRecords, ...pageData.data];
        }
      });

      // Notificar progreso al 100% con todos los datos
      if (onProgressUpdate) {
        const transformedData: ChartDataPoint[] = allRecords
          .filter((record: any) => {
            return record.AÑO && record.MES && record.DIA;
          })
          .map((record: any) => {
            const fechaDate = new Date(
              record.AÑO,
              record.MES - 1,
              record.DIA,
              record.HORA || 0,
              record.MINUTO || 0,
              record.SEGUNDO || 0
            );
            const fecha = formatISO(fechaDate, { representation: 'date' });

            return {
              date: fecha,
              isProjection: false,
              componentId: component.id,
              metric: 'current',
              realValue: typeof record.PromedioSuavizado === 'number' ? Number(record.PromedioSuavizado) : null,
              minValue: null,
              maxValue: typeof record.CORREINTEMAX === 'number' ? Number(record.CORREINTEMAX) : null,
              aprilBaseline: null,
              predictedValue: null,
              'Corriente Promedio Suavizado': typeof record.PromedioSuavizado === 'number' ? Number(record.PromedioSuavizado) : undefined,
              'Corriente Máxima': typeof record.CORREINTEMAX === 'number' ? Number(record.CORREINTEMAX) : undefined,
              'Referencia Corriente Promedio Suavizado': typeof record.PROMEDIO === 'number' ? Number(record.PROMEDIO) : undefined,
              'Desbalance Suavizado': typeof record.DesbalanceSuavizado === 'number' ? Number(record.DesbalanceSuavizado) : undefined,
              'Umbral Desbalance': typeof record.Umbral_Desbalance === 'number' ? Number(record.Umbral_Desbalance) : undefined,
              'Referencia Desbalance Suavizado': typeof record.DesbalancePorcentual === 'number' ? Number(record.DesbalancePorcentual) : undefined,
              'Factor De Carga Suavizado': typeof record.FactorDeCargaSuavizado === 'number' ? Number(record.FactorDeCargaSuavizado) : undefined,
              'Umbral Factor Carga': typeof record.Umbral_FactorCarga === 'number' ? Number(record.Umbral_FactorCarga) : undefined,
              'Referencia Factor De Carga Suavizado': typeof record.FactorDeCarga === 'number' ? Number(record.FactorDeCarga) : undefined,
            } as ChartDataPoint;
          });

        onProgressUpdate(transformedData, 100);
      }
    }

    // Los datos ya fueron transformados y enviados via callback
    // Solo retornamos los datos finales
    const finalData: ChartDataPoint[] = allRecords
      .filter((record: any) => {
        return record.AÑO && record.MES && record.DIA;
      })
      .map((record: any) => {
        const fechaDate = new Date(
          record.AÑO,
          record.MES - 1,
          record.DIA,
          record.HORA || 0,
          record.MINUTO || 0,
          record.SEGUNDO || 0
        );
        const fecha = formatISO(fechaDate, { representation: 'date' });

        return {
          date: fecha,
          isProjection: false,
          componentId: component.id,
          metric: 'current',
          realValue: typeof record.PromedioSuavizado === 'number' ? Number(record.PromedioSuavizado) : null,
          minValue: null,
          maxValue: typeof record.CORREINTEMAX === 'number' ? Number(record.CORREINTEMAX) : null,
          aprilBaseline: null,
          predictedValue: null,
          'Corriente Promedio Suavizado': typeof record.PromedioSuavizado === 'number' ? Number(record.PromedioSuavizado) : undefined,
          'Corriente Máxima': typeof record.CORREINTEMAX === 'number' ? Number(record.CORREINTEMAX) : undefined,
          'Referencia Corriente Promedio Suavizado': typeof record.PROMEDIO === 'number' ? Number(record.PROMEDIO) : undefined,
          'Desbalance Suavizado': typeof record.DesbalanceSuavizado === 'number' ? Number(record.DesbalanceSuavizado) : undefined,
          'Umbral Desbalance': typeof record.Umbral_Desbalance === 'number' ? Number(record.Umbral_Desbalance) : undefined,
          'Referencia Desbalance Suavizado': typeof record.DesbalancePorcentual === 'number' ? Number(record.DesbalancePorcentual) : undefined,
          'Factor De Carga Suavizado': typeof record.FactorDeCargaSuavizado === 'number' ? Number(record.FactorDeCargaSuavizado) : undefined,
          'Umbral Factor Carga': typeof record.Umbral_FactorCarga === 'number' ? Number(record.Umbral_FactorCarga) : undefined,
          'Referencia Factor De Carga Suavizado': typeof record.FactorDeCarga === 'number' ? Number(record.FactorDeCarga) : undefined,
        } as ChartDataPoint;
      });

    console.log('Datos transformados finales:', finalData.length, 'registros');
    return { data: finalData, aprilData: [] };
  } catch (error) {
    console.error('Error en useRealMaintenanceData:', error);
    return { data: [], aprilData: [] };
  }
}

// ============ FUNCIONES DE SUAVIZADO ============

/**
 * Media Móvil Exponencial (EMA)
 * Los valores recientes tienen más peso
 * alpha: factor de suavizado (0-1), valores altos = más peso a valores recientes
 */
export function calculateEMA(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
  }
  return ema;
}

/**
 * Suavizado Holt-Winters
 * Captura tendencia y estacionalidad
 */
export function calculateHoltWinters(
  values: number[],
  alpha: number = 0.3,
  beta: number = 0.1,
  gamma: number = 0.1,
  seasonLength: number = 8 // 24 horas / 3 horas por punto
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

/**
 * Spline cúbico (implementación simplificada)
 * Usa interpolación de Catmull-Rom para una curva muy suave
 */
export function calculateCubicSpline(values: number[]): number[] {
  if (values.length < 2) return values;

  const result: number[] = [];
  const n = values.length;

  // Crear puntos con padding
  const padded = [values[0], ...values, values[n - 1]];

  for (let i = 0; i < n - 1; i++) {
    const p0 = padded[i];
    const p1 = padded[i + 1];
    const p2 = padded[i + 2];
    const p3 = padded[i + 3];

    // Usar interpolación Catmull-Rom
    // Interpolamos entre p1 y p2 con 4 puntos de control
    for (let t = 0; t < 1; t += 0.5) {
      const t2 = t * t;
      const t3 = t2 * t;

      const v =
        0.5 *
        (2 * p1 +
          (-p0 + p2) * t +
          (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
          (-p0 + 3 * p1 - 3 * p2 + p3) * t3);

      result.push(v);
    }
  }

  // Agregar el último punto
  result.push(values[n - 1]);

  return result;
}

