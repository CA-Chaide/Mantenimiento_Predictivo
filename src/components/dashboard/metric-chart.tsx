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

// --- 1. CATÁLOGO DE FALLAS (ESTRUCTURA DE GRUPOS) ---
const FAILURE_CATALOG = {
    "Mecánico": {
        icon: "⚙️",
        label: "Mecánico (Integridad del equipo)",
        items: [
            { id: "mec_atascamiento", name: "Atascamiento" },
            { id: "mec_desgaste", name: "Daño o Desgaste" },
            { id: "mec_alineacion", name: "Alineación Incorrecta" },
            { id: "mec_lubricacion", name: "Lubricación Inadecuada" },
            { id: "mec_desbalance", name: "Desbalance / Rotor desbalanceado" },
            { id: "mec_friccion", name: "Aumento de fricción / Fricción adicional" },
            { id: "mec_envejecimiento", name: "Envejecimiento" },
        ]
    },
    "Eléctrico": {
        icon: "⚡",
        label: "Eléctrico & Control",
        items: [
            { id: "ele_cortocircuito", name: "Cortocircuito" },
            { id: "ele_fase", name: "Falla en una fase" },
            { id: "ele_conexiones", name: "Conexiones erróneas / Fallo conexión" },
            { id: "ele_alimentacion", name: "Alimentación" },
            { id: "ele_sensor", name: "Falla en sensor / Error en el valor" },
        ]
    },
    "Operacional": {
        icon: "⚖️",
        label: "Operación & Carga",
        items: [
            { id: "ope_sobrecarga", name: "Sobrecarga (de corriente o mecánica)" },
            { id: "ope_variacion", name: "Variación Brusca" },
            { id: "ope_arranques", name: "Arranques frecuentes" },
            { id: "ope_carga_mal", name: "Carga mal distribuida" },
            { id: "ope_fuera_rango", name: "Operación fuera de rango" },
            { id: "ope_forzado", name: "Operador forzando el equipo" },
        ]
    },
    "Externo": {
        icon: "🍂",
        label: "Grupo D: Externo",
        items: [
            { id: "ext_acumulacion", name: "Acumulación (suciedad/polvo)" },
            { id: "ext_material", name: "Material fuera de especificación" },
        ]
    }
};

