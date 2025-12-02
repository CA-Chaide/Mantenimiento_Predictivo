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
    value: string;
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

type MetricInfo = { real: number | null; limit: number | undefined };
const getMetricInfo = (metric: ChartDataPoint): MetricInfo => {
  if (metric.metric === 'current') {
    return { 
      real: metric["Corriente Promedio Suavizado"] as number | null, 
      limit: metric["Corriente Máxima"] 
    };
  }
  if (metric.metric === 'unbalance') {
    return { 
      real: metric["Desbalance Suavizado"] as number | null, 
      limit: metric["Umbral Desbalance"]
    };
  }
  if (metric.metric === 'load_factor') {
    return { 
      real: metric["Factor De Carga Suavizado"] as number | null, 
      limit: metric["Umbral Factor Carga"]
    };
  }
  return { real: null, limit: undefined };
};

const getLastRealPoint = (metricData: ChartDataPoint[]): ChartDataPoint | undefined => {
    return [...metricData].reverse().find(d => !d.isProjection && d.realValue != null);
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

  for (const metric of metrics) {
    const metricData = componentData.filter(d => d.metric === metric);
    const lastRealPoint = getLastRealPoint(metricData);
    
    let metricStatus: Status = 'normal';
    let realVal = null;
    let limitVal = undefined;

    if (lastRealPoint) {
        const info = getMetricInfo(lastRealPoint);
        realVal = info.real;
        limitVal = info.limit;
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
        const projectionData = metricData.filter(d => d.isProjection && d.predictedValue != null);
        for (const point of projectionData) {
            const limit = getMetricInfo(point).limit;
            if (point.predictedValue != null && limit != null && point.predictedValue >= limit) {
                metricStatus = 'warning';
                if (worstStatus === 'normal') {
                    worstStatus = 'warning';
                    worstMessage = `Proyección de ${getMetricName(metric)} alcanzará el límite`;
                    details = { metric, projectedDate: format(parseISO(point.date), "MMM, yyyy"), currentValue: realVal, limitValue: limit };
                }
                break; 
            }
        }
    }

    allMetricsData.push({
      metric: getMetricName(metric),
      value: `${realVal?.toFixed(2) ?? 'N/A'} / ${limitVal?.toFixed(2) ?? 'N/A'}`,
      status: metricStatus
    });
  }

  return { status: worstStatus, message: worstMessage, componentName, details, allMetrics: allMetricsData };
};
