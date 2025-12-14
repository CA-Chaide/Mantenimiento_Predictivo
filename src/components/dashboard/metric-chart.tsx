
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
import { Button } from "@/components/ui/button";

// --- INICIO CÓDIGO AÑADIDO ---

// 1. Catálogo de Fallas
const FAILURE_CATALOG = {
    "Eléctrica": [
        { id: "sobrecarga_continua", name: "Sobrecarga Continua" },
        { id: "pico_transitorio", name: "Pico Transitorio" },
        { id: "desbalance_fases", name: "Desbalance de Fases" },
    ],
    "Mecánica": [
        { id: "atasco_rodamiento", name: "Atasco/Rodamiento" },
        { id: "vibracion_excesiva", name: "Vibración Excesiva" },
        { id: "problema_engranaje", name: "Problema de Engranaje" },
    ],
    "Operacional": [
        { id: "uso_indebido", name: "Uso Indebido" },
        { id: "condicion_externa", name: "Condición Externa" },
    ]
};

// 2. Componente Visual: LabelingMenu
const LabelingMenu = ({
  position,
  onSelect,
  onClose,
}: {
  position: { x: number; y: number };
  onSelect: (category: string, failure: { id: string; name: string }) => void;
  onClose: () => void;
}) => {
  if (!position.x) return null;

  return (
    <div
      style={{ left: position.x, top: position.y }}
      className="absolute z-50 min-w-[200px] rounded-md border border-slate-200 bg-white shadow-lg p-2 animate-in fade-in-0 zoom-in-95"
    >
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs font-bold text-slate-700 px-2">Clasificar Falla</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <span className="text-slate-500">×</span>
        </Button>
      </div>
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {Object.entries(FAILURE_CATALOG).map(([category, failures]) => (
          <div key={category}>
            <p className="text-xs font-semibold text-slate-500 px-2 pt-1">{category}</p>
            {failures.map((failure) => (
              <Button
                key={failure.id}
                variant="ghost"
                className="w-full justify-start h-8 text-sm"
                onClick={() => onSelect(category, failure)}
              >
                {failure.name}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- FIN CÓDIGO AÑADIDO ---


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

const legendTooltips: Record<string, string> = {
    "Promedio Diario": "Valor real medido y agregado por cada punto en el tiempo (diario o por hora).",
    "Referencia": "Línea base de operación normal del componente, calculada a partir de datos históricos.",
    "Corriente Max": "Límite máximo operativo seguro. Exceder este valor puede indicar una falla o riesgo.",
    "Umbral Max": "Límite máximo operativo seguro. Exceder este valor puede indicar una falla o riesgo.",
    "Proyección Tendencia": "Estimación futura basada en la tendencia histórica (Regresión Lineal).",
    "Proyección Pesimista": "Escenario de degradación acelerada (Regresión Lineal con pendiente aumentada).",
    "Proyección Optimista": "Escenario de degradación lenta (Regresión Lineal con pendiente suavizada)."
};

const renderLegendText = (value: string, entry: any) => {
    const tooltipText = legendTooltips[value];

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

  // --- INICIO CÓDIGO AÑADIDO ---
  // 3. Estados para el menú de etiquetado
  const [labelingMenu, setLabelingMenu] = React.useState<{ x: number, y: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = React.useState<any>(null);

  // 4. Lógica de Datos
  const handleSaveLabel = (category: string, failure: { id: string; name: string }) => {
    if (!selectedPoint) return;
    
    const payload = {
      timestamp: selectedPoint.payload.date,
      sensor_value: selectedPoint.value,
      label_data: {
        category_id: category,
        failure_code: failure.id,
      },
      metadata: {
        labeled_at: new Date().toISOString(),
        user_id: "current_user_placeholder" // Reemplazar con el usuario real
      }
    };
    
    console.log("PAYLOAD ML:", payload);

    // Cerrar el menú después de guardar
    setLabelingMenu(null);
    setSelectedPoint(null);
  };
  
  // Función para manejar el clic en un punto de la gráfica
  const handlePointClick = (point: any) => {
    // Si el punto no tiene datos válidos, no hacer nada
    if (!point || point.value === null || point.value === undefined) return;
    
    setSelectedPoint(point);
    setLabelingMenu({ x: point.cx, y: point.cy });
  };
  // --- FIN CÓDIGO AÑADIDO ---

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
      <div className="h-[400px] w-full relative">
        <ResponsiveContainer>
          <ComposedChart 
            data={sortedData} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            // Cierra el menú si se hace clic fuera de un punto
            onClick={() => setLabelingMenu(null)}
          >
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
              // --- INICIO CÓDIGO AÑADIDO ---
              // 5. Integración: Captura del clic
              activeDot={{
                onClick: (e, payload) => handlePointClick(payload),
                r: 6,
                className: "cursor-pointer"
              }}
              // --- FIN CÓDIGO AÑADIDO ---
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
        
        {/* --- INICIO CÓDIGO AÑADIDO --- */}
        {labelingMenu && selectedPoint && (
            <LabelingMenu 
                position={labelingMenu} 
                onSelect={handleSaveLabel}
                onClose={() => setLabelingMenu(null)}
            />
        )}
        {/* --- FIN CÓDIGO AÑADIDO --- */}

      </div>
    </div>
  );
}

