"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChartDataPoint } from "@/lib/data";
import { format } from "date-fns";

type Status = 'normal' | 'warning' | 'critical';

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
  };

  const { color, label } = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("size-4 rounded-full", color, status === 'critical' && 'animate-pulse')} />
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
    return [...metricData].reverse().find(d => d.realValue != null);
}

export const getComponentStatus = (componentData: ChartDataPoint[], componentName: string): ComponentStatus => {
  let worstStatus: Status = 'normal';
  let worstMessage = 'Operación Normal';
  let details: ComponentStatus['details'] = { metric: 'none' };

  const metrics: ('current' | 'unbalance' | 'load_factor')[] = ['current', 'unbalance', 'load_factor'];
  const allMetricsData: ComponentStatus['allMetrics'] = [];

  for (const metric of metrics) {
    const metricData = componentData.filter(d => d.metric === metric);
    const lastRealPoint = getLastRealPoint(metricData);
    
    let realVal = null;
    let limitVal = undefined;

    if (lastRealPoint) {
        const info = getMetricInfo(lastRealPoint);
        realVal = info.real;
        limitVal = info.limit;
        allMetricsData.push({
          metric: getMetricName(metric),
          value: `${realVal?.toFixed(2) ?? 'N/A'} / ${limitVal?.toFixed(2) ?? 'N/A'}`
        });
    }

    // Check for Critical status
    if (realVal != null && limitVal != null && realVal >= limitVal) {
      return {
        status: 'critical',
        message: `${getMetricName(metric)} excede el límite`,
        componentName,
        details: {
          metric: metric,
          currentValue: realVal,
          limitValue: limitVal
        },
        allMetrics: allMetricsData
      };
    }
    
    // Check for Warning status
    let isWarning = false;
    let warningMessage = '';
    let warningDetails: ComponentStatus['details'] = { metric: 'none' };

    // 1. Check current value against 85% of limit
    if (realVal != null && limitVal != null && realVal >= limitVal * 0.85) {
        isWarning = true;
        warningMessage = `${getMetricName(metric)} se acerca al límite (${((realVal/limitVal)*100).toFixed(0)}%)`;
        warningDetails = {
            metric,
            currentValue: realVal,
            limitValue: limitVal,
        };
    }

    // 2. Check if projection hits the limit
    const projectionData = metricData.filter(d => d.isProjection && d.predictedValue != null);
    for (const point of projectionData) {
        const limit = getMetricInfo(point).limit;
        if (point.predictedValue != null && limit != null && point.predictedValue >= limit) {
            isWarning = true;
            warningMessage = `Proyección de ${getMetricName(metric)} alcanzará el límite`;
            warningDetails = {
                metric,
                projectedDate: format(new Date(point.date), "MMM, yyyy")
            };
            break; 
        }
    }
    
    if (isWarning && worstStatus === 'normal') {
        worstStatus = 'warning';
        worstMessage = warningMessage;
        details = warningDetails;
    }
  }

  return { status: worstStatus, message: worstMessage, componentName, details, allMetrics: allMetricsData };
};
