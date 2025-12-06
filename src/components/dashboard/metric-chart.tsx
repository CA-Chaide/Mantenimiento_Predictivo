
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { ChartDataPoint } from "@/lib/data";
import React from "react";

interface MetricChartProps {
  data: ChartDataPoint[];
  aprilData: ChartDataPoint[];
  valueKey: keyof ChartDataPoint;
  limitKey: keyof ChartDataPoint;
  limitLabel: string;
  refKey: keyof ChartDataPoint;
  predictionKey: keyof ChartDataPoint;
  aprilKey: keyof ChartDataPoint;
  yAxisLabel: string;
  componentId: string;
  metric: 'current' | 'unbalance' | 'load_factor';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    let formattedLabel = label;
    try {
      // Assuming label is a date string like "2025-10-20"
      formattedLabel = format(parseISO(label), "PPP", { locale: es });
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

export function MetricChart({
  data,
  valueKey,
  limitKey,
  limitLabel,
  refKey,
  componentId,
  metric
}: MetricChartProps) {
  
  const metricData = data
    .filter(d => d.componentId === componentId) // This is now redundant if data is pre-filtered
    .map(d => ({
      date: d.date, // Already in "YYYY-MM-DD"
      // Graph will show the daily average
      [valueKey as string]: d[metric].avg,
      // We use the `max` value for the limit comparison and status
      realValue: d[metric].max,
      // The limit and ref should be consistent per day
      [limitKey as string]: d[limitKey] as number | null,
      [refKey as string]: d[refKey] as number | null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      <div className="h-[400px] w-full">
        <ResponsiveContainer>
          <AreaChart data={metricData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(str) => {
                try {
                  return format(parseISO(str), "dd MMM", { locale: es });
                } catch {
                  return str;
                }
              }}
              tick={{ fill: '#64748b' }}
              stroke="#e2e8f0"
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: '#64748b' }}
              stroke="#e2e8f0"
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            <defs>
              <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <Area
              type="monotone"
              dataKey={valueKey.toString()}
              name="Promedio Diario"
              stroke="#0284c7"
              fillOpacity={1}
              fill={`url(#color${metric})`}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey={limitKey as string}
              name={limitLabel}
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
            />
            
            <Line
              type="monotone"
              dataKey={refKey as string}
              name="Referencia"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
