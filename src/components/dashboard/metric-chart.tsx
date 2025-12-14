
"use client";

import {
  format, parseISO
} from "date-fns";
import { es } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import { ChartDataPoint } from "@/lib/data";
import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricChartProps {
  data: ChartDataPoint[];
  valueKey: keyof ChartDataPoint;
  referenceKey?: keyof ChartDataPoint;
  limitKey: keyof ChartDataPoint;
  limitLabel: string;
  predictionKey: keyof ChartDataPoint;
  predictionPesimisticKey: keyof ChartDataPoint;
  predictionOptimisticKey: keyof ChartDataPoint;
  referencePredictionKey?: keyof ChartDataPoint;
  yAxisLabel: string;
  componentId: string;
  metric: 'current' | 'unbalance' | 'load_factor';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    let formattedLabel = label;
    try {
      // YYYY-MM-DD HH:mm
      formattedLabel = format(parseISO(label), "dd MMM HH:mm", { locale: es });
    } catch {
      // fallback if parsing fails
    }
    
    const relevantPayload = payload.filter(p => p.value !== null && p.value !== undefined);

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-bold">{formattedLabel}</p>
        {relevantPayload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="text-sm">
            {`${p.name}: ${p.value.toFixed(3)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const projectionTooltips: Record<string, string> = {
    "Proyección Tendencia": "Estimación futura basada en la tendencia histórica (Regresión Lineal).",
    "Proyección Pesimista": "Escenario de degradación acelerada (Regresión Lineal con pendiente aumentada).",
    "Proyección Optimista": "Escenario de degradación lenta (Regresión Lineal con pendiente suavizada)."
};

const renderLegendText = (value: string, entry: any) => {
    const tooltipText = projectionTooltips[value];

    if (tooltipText) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="cursor-help border-b border-dashed border-slate-400">{value}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    return value;
};


export function MetricChart({
  data,
  valueKey,
  referenceKey,
  limitKey,
  limitLabel,
  predictionKey,
  predictionPesimisticKey,
  predictionOptimisticKey,
  referencePredictionKey,
  componentId,
  metric,
  yAxisLabel
}: MetricChartProps) {

  const tickFormatter = (str: string) => {
    try {
      return format(parseISO(str), "dd MMM HH:mm", { locale: es });
    } catch {
      return str;
    }
  };

  const sortedData = React.useMemo(() => 
    [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );

  return (
    <div className="space-y-4">
      <div className="h-[400px] w-full">
        <ResponsiveContainer>
          <ComposedChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fill: '#64748b' }}
              stroke="#e2e8f0"
              interval="preserveStartEnd"
              minTickGap={80}
            />
            <YAxis
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b' }}
              tick={{ fill: '#64748b' }}
              stroke="#e2e8f0"
              domain={['dataMin - 1', 'auto']}
              allowDataOverflow={true}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend formatter={renderLegendText} />

            <defs>
              <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <Area
              type="monotone"
              dataKey={(point) => point.isProjection ? null : point[valueKey]}
              name="Promedio Diario"
              stroke="#0284c7"
              fillOpacity={1}
              fill={`url(#color${metric})`}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />

            {referenceKey && (
              <Line
                type="monotone"
                dataKey={referenceKey as string}
                name="Referencia"
                stroke="#f59e0b" // Naranja
                strokeWidth={2}
                dot={false}
                connectNulls={true}
              />
            )}

            <Line
              type="monotone"
              dataKey={limitKey as string}
              name={limitLabel}
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
              connectNulls={true}
            />

            <Line
              type="monotone"
              dataKey={predictionKey.toString()}
              name="Proyección Tendencia"
              stroke="#9333ea"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey={predictionPesimisticKey.toString()}
              name="Proyección Pesimista"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />

             <Line
              type="monotone"
              dataKey={predictionOptimisticKey.toString()}
              name="Proyección Optimista"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