// --- 2. COMPONENTE DE MENÚ INTELIGENTE (STICKY FOOTER + AUTO-SIZE) ---
const LabelingMenu = ({
  position,
  onSelect,
  onClose,
}: {
  position: { x: number; y: number };
  onSelect: (category: string, failure: { id: string; name: string }) => void;
  onClose: () => void;
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ id: string, name: string } | null>(null);
  
  // Estado extendido para incluir maxHeight dinámico
  const [menuStyle, setMenuStyle] = useState({ 
    top: position.y, 
    left: position.x, 
    opacity: 0,
    maxHeight: 400 
  });
  
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (menuRef.current) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      let newLeft = position.x;
      let newTop = position.y;
      
      // Espacio disponible arriba y abajo (con margen)
      const spaceBelow = screenHeight - position.y - 20; 
      const spaceAbove = position.y - 20;
      const idealHeight = 380; 
      let calculatedMaxHeight = idealHeight;

      // 1. Lógica Vertical Inteligente
      if (spaceBelow < idealHeight) {
         // Si hay más espacio arriba, volteamos el menú hacia arriba
         if (spaceAbove > spaceBelow) {
            newTop = position.y - Math.min(idealHeight, spaceAbove); 
            calculatedMaxHeight = Math.min(idealHeight, spaceAbove);
         } else {
            // Si no, lo limitamos al espacio de abajo
            calculatedMaxHeight = spaceBelow;
         }
      }

      // 2. Ajuste Horizontal
      if (position.x + 320 > screenWidth) {
        newLeft = position.x - 300; 
      }

      setMenuStyle({ top: newTop, left: newLeft, opacity: 1, maxHeight: calculatedMaxHeight });
    }
  }, [position]); 

  if (!position || (!position.x && position.x !== 0)) return null;

  const handleConfirm = () => {
    if (activeCategory && selectedItem) {
        onSelect(activeCategory, selectedItem);
    }
  };

  // @ts-ignore
  const currentCategoryData = activeCategory ? FAILURE_CATALOG[activeCategory] : null;

  return (
    <div
      ref={menuRef}
      style={{ 
        top: menuStyle.top, 
        left: menuStyle.left, 
        height: menuStyle.maxHeight, // Altura dinámica
        opacity: menuStyle.opacity 
      }}
      // CLAVES CSS: 'flex flex-col' para estructura vertical rígida
      className="fixed z-[9999] w-[300px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-opacity duration-150 font-sans"
    >
      {/* HEADER (Fijo) */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center h-12 flex-shrink-0">
        {activeCategory ? (
          <button 
            onClick={() => { setActiveCategory(null); setSelectedItem(null); }}
            className="flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft size={16} className="mr-1"/> Atrás
          </button>
        ) : (
          <h3 className="font-semibold text-sm text-slate-800">Clasificar Falla</h3>
        )}
        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={18} /></button>
      </div>

      {/* CUERPO (Scrollable) - flex-1 ocupa el espacio restante */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white p-2">
        {!activeCategory && (
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium px-2 py-2">Seleccione el grupo causante:</p>
            {Object.entries(FAILURE_CATALOG).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className="w-full text-left px-4 py-3 text-sm rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                    <span className="text-lg">{data.icon}</span>
                    <span className="font-medium text-slate-700">{data.label}</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500"/>
              </button>
            ))}
          </div>
        )}

        {activeCategory && currentCategoryData && (
          <div>
            <div className="px-3 py-2 bg-slate-50 rounded-md mb-2 border border-slate-100 flex items-center gap-2 sticky top-0 z-10">
                <span>{currentCategoryData.icon}</span>
                <span className="text-xs font-bold text-slate-700">{currentCategoryData.label}</span>
            </div>
            <div className="space-y-1 pb-2">
                {currentCategoryData.items.map((item: any) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={`w-full text-left px-3 py-2.5 text-xs rounded-md transition-all duration-200 border flex items-center gap-2 ${
                            isSelected ? "bg-blue-50 border-blue-500 text-blue-700 font-medium shadow-sm" : "bg-white border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="truncate whitespace-normal leading-tight">{item.name}</span>
                        </button>
                    );
                })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER (Fijo) - Botón Guardar siempre visible */}
      {activeCategory && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0 z-20">
            <Button size="sm" onClick={handleConfirm} disabled={!selectedItem} className={`text-xs h-9 w-full transition-all shadow-sm ${selectedItem ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                {selectedItem ? 'Guardar Clasificación' : 'Seleccione una opción'}
            </Button>
        </div>
      )}
    </div>
  );
};


const SIGMA_LINE_CONFIG = [
  { key: 'neg5', label: '-5σ', multiplier: -5, color: '#8b5cf6', dash: '5 5', width: 1, description: 'Zona fuera de control extremo (5 sigmas debajo de la media).' },
  { key: 'neg3', label: '-3σ', multiplier: -3, color: '#ec4899', dash: '5 5', width: 1.5, description: 'Alarma crítica negativa (3 sigmas debajo de la media).' },
  { key: 'neg2', label: '-2σ', multiplier: -2, color: '#f97316', dash: '3 3', width: 1.5, description: 'Zona de advertencia negativa (95% de los datos).' },
  { key: 'neg1', label: '-1σ', multiplier: -1, color: '#22c55e', dash: '2 4', width: 2, description: 'Rango normal negativo (68% de los datos).' },
  { key: 'mean', label: 'x̄', multiplier: 0, color: '#0f172a', dash: undefined, width: 2.5, description: 'Valor medio real de la serie medida.' },
  { key: 'pos1', label: '+1σ', multiplier: 1, color: '#22c55e', dash: '2 4', width: 2, description: 'Rango normal positivo (68% de los datos).' },
  { key: 'pos2', label: '+2σ', multiplier: 2, color: '#f97316', dash: '3 3', width: 1.5, description: 'Zona de advertencia positiva (95% de los datos).' },
  { key: 'pos3', label: '+3σ', multiplier: 3, color: '#ec4899', dash: '5 5', width: 1.5, description: 'Alarma crítica positiva (3 sigmas por encima de la media).' },
  { key: 'pos5', label: '+5σ', multiplier: 5, color: '#8b5cf6', dash: '5 5', width: 1, description: 'Zona fuera de control extremo (5 sigmas por encima de la media).' },
];


// --- 3. DEFINICIÓN DE PROPS Y HELPERS DEL GRÁFICO ---

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
  chartHeight?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  meanLine?: { label: string; value: number; color: string } | null;
}

const CustomTooltip = ({ active, payload, label, meanLine }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    let formattedLabel = label;
    if (typeof label === "string") {
      try { formattedLabel = format(parseISO(label), "dd MMM HH:mm", { locale: es }); } catch { }
    }
    
    const relevantPayload = payload.filter((p: any) => p.value !== null && p.value !== undefined && p.dataKey !== 'Desv_PromedioSuavizado');
    const supplementalEntries = meanLine ? [meanLine] : [];

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-bold">{formattedLabel}</p>
        {relevantPayload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="text-sm">
            {`${p.name}: ${p.value?.toFixed(3)}`}
          </p>
        ))}
        {supplementalEntries.map((entry) => (
          <p key={entry.label} style={{ color: entry.color }} className="text-sm">
            {`${entry.label}: ${entry.value.toFixed(3)} A`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const sigmaLegendTooltips = SIGMA_LINE_CONFIG.reduce<Record<string, string>>((acc, config) => {
  acc[config.label] = config.description;
  return acc;
}, {});

const legendTooltips: Record<string, string> = {
    ...sigmaLegendTooltips,
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

  const [labelingMenu, setLabelingMenu] = useState<{ x: number, y: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [expandedChart, setExpandedChart] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const closeLabelingMenu = React.useCallback(() => {
    setLabelingMenu(null);
    setSelectedPoint(null);
  }, []);

  const handleSaveLabel = (category: string, failure: { id: string; name: string }) => {
    if (!selectedPoint || !selectedPoint.payload) return;
    const payload = {
      timestamp: selectedPoint.payload.date,
      sensor_value: selectedPoint.value,
      label_data: {
        category_id: category,
        failure_code: failure.id,
        failure_name: failure.name
      },
      metadata: {
        labeled_at: new Date().toISOString(),
        user_id: "current_user_placeholder",
        component_id: componentId
      }
    };
    console.log("🟢 PAYLOAD GENERADO:", payload);
    closeLabelingMenu();
  };
  
  const handleChartClick = (state: any, event: any) => {
    if (metric !== 'current') return;
    if (labelingMenu) { closeLabelingMenu(); return; }
    if (state && state.activePayload && state.activePayload.length > 0) {
        const mainData = state.activePayload.find((p: any) => p.dataKey === valueKey) || state.activePayload[0];
        if (!mainData) return;
        const e = event || state.event; 
           if (e) {
             const clientX = e.clientX;
             const clientY = e.clientY;
             setSelectedPoint(mainData);
             setLabelingMenu({ x: clientX, y: clientY });
           }
    }
  };

  const tickFormatter = (str: string) => {
    try { return format(parseISO(str), "dd MMM HH:mm", { locale: es }); } catch { return str; }
  };

  const sortedData = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    return sorted;
  }, [data]);

  // Calcular la media de los datos reales (no proyectados)
  const mean = React.useMemo(() => {
    const realData = sortedData.filter(p => !p.isProjection);
    const values = realData
      .map(p => Number(p[valueKey]))
      .filter(v => !isNaN(v));
    
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [sortedData, valueKey]);

  // Obtener sigma del backend
  const sigma = React.useMemo(() => {
    for (let point of sortedData) {
      const val = Number(point['Desv_PromedioSuavizado']);
      if (!isNaN(val) && val > 0) {
        console.log('✅ Sigma encontrado desde API:', { sigma: val, metric, mean });
        return val;
      }
    }
    console.warn('⚠️ No se encontró Desv_PromedioSuavizado en los datos del componente.', {
      componentId,
      availableKeys: Object.keys(sortedData[0] || {})
    });
    return 0;
  }, [sortedData, metric, mean, componentId]);

  const sigmaLines = React.useMemo(() => {
    if (metric !== 'current' || mean === null || sigma <= 0) return [];
    return SIGMA_LINE_CONFIG.map((config) => {
      const value = mean + config.multiplier * sigma;
      return {
        ...config,
        value,
        labelWithValue: `${config.label} (${value.toFixed(3)} A)`
      };
    });
  }, [metric, mean, sigma]);

  const meanSigmaLine = React.useMemo(() => {
    return sigmaLines.find((line) => line.multiplier === 0) ?? null;
  }, [sigmaLines]);

  const selectedPointDetails = React.useMemo(() => {
    if (!selectedPoint?.payload) return null;
    const value = Number(selectedPoint.value);
    if (isNaN(value)) return null;
    const rawDate = selectedPoint.payload.date;
    let formattedDate = rawDate;
    if (typeof rawDate === 'string') {
      try { formattedDate = format(parseISO(rawDate), "dd MMM yyyy HH:mm", { locale: es }); } catch { }
    }
    return {
      value,
      formattedDate
    };
  }, [selectedPoint]);

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

        {labelingMenu && selectedPointDetails && (
          <div className="absolute left-4 top-4 z-20 bg-white/95 border border-slate-200 rounded-lg shadow-lg px-4 py-3 space-y-1 text-xs text-slate-600">
            <p className="uppercase tracking-wide text-[10px] text-slate-500 font-semibold">Punto seleccionado</p>
            <p className="text-lg font-bold text-slate-900">{selectedPointDetails.value.toFixed(3)} A</p>
            <p className="text-[11px] text-slate-500">{selectedPointDetails.formattedDate}</p>
            {meanSigmaLine && (
              <p className="text-[11px] text-slate-600">Med (0σ): <span className="font-semibold text-slate-900">{meanSigmaLine.value.toFixed(3)} A</span></p>
            )}
          </div>
        )}

        <ResponsiveContainer>
          <ComposedChart 
            data={sortedData} 
            margin={{ top: 5, right: 140, left: 20, bottom: 5 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#64748b' }} stroke="#e2e8f0" interval="preserveStartEnd" minTickGap={80} />
            <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b' }} tick={{ fill: '#64748b' }} stroke="#e2e8f0" domain={['dataMin - 1', 'auto']} allowDataOverflow={true} />
            
            <RechartsTooltip 
              content={<CustomTooltip meanLine={meanSigmaLine ? { label: meanSigmaLine.label, value: meanSigmaLine.value, color: meanSigmaLine.color } : null} />} 
                cursor={{ stroke: '#0ea5e9', strokeWidth: 2 }}
                wrapperStyle={{ pointerEvents: 'none' }} 
            />
            
            <Legend formatter={renderLegendText} />

            <defs>
              <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <Area type="monotone" dataKey={(point) => point.isProjection ? null : point[valueKey]} name="Promedio Diario" stroke="#0284c7" fillOpacity={1} fill={`url(#color${metric})`} strokeWidth={2} activeDot={{ r: 6, className: metric === 'current' ? "cursor-pointer" : "", strokeWidth: 0 }} dot={false} connectNulls={false} />

            {referenceKey && (<Line type="monotone" dataKey={referenceKey as string} name="Referencia" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={false} />)}
            <Line type="monotone" dataKey={limitKey as string} name={limitLabel} stroke="#dc2626" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={false} />
            
            {sigmaLines.length > 0 && sigmaLines.map((line) => (
              <Line
                key={`sigma-legend-${line.key}`}
                type="monotone"
                dataKey={() => null}
                name={line.label}
                stroke={line.color}
                strokeDasharray={line.dash}
                strokeWidth={line.width}
                isAnimationActive={false}
              />
            ))}

            {sigmaLines.length > 0 && sigmaLines.map((line) => (
              <ReferenceLine
                key={`sigma-${line.key}`}
                y={line.value}
                stroke={line.color}
                strokeDasharray={line.dash}
                strokeWidth={line.width}
                label={{
                  value: line.labelWithValue,
                  position: 'right',
                  fill: line.color,
                  fontSize: 12,
                  fontWeight: line.multiplier === 0 ? 'bold' : 'normal',
                  textAnchor: 'start',
                  dx: 6
                }}
              />
            ))}

            <Line type="monotone" dataKey={predictionKey.toString()} name="Proyección Tendencia" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey={predictionPesimisticKey.toString()} name="Proyección Pesimista" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey={predictionOptimisticKey.toString()} name="Proyección Optimista" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />

          </ComposedChart>
        </ResponsiveContainer>
        
        {labelingMenu && selectedPoint && (
          <LabelingMenu position={labelingMenu} onSelect={handleSaveLabel} onClose={closeLabelingMenu} />
        )}
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
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: `${100 / zoomLevel}%` }}>
                <div className="h-screen w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={sortedData} 
                      margin={{ top: 5, right: 140, left: 20, bottom: 5 }}
                      onClick={handleChartClick}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#64748b' }} stroke="#e2e8f0" interval="preserveStartEnd" minTickGap={80} />
                      <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b' }} tick={{ fill: '#64748b' }} stroke="#e2e8f0" domain={['dataMin - 1', 'auto']} allowDataOverflow={true} />
                      
                        <RechartsTooltip 
                          content={<CustomTooltip meanLine={meanSigmaLine ? { label: meanSigmaLine.label, value: meanSigmaLine.value, color: meanSigmaLine.color } : null} />} 
                          cursor={{ stroke: '#0ea5e9', strokeWidth: 2 }}
                          wrapperStyle={{ pointerEvents: 'none' }} 
                      />
                      
                      <Legend formatter={renderLegendText} />

                      <defs>
                        <linearGradient id={`color${metric}-expanded`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>

                      <Area type="monotone" dataKey={(point) => point.isProjection ? null : point[valueKey]} name="Promedio Diario" stroke="#0284c7" fillOpacity={1} fill={`url(#color${metric}-expanded)`} strokeWidth={2} activeDot={{ r: 6, className: metric === 'current' ? "cursor-pointer" : "", strokeWidth: 0 }} dot={false} connectNulls={false} />

                      {referenceKey && (<Line type="monotone" dataKey={referenceKey as string} name="Referencia" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={false} />)}
                      <Line type="monotone" dataKey={limitKey as string} name={limitLabel} stroke="#dc2626" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={false} />
                      
                      {sigmaLines.length > 0 && sigmaLines.map((line) => (
                        <Line
                          key={`sigma-legend-expanded-${line.key}`}
                          type="monotone"
                          dataKey={() => null}
                          name={line.label}
                          stroke={line.color}
                          strokeDasharray={line.dash}
                          strokeWidth={line.width}
                          isAnimationActive={false}
                        />
                      ))}

                      {sigmaLines.length > 0 && sigmaLines.map((line) => (
                        <ReferenceLine
                          key={`sigma-expanded-${line.key}`}
                          y={line.value}
                          stroke={line.color}
                          strokeDasharray={line.dash}
                          strokeWidth={line.width}
                          label={{
                            value: line.labelWithValue,
                            position: 'right',
                            fill: line.color,
                            fontSize: 12,
                            fontWeight: line.multiplier === 0 ? 'bold' : 'normal',
                            textAnchor: 'start',
                            dx: 6
                          }}
                        />
                      ))}

                      <Line type="monotone" dataKey={predictionKey.toString()} name="Proyección Tendencia" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey={predictionPesimisticKey.toString()} name="Proyección Pesimista" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey={predictionOptimisticKey.toString()} name="Proyección Optimista" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />

                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}