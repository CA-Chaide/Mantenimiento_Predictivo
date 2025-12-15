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

// --- 2. COMPONENTE DE MENÚ INTELIGENTE (SMART POSITIONING) ---
const LabelingMenu = ({
  position,
  onSelect,
  onClose,
}: {
  position: { x: number; y: number };
  onSelect: (category: string, failure: { id: string; name: string }) => void;
  onClose: () => void;
}) => {
  // Estados de navegación
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ id: string, name: string } | null>(null);
  
  // Estado para la posición visual (calculada)
  const [menuStyle, setMenuStyle] = useState({ top: position.y, left: position.x, opacity: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Lógica de Posicionamiento Inteligente (Se ejecuta antes de pintar)
  useLayoutEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      let newLeft = position.x;
      let newTop = position.y;

      // 1. AJUSTE HORIZONTAL: Si se sale por la derecha, lo mostramos a la izquierda
      if (position.x + 320 > screenWidth) { // 320px es un ancho seguro estimado
        newLeft = position.x - 300; // Restamos el ancho del menú aprox
      }

      // 2. AJUSTE VERTICAL: Si se sale por abajo, lo subimos
      if (position.y + 350 > screenHeight) {
        newTop = screenHeight - 360; // Lo pegamos al borde inferior con margen
      }

      setMenuStyle({ top: newTop, left: newLeft, opacity: 1 });
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
        opacity: menuStyle.opacity 
      }}
      className="fixed z-[9999] w-[300px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-opacity duration-150 font-sans"
    >
      {/* --- HEADER --- */}
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
        
        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* --- CUERPO --- */}
      <div className="overflow-y-auto max-h-[320px] bg-white min-h-[200px]">
        
        {/* VISTA 1: MENU PRINCIPAL */}
        {!activeCategory && (
          <div className="p-2 space-y-1">
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

        {/* VISTA 2: SUB-MENÚ */}
        {activeCategory && currentCategoryData && (
          <div className="p-2">
            <div className="px-3 py-2 bg-slate-50 rounded-md mb-2 border border-slate-100 flex items-center gap-2">
                <span>{currentCategoryData.icon}</span>
                <span className="text-xs font-bold text-slate-700">{currentCategoryData.label}</span>
            </div>
            
            <div className="space-y-1">
                {currentCategoryData.items.map((item: any) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={`w-full text-left px-3 py-2.5 text-xs rounded-md transition-all duration-200 border flex items-center gap-2 ${
                            isSelected 
                                ? "bg-blue-50 border-blue-500 text-blue-700 font-medium shadow-sm" 
                                : "bg-white border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="truncate">{item.name}</span>
                        </button>
                    );
                })}
            </div>
          </div>
        )}
      </div>

      {/* --- FOOTER --- */}
      {activeCategory && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
            <Button 
                size="sm" 
                onClick={handleConfirm}
                disabled={!selectedItem} 
                className={`text-xs h-9 w-full transition-all shadow-sm ${selectedItem ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
                {selectedItem ? 'Guardar Clasificación' : 'Seleccione una opción'}
            </Button>
        </div>
      )}
    </div>
  );
};


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
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    let formattedLabel = label;
    try { formattedLabel = format(parseISO(label), "dd MMM HH:mm", { locale: es }); } catch { }
    
    const relevantPayload = payload.filter((p: any) => p.value !== null && p.value !== undefined);

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
    "Proyección Tendencia": "Estimación futura basada en una regresión lineal de los datos históricos.",
    "Proyección Pesimista": "Escenario de degradación acelerada (regresión lineal con pendiente aumentada).",
    "Proyección Optimista": "Escenario de degradación lenta (regresión lineal con pendiente reducida).",
    "Banda Superior (+2σ)": "Límite superior del rango de operación normal (Referencia + 2 desviaciones estándar).",
    "Banda Inferior (-2σ)": "Límite inferior del rango de operación normal (Referencia - 2 desviaciones estándar).",
    "±1 Sigma": "Rango que contiene ~68% de la variabilidad normal de los datos.",
    "±2 Sigma": "Rango que contiene ~95% de la variabilidad normal de los datos. Puntos fuera pueden ser anomalías.",
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
  yAxisLabel
}: MetricChartProps) {

  const [labelingMenu, setLabelingMenu] = useState<{ x: number, y: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  // Manejador: Guardar en BD / API
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
    setLabelingMenu(null);
    setSelectedPoint(null);
  };
  
  // Manejador: Click en el Gráfico
  const handleChartClick = (state: any, event: any) => {
    // 🔒 RESTRICCIÓN: Solo permitir interacción si es la gráfica de CORRIENTE
    if (metric !== 'current') return;

    if (labelingMenu) {
        setLabelingMenu(null);
        return;
    }

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

  const sortedData = React.useMemo(() => [...data].sort((a, b) => a.date.localeCompare(b.date)), [data]);

  return (
    <div className="space-y-4">
      <div className="h-[400px] w-full relative">
        <ResponsiveContainer>
          <ComposedChart 
            data={sortedData} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#64748b' }} stroke="#e2e8f0" interval="preserveStartEnd" minTickGap={80} />
            <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b' }} tick={{ fill: '#64748b' }} stroke="#e2e8f0" domain={['dataMin - 1', 'auto']} allowDataOverflow={true} />
            
            {/* Tooltip con pointerEvents: none para no bloquear el clic */}
            <RechartsTooltip 
                content={<CustomTooltip />} 
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

            <Area
              type="monotone"
              dataKey={(point) => point.isProjection ? null : point[valueKey]}
              name="Promedio Diario"
              stroke="#0284c7"
              fillOpacity={1}
              fill={`url(#color${metric})`}
              strokeWidth={2}
              activeDot={{
                r: 6,
                // Solo mostrar cursor de mano si es 'current'
                className: metric === 'current' ? "cursor-pointer" : "",
                strokeWidth: 0
              }}
              dot={false}
              connectNulls={false}
            />

            {referenceKey && (<Line type="monotone" dataKey={referenceKey as string} name="Referencia" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={false} />)}
            <Line type="monotone" dataKey={limitKey as string} name={limitLabel} stroke="#dc2626" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={false} />
            <Line type="monotone" dataKey={predictionKey.toString()} name="Proyección Tendencia" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey={predictionPesimisticKey.toString()} name="Proyección Pesimista" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey={predictionOptimisticKey.toString()} name="Proyección Optimista" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />

            {metric === 'current' && (
              <>
                <Line type="monotone" dataKey="Sigma1_Sup" name="±1 Sigma" stroke="#facc15" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls={true} isAnimationActive={false}/>
                <Line type="monotone" dataKey="Sigma1_Inf" stroke="#facc15" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls={true} legendType="none" isAnimationActive={false}/>
                <Line type="monotone" dataKey="Sigma2_Sup" name="±2 Sigma" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls={true} isAnimationActive={false}/>
                <Line type="monotone" dataKey="Sigma2_Inf" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls={true} legendType="none" isAnimationActive={false}/>
              </>
            )}
            
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Renderizado del Menú (Smart Positioning) */}
        {labelingMenu && selectedPoint && (
            <LabelingMenu 
                position={labelingMenu} 
                onSelect={handleSaveLabel}
                onClose={() => setLabelingMenu(null)}
            />
        )}

      </div>
    </div>
  );
}
