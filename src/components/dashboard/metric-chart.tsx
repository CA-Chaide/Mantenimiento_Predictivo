"use client";

import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from "recharts";
import { ChartDataPoint } from "@/lib/data";

interface MetricChartProps {
  data: ChartDataPoint[];
  aprilData: ChartDataPoint[];
  showApril: boolean;
  valueKey: keyof ChartDataPoint;
  limitKey: keyof ChartDataPoint;
  refKey: keyof ChartDataPoint;
  predictionKey: keyof ChartDataPoint;
  aprilKey: keyof ChartDataPoint;
  yAxisLabel: string;
  componentId: string;
  metric: 'current' | 'unbalance' | 'load_factor';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const formattedLabel = format(parseISO(label), "MMM d, yyyy");
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-bold">{formattedLabel}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {`${p.name}: ${Array.isArray(p.value) ? `${p.value[0]?.toFixed(3)} - ${p.value[1]?.toFixed(3)}` : p.value?.toFixed(3)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function MetricChart({
  data,
  aprilData,
  showApril,
  valueKey,
  limitKey,
  refKey,
  predictionKey,
  aprilKey,
  yAxisLabel,
  componentId,
  metric
}: MetricChartProps) {
  
  const metricData = data
    .filter(d => d.componentId === componentId && d.metric === metric)
    .map(d => ({
        ...d,
        realValue: d[valueKey] as number | null,
        predictedValue: d.isProjection ? d[predictionKey] : null,
        // The key for the area chart should be a tuple of [min, max]
        range: d.minValue != null && d.maxValue != null ? [d.minValue, d.maxValue] : null,
    }));
    
  const metricAprilData = aprilData
    .filter(d => d.componentId === componentId && d.metric === metric)
    .map((d, index) => ({
      date: metricData[index]?.date,
      aprilBaseline: d.aprilBaseline
    }));

  const combinedData = metricData.map((item, index) => ({
    ...item,
    ...(metricAprilData[index] || {}),
  }));
  
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer>
        <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(str) => format(parseISO(str), "MMM d")}
            tick={{ fill: '#64748b' }}
            stroke="#e2e8f0"
          />
          <YAxis
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b' }}
            tick={{ fill: '#64748b' }}
            stroke="#e2e8f0"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

           <Area
            type="monotone"
            dataKey="range"
            name="Fluctuación Diaria"
            stroke={false}
            fill="#0284c7"
            fillOpacity={0.2}
            connectNulls={false}
          />

          <Line
            type="monotone"
            dataKey="realValue"
            name="Dato Real"
            stroke="#0284c7"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />

          <Line
            type="monotone"
            dataKey={limitKey as string}
            name="Límite"
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

          <Line
            type="monotone"
            dataKey="predictedValue"
            name="Proyección IA"
            stroke="#9333ea"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
          />

          {showApril && (
              <Line
                type="monotone"
                dataKey="aprilBaseline"
                name="Referencia Abril"
                stroke="#06b6d4"
                strokeWidth={1.5}
                strokeOpacity={0.7}
                dot={false}
              />
          )}

        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
