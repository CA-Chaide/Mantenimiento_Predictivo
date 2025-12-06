"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChartDataPoint } from "@/lib/data";
import { format, parseISO } from "date-fns";

type Status = 'normal' | 'warning' | 'critical' | 'unknown';

export interface ComponentStatus {
  status: Status;
  message: string;
  componentName: string;
  details: {
    metric: 'current' | 'unbalance' | 'load_factor' | 'none';
    currentValue?: number | null;
    limitValue?: number;
    projectedDate?: string;
  };
  allMetrics: {
    metric: string;
    value: number | null;
    limit: number | undefined;
    status: Status;
  }[];
}

interface StatusIndicatorProps {
  status: Status;
  message: string;
}

export function StatusIndicator({ status, message }: StatusIndicatorProps) {
  const statusConfig = {
    normal: {
      color: "bg-green-500",
      label: "Normal",
    },
    warning: {
      color: "bg-yellow-500",
      label: "Alerta",
    },
    critical: {
      color: "bg-red-500",
      label: "Crítico",
    },
    unknown: {
        color: "bg-slate-300",
        label: "Desconocido"
    }
  };

  const { color, label } = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("size-5 rounded-full", color, status === 'critical' && 'animate-pulse')} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Estado: {label} ({message})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const getMetricName = (metric: 'current' | 'unbalance' | 'load_factor') => {
  switch (metric) {
    case 'current': return 'Corriente';
    case 'unbalance': return 'Desbalance';
    case 'load_factor': return 'Factor de Carga';
  }
};

const getMetricKeys = (metric: 'current' | 'unbalance' | 'load_factor') => {
  switch (metric) {
    case 'current':
      return {
        valueKey: 'Corriente Promedio Suavizado',
        limitKey: 'Corriente Máxima',
        projKey: 'proyeccion_corriente_tendencia',
      };
    case 'unbalance':
      return {
        valueKey: 'Desbalance Suavizado',
        limitKey: 'Umbral Desbalance',
        projKey: 'proyeccion_desbalance_tendencia',
      };
    case 'load_factor':
      return {
        valueKey: 'Factor De Carga Suavizado',
        limitKey: 'Umbral Factor Carga',
        projKey: 'proyeccion_factor_carga_tendencia',
      };
  }
};


const getLastRealPoint = (componentData: ChartDataPoint[]): ChartDataPoint | undefined => {
    return [...componentData].reverse().find(d => !d.isProjection);
}

export const getComponentStatus = (componentData: ChartDataPoint[], componentName: string): ComponentStatus => {
  
  if (!componentData || componentData.length === 0) {
    return {
      status: 'unknown',
      message: 'No hay datos disponibles',
      componentName,
      details: { metric: 'none' },
      allMetrics: []
    };
  }
  
  let worstStatus: Status = 'normal';
  let worstMessage = 'Operación Normal';
  let details: ComponentStatus['details'] = { metric: 'none' };

  const metrics: ('current' | 'unbalance' | 'load_factor')[] = ['current', 'unbalance', 'load_factor'];
  const allMetricsData: ComponentStatus['allMetrics'] = [];
  const lastRealPoint = getLastRealPoint(componentData);

  for (const metric of metrics) {
    const { valueKey, limitKey, projKey } = getMetricKeys(metric);
    
    let metricStatus: Status = 'normal';
    let realVal = null;
    let limitVal = undefined;

    if (lastRealPoint) {
        realVal = lastRealPoint[valueKey] as number | null;
        limitVal = lastRealPoint[limitKey] as number | undefined;
    }

    // Check for Critical status
    if (realVal != null && limitVal != null && realVal >= limitVal) {
      metricStatus = 'critical';
      if (worstStatus !== 'critical') {
        worstStatus = 'critical';
        worstMessage = `${getMetricName(metric)} excede el límite`;
        details = { metric: metric, currentValue: realVal, limitValue: limitVal };
      }
    }
    
    // Check for Warning status if not already critical
    if (metricStatus !== 'critical') {
        // 1. Check current value against 85% of limit
        if (realVal != null && limitVal != null && realVal >= limitVal * 0.85) {
            metricStatus = 'warning';
             if (worstStatus === 'normal') {
                worstStatus = 'warning';
                worstMessage = `${getMetricName(metric)} se acerca al límite (${((realVal/limitVal)*100).toFixed(0)}%)`;
                details = { metric, currentValue: realVal, limitValue: limitVal };
            }
        }

        // 2. Check if projection hits the limit
        const projectionData = componentData.filter(d => d.isProjection && d[projKey] != null);
        for (const point of projectionData) {
            const limit = point[limitKey] as number | undefined;
            const projValue = point[projKey] as number | undefined;

            if (projValue != null && limit != null && projValue >= limit) {
                metricStatus = 'warning';
                if (worstStatus === 'normal') {
                    worstStatus = 'warning';
                    worstMessage = `Proyección de ${getMetricName(metric)} alcanzará el límite`;
                    details = { metric, projectedDate: point.date, currentValue: realVal, limitValue: limit };
                }
                break; 
            }
        }
    }

    allMetricsData.push({
      metric: getMetricName(metric),
      value: realVal,
      limit: limitVal,
      status: metricStatus
    });
  }

  return { status: worstStatus, message: worstMessage, componentName, details, allMetrics: allMetricsData };
};
