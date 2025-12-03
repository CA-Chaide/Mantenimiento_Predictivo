"use client";

import {
  format, parseISO
} from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartDataPoint, calculateEMA, calculateHoltWinters, calculateCubicSpline } from "@/lib/data";
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
      formattedLabel = format(parseISO(label), "MMM d, yyyy HH:mm");
    } catch {
      // Si no se puede parsear, usar el label directo
    }
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
  valueKey,
  limitKey,
  limitLabel,
  refKey,
  predictionKey,
  aprilKey,
  yAxisLabel,
  componentId,
  metric
}: MetricChartProps) {
  const [smoothingType, setSmoothingType] = React.useState<'simple' | 'ema' | 'holt-winters' | 'spline'>('simple');
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  
  // Filtrar datos sin agrupar
  const baseData = data
    .filter(d => d.componentId === componentId && d.metric === metric)
    .map(d => ({
      date: d.date,
      realValue: d[valueKey] as number | null,
      [limitKey as string]: d[limitKey] as number | null,
      [refKey as string]: d[refKey] as number | null,
      predictedValue: d.isProjection ? d[predictionKey] : null,
      aprilBaseline: d[aprilKey] as number | null,
      isProjection: d.isProjection,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Aplicar suavizado según el tipo seleccionado
  const getSmoothedData = () => {
    if (smoothingType === 'simple') {
      return baseData;
    }

    const realValues = baseData.map(d => d.realValue ?? 0);
    let smoothedValues: number[] = [];

    if (smoothingType === 'ema') {
      smoothedValues = calculateEMA(realValues, 0.3);
    } else if (smoothingType === 'holt-winters') {
      smoothedValues = calculateHoltWinters(realValues, 0.3, 0.1, 0.1, 8);
    } else if (smoothingType === 'spline') {
      smoothedValues = calculateCubicSpline(realValues);
    }

    return baseData.map((d, i) => ({
      ...d,
      realValue: smoothedValues[i] ?? d.realValue,
    }));
  };

  const metricData = getSmoothedData();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSmoothingType('simple')}
          className={`px-3 py-1 rounded text-sm font-medium transition ${
            smoothingType === 'simple'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Promedio Simple
        </button>
        <button
          onClick={() => setSmoothingType('ema')}
          className={`px-3 py-1 rounded text-sm font-medium transition ${
            smoothingType === 'ema'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          EMA (valores recientes)
        </button>
        <button
          onClick={() => setSmoothingType('holt-winters')}
          className={`px-3 py-1 rounded text-sm font-medium transition ${
            smoothingType === 'holt-winters'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Holt-Winters (estacional)
        </button>
        <button
          onClick={() => setSmoothingType('spline')}
          className={`px-3 py-1 rounded text-sm font-medium transition ${
            smoothingType === 'spline'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Spline (muy suave)
        </button>
      </div>

      <div 
        className="h-[400px] w-full cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setIsExpanded(true)}
      >
        <ResponsiveContainer>
          <LineChart data={metricData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(str) => {
                try {
                  return format(parseISO(str), "MMM d, HH:mm");
                } catch {
                  return str;
                }
              }}
              tick={{ fill: '#64748b' }}
              stroke="#e2e8f0"
            />
            <YAxis
              tick={{ fill: '#64748b' }}
              stroke="#e2e8f0"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

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

            <Line
              type="monotone"
              dataKey="aprilBaseline"
              name="Referencia Abril"
              stroke="#06b6d4"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              dot={false}
            />

          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Modal expandido */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-lg w-full h-[90vh] p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Gráfico Expandido</h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSmoothingType('simple')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  smoothingType === 'simple'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Promedio Simple
              </button>
              <button
                onClick={() => setSmoothingType('ema')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  smoothingType === 'ema'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                EMA (valores recientes)
              </button>
              <button
                onClick={() => setSmoothingType('holt-winters')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  smoothingType === 'holt-winters'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Holt-Winters (estacional)
              </button>
              <button
                onClick={() => setSmoothingType('spline')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  smoothingType === 'spline'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Spline (muy suave)
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4 bg-gray-50 p-4 rounded">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Zoom: {zoomLevel.toFixed(1)}x
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <button
                onClick={() => setZoomLevel(1)}
                className="px-3 py-1 rounded text-sm font-medium bg-gray-300 text-gray-700 hover:bg-gray-400 transition"
              >
                Reset
              </button>
            </div>

            <div className="flex-1 w-full overflow-x-auto">
              <div style={{ width: `${100 * zoomLevel}%`, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(str) => {
                        try {
                          return format(parseISO(str), "MMM d, HH:mm");
                        } catch {
                          return str;
                        }
                      }}
                      tick={{ fill: '#64748b' }}
                      stroke="#e2e8f0"
                    />
                    <YAxis
                      tick={{ fill: '#64748b' }}
                      stroke="#e2e8f0"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

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

                    <Line
                      type="monotone"
                      dataKey="aprilBaseline"
                      name="Referencia Abril"
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                      strokeOpacity={0.7}
                      dot={false}
                    />

                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
