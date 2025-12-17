
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
  ReferenceLine,
} from "recharts";
import { ChartDataPoint } from "@/lib/data";
import React, { useState, useRef, useLayoutEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// --- 3. DEFINICIÓN DE PROPS Y HELPERS DEL GRÁFICO ---

interface MetricChartProps {
  data: ChartDataPoint[];
  aggregationLevel: 'minute' | 'hour' | 'month';
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
  chartHeight?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    let formattedLabel = label;
    if (typeof label === "string") {
      try { formattedLabel = format(parseISO(label), "dd MMM HH:mm", { locale: es }); } catch { }
    }
    
    const relevantPayload = payload.filter((p: any) => 
        p.value !== null && 
        p.value !== undefined && 
        !(typeof p.dataKey === 'string' && p.dataKey.includes('Sigma'))
    );
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-bold">{formattedLabel}</p>
        {relevantPayload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="text-sm">
            {`${p.name}: ${p.value?.toFixed(3)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const legendTooltips: Record<string, string> = {
    "Promedio Diario": "Valor real medido.",
    "Referencia": "Línea base de operación normal.",
    "Corriente Max": "Límite máximo operativo seguro.",
    "Umbral Max": "Límite máximo operativo seguro.",
    "Desv. Estándar": "Desviación Estándar de la Corriente para el período.",
    "±1σ": "Banda de una desviación estándar alrededor de la media (68% de los datos).",
    "±2σ": "Banda de dos desviaciones estándar alrededor de la media (95% de los datos).",
    "Proyección Tendencia": "Estimación futura basada en una regresión lineal de los datos históricos.",
    "Proyección Pesimista": "Escenario de degradación acelerada.",
    "Proyección Optimista": "Escenario de degradación lenta.",
};

const renderLegendText = (value: string, entry: any) => {
    if (value.includes('Sigma')) return null; // Ocultar bandas de la leyenda
    
    const tooltipText = legendTooltips[value];
    if (tooltipText) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild><span className="cursor-help border-b border-dashed border-slate-400">{value}</span></TooltipTrigger>
                    <TooltipContent><p>{tooltipText}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    return value;
};

// --- 4. COMPONENTE PRINCIPAL (CHART) ---

export function MetricChart({
  data,
  aggregationLevel,
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
  yAxisLabel,
  chartHeight = metric === 'current' ? 'h-[600px]' : 'h-[400px]'
}: MetricChartProps) {

  const [expandedChart, setExpandedChart] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const tickFormatter = (str: string) => {
    if (!str) return '';
    try {
      const date = parseISO(str);
      if (aggregationLevel === 'minute') return format(date, "HH:mm", { locale: es });
      return format(date, "dd MMM HH:mm", { locale: es });
    } catch { 
      return str; 
    }
  };

  const sortedData = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    return sorted;
  }, [data]);

  const yDomain = React.useMemo(() => {
    const values = sortedData.flatMap(p => [
      p[valueKey] as number,
      p.Sigma2_Sup as number,
    ]).filter(v => typeof v === 'number' && !isNaN(v));
    
    if (values.length === 0) return ['dataMin', 'dataMax'];

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    
    const padding = (maxVal - minVal) * 0.1;

    return [minVal - padding, maxVal + padding];
  }, [sortedData, valueKey]);


  const renderChart = (isExpanded: boolean) => (
      <ComposedChart 
        data={sortedData} 
        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#64748b' }} stroke="#e2e8f0" interval="preserveStartEnd" minTickGap={80} />
        <YAxis 
          label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b' }} 
          tick={{ fill: '#64748b' }} 
          stroke="#e2e8f0" 
          domain={yDomain as [number, number]} 
          allowDataOverflow={true} 
        />
        
        <RechartsTooltip 
          content={<CustomTooltip />} 
            cursor={{ stroke: '#0ea5e9', strokeWidth: 2 }}
            wrapperStyle={{ pointerEvents: 'none' }} 
        />
        
        <Legend formatter={renderLegendText} />

        <defs>
          <linearGradient id={`color${metric}-${isExpanded}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
          </linearGradient>
        </defs>

        {metric === 'current' && (
          <>
             <Line type="monotone" dataKey="Sigma2_Sup" name="2-Sigma Superior" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
             <Line type="monotone" dataKey="Sigma2_Inf" name="2-Sigma Inferior" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
             <Line type="monotone" dataKey="Sigma1_Sup" name="1-Sigma Superior" stroke="#22c55e" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
             <Line type="monotone" dataKey="Sigma1_Inf" name="1-Sigma Inferior" stroke="#22c55e" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
          </>
        )}

        <Area type="monotone" dataKey={(point) => point.isProjection ? null : point[valueKey]} name="Promedio Diario" stroke="#0284c7" fillOpacity={1} fill={`url(#color${metric}-${isExpanded})`} strokeWidth={2} activeDot={{ r: 6, strokeWidth: 0 }} dot={false} connectNulls={false} />

        {referenceKey && (<Line type="monotone" dataKey={referenceKey as string} name="Referencia" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={false} />)}
        
        <Line type="monotone" dataKey={limitKey as string} name={limitLabel} stroke="#dc2626" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={false} />
        
        <Line type="monotone" dataKey="Desv_PromedioSuavizado" name="Desv. Estándar" stroke="#964B00" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls={true} isAnimationActive={false} />

        <Line type="monotone" dataKey={predictionKey.toString()} name="Proyección Tendencia" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
        <Line type="monotone" dataKey={predictionPesimisticKey.toString()} name="Proyección Pesimista" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
        <Line type="monotone" dataKey={predictionOptimisticKey.toString()} name="Proyección Optimista" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />

      </ComposedChart>
  );

  return (
    <div className="space-y-4">
      <div className={`${chartHeight} w-full relative group`}>
        {/* Botón para expandir */}
        <button
          onClick={() => setExpandedChart(true)}
          className="absolute top-2 right-2 z-10 bg-white rounded-lg shadow-md p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Expandir gráfico"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6v4m12-4h4v4M6 18h4v-4m6 4h4v-4" />
          </svg>
        </button>

        <ResponsiveContainer>
          {renderChart(false)}
        </ResponsiveContainer>
        
      </div>

      {/* Modal Flotante */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full h-[90vh] max-w-6xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Vista Expandida - {yAxisLabel}</h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.2))}
                >
                  Alejar
                </Button>
                <span className="text-sm font-medium w-12 text-center">{(zoomLevel * 100).toFixed(0)}%</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.2))}
                >
                  Acercar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setExpandedChart(false);
                    setZoomLevel(1);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 overflow-auto p-4">
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: `${100 / zoomLevel}%`, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(true)}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
