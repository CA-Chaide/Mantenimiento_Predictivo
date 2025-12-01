"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChartDataPoint } from "@/lib/data";

type Status = 'normal' | 'warning' | 'critical';

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

const getMetricInfo = (metric: ChartDataPoint) => {
  if (metric.metric === 'current') {
    return { 
      real: metric["Corriente Promedio Suavizado"], 
      limit: metric["Corriente Máxima"] 
    };
  }
  if (metric.metric === 'unbalance') {
    return { 
      real: metric["Desbalance Suavizado"], 
      limit: metric["Umbral Desbalance"] 
    };
  }
  if (metric.metric === 'load_factor') {
    return { 
      real: metric["Factor De Carga Suavizado"], 
      limit: metric["Umbral Factor Carga"]
    };
  }
  return { real: null, limit: Infinity };
};

export const getComponentStatus = (componentData: ChartDataPoint[]): { status: Status, message: string } => {
  let worstStatus: Status = 'normal';
  let worstMessage = 'Operación Normal';

  const metrics: ('current' | 'unbalance' | 'load_factor')[] = ['current', 'unbalance', 'load_factor'];

  for (const metric of metrics) {
    const metricData = componentData.filter(d => d.metric === metric);
    
    // Check for Critical status
    const lastRealPoint = [...metricData].reverse().find(d => d.realValue != null);
    if (lastRealPoint) {
      const { real, limit } = getMetricInfo(lastRealPoint);
      if (real != null && limit != null && real >= limit) {
        return { status: 'critical', message: `${getMetricName(metric)} excede el límite` };
      }
    }
    
    // Check for Warning status (including projections)
    let isWarning = false;
    let warningMessage = '';

    // 1. Check current value against 85% of limit
    if (lastRealPoint) {
        const { real, limit } = getMetricInfo(lastRealPoint);
        if (real != null && limit != null && real >= limit * 0.85) {
            isWarning = true;
            warningMessage = `${getMetricName(metric)} se acerca al límite (al ${((real/limit)*100).toFixed(0)}%)`;
        }
    }

    // 2. Check if projection hits the limit
    const projectionData = metricData.filter(d => d.isProjection && d.predictedValue != null);
    for (const point of projectionData) {
        const limit = getMetricInfo(point).limit;
        if (point.predictedValue != null && limit != null && point.predictedValue >= limit) {
            isWarning = true;
            warningMessage = `Proyección de ${getMetricName(metric)} alcanzará el límite`;
            break; 
        }
    }
    
    if (isWarning && worstStatus === 'normal') {
        worstStatus = 'warning';
        worstMessage = warningMessage;
    }
  }

  return { status: worstStatus, message: worstMessage };
};
