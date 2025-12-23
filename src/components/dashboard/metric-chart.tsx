"use client";

import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { ChartDataPoint } from "@/lib/data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { tipoEventoService } from "@/services/tipoEvento.service";
import { categoriaEventoService } from "@/services/categoriaEvento.service";
import { historialService } from "@/services/historial.service";
import { calculosCorrientesDatosMantenimientoService } from "@/services/calculoscorrientesdatosmantenimiento.service";
import { componenteService } from "@/services/componente.service";
import { equipoService } from "@/services/equipo.service";
import { useToast } from "@/hooks/use-toast";
import type { TipoEvento, CategoriaEvento } from "@/types/interfaces";
const LabelingMenu = ({
  position,
  onSelect,
  onClose,
  tipos,
  getCategoriesForTipo,
  saving,
}: {
  position: { x: number; y: number };
  onSelect: (categoryTipoId: string, failure: { id: string; name: string }) => void;
  onClose: () => void;
  tipos: TipoEvento[];
  getCategoriesForTipo: (tipoId: string) => Promise<CategoriaEvento[]>;
  saving?: boolean;
}) => {
  const [activeTipo, setActiveTipo] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ id: string, name: string } | null>(null);
  const [menuStyle, setMenuStyle] = useState({ top: position.y, left: position.x, opacity: 0, maxHeight: 400 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useLayoutEffect(() => {
    if (menuRef.current) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      let newLeft = position.x;
      let newTop = position.y;
      const spaceBelow = screenHeight - position.y - 20;
      const spaceAbove = position.y - 20;
      const idealHeight = 380;
      let calculatedMaxHeight = idealHeight;
      if (spaceBelow < idealHeight) {
        if (spaceAbove > spaceBelow) {
          newTop = position.y - Math.min(idealHeight, spaceAbove);
          calculatedMaxHeight = Math.min(idealHeight, spaceAbove);
        } else {
          calculatedMaxHeight = spaceBelow;
        }
      }
      if (position.x + 320 > screenWidth) {
        newLeft = position.x - 300;
      }
      setMenuStyle({ top: newTop, left: newLeft, opacity: 1, maxHeight: calculatedMaxHeight });
    }
  }, [position]);

  useEffect(() => {
    // when a tipo is activated, load categories for it
    let mounted = true;
    async function load() {
      if (!activeTipo) return;
      setLoadingItems(true);
      try {
        const cats = await getCategoriesForTipo(activeTipo);
        if (!mounted) return;
        setItems(cats.map(c => ({ id: String(c.codigo_categoria_evento), name: c.descripcion })));
      } catch (e) {
        setItems([]);
      } finally {
        if (mounted) setLoadingItems(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [activeTipo, getCategoriesForTipo]);

  if (!position || (!position.x && position.x !== 0)) return null;

  const handleConfirm = () => {
    if (activeTipo && selectedItem) {
      onSelect(activeTipo, { id: selectedItem.id, name: selectedItem.name });
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ top: menuStyle.top, left: menuStyle.left, height: menuStyle.maxHeight, opacity: menuStyle.opacity }}
      className="fixed z-[9999] w-[300px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-opacity duration-150 font-sans"
    >
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center h-12 flex-shrink-0">
        {activeTipo ? (
          <button onClick={() => { setActiveTipo(null); setSelectedItem(null); }} className="flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft size={16} className="mr-1"/> Atrás
          </button>
        ) : (
          <h3 className="font-semibold text-sm text-slate-800">Clasificar Falla</h3>
        )}
        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white p-2">
        {!activeTipo && (
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium px-2 py-2">Seleccione el tipo de evento:</p>
            {tipos.map((t) => (
              <button key={t.codigo_tipo_evento} onClick={() => setActiveTipo(String(t.codigo_tipo_evento))} className="w-full text-left px-4 py-3 text-sm rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-700">{t.nombre_evento}</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500"/>
              </button>
            ))}
          </div>
        )}

        {activeTipo && (
          <div>
            <div className="px-3 py-2 bg-slate-50 rounded-md mb-2 border border-slate-100 flex items-center gap-2 sticky top-0 z-10">
              <span className="text-xs font-bold text-slate-700">Categorias</span>
            </div>
            <div className="space-y-1 pb-2">
              {loadingItems && <div className="p-3 text-sm text-gray-500">Cargando categorias...</div>}
              {!loadingItems && items.length === 0 && <div className="p-3 text-sm text-gray-500">Sin categorias</div>}
              {!loadingItems && items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button key={item.id} onClick={() => setSelectedItem(item)} className={`w-full text-left px-3 py-2.5 text-xs rounded-md transition-all duration-200 border flex items-center gap-2 ${isSelected ? "bg-blue-50 border-blue-500 text-blue-700 font-medium shadow-sm" : "bg-white border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
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

      {activeTipo && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0 z-20">
          <Button size="sm" onClick={handleConfirm} disabled={!selectedItem || !!saving} className={`text-xs h-9 w-full transition-all shadow-sm ${selectedItem && !saving ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            {saving ? 'Guardando...' : (selectedItem ? 'Guardar Clasificación' : 'Seleccione una opción')}
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
  machine?: string;
  metric: 'current' | 'unbalance' | 'load_factor';
  chartHeight?: string;
  aggregationLevel?: 'minute' | 'hour' | 'month';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  meanLine?: { label: string; value: number; color: string } | null;
}

// CustomTooltip will be defined inside the MetricChart component so it can
// access the modal state setters (`setRawStart`, `setRawEnd`, `setRawModalOpen`).

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
      <span className="cursor-help border-b border-dashed border-slate-400" title={tooltipText}>
        {value}
      </span>
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
  machine,
  metric,
  yAxisLabel,
  chartHeight = metric === 'current' ? 'h-[600px]' : 'h-[400px]'
}: MetricChartProps) {

  const [labelingMenu, setLabelingMenu] = useState<{ x: number, y: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [expandedChart, setExpandedChart] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [tiposEventos, setTiposEventos] = useState<TipoEvento[]>([]);
  const [tiposLoading, setTiposLoading] = useState(false);
  const [categoriasMapLocal, setCategoriasMapLocal] = useState<Record<string, CategoriaEvento[]>>({});
  const [categoriasLoadingLocal, setCategoriasLoadingLocal] = useState<Record<string, boolean>>({});
  const [savingLabel, setSavingLabel] = useState(false);
  // Unified modal with tabs
  const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);
  const [unifiedModalTab, setUnifiedModalTab] = useState<'classify' | 'raw'>('raw');
  const [selectedTipoModal, setSelectedTipoModal] = useState<string | null>(null);
  const [rawStart, setRawStart] = useState<string | null>(null);
  const [rawEnd, setRawEnd] = useState<string | null>(null);
  const [rawCenterHour, setRawCenterHour] = useState<Date | null>(null);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawTotal, setRawTotal] = useState<number | null>(null);
  const [rawEventsData, setRawEventsData] = useState<any[]>([]);
  const { toast } = useToast();

  const closeLabelingMenu = React.useCallback(() => {
    setLabelingMenu(null);
    setSelectedPoint(null);
  }, []);

  // Listen for global requests to close the classification panel (from other components)
  React.useEffect(() => {
    const handler = () => {
      closeLabelingMenu();
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('close-classification-panel', handler as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('close-classification-panel', handler as EventListener);
      }
    };
  }, [closeLabelingMenu]);

  // Scoped CustomTooltip so it can open the raw-events modal
  const CustomTooltip = ({ active, payload, label, meanLine }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      let formattedLabel = label;
      if (typeof label === "string") {
        try { formattedLabel = format(parseISO(label), "dd MMM HH:mm", { locale: es }); } catch { }
      }

      const relevantPayload = payload.filter((p: any) => p.value !== null && p.value !== undefined && p.dataKey !== 'Desv_PromedioSuavizado');
      const supplementalEntries = meanLine ? [meanLine] : [];

      const handleOpenRawFromTooltip = () => {
        try {
          const point = payload[0]?.payload;
          const baseDateOrig = point?.date ? new Date(point.date) : new Date();
          const baseDate = new Date(baseDateOrig);
          baseDate.setMinutes(0, 0, 0);
          const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
          setRawCenterHour(baseDate);
          setRawStart(toInput(baseDate));
          setRawEnd(toInput(new Date(baseDate.getTime() + 2 * 60 * 60 * 1000)));
          setRawEventsData([]);
          setRawTotal(null);
          closeLabelingMenu();
          try {
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('close-classification-panel'));
            }
          } catch (e) { }
          setUnifiedModalTab('raw');
          setUnifiedModalOpen(true);
        } catch (e) { /* ignore */ }
      };

      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-bold">{formattedLabel}</p>
            <Button size="sm" variant="ghost" onClick={handleOpenRawFromTooltip}>Ver eventos sin suavizado</Button>
          </div>
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

  const handleSaveLabel = async (category: string, failure: { id: string; name: string }) => {
    if (!selectedPoint || !selectedPoint.payload) return;
    setSavingLabel(true);
    try {
      const payloadDate = selectedPoint.payload.date;

      // Try to get combo value (component display value) from the payload
      const comboValue = selectedPoint.payload.Componente || selectedPoint.payload.componente || selectedPoint.payload.Component || selectedPoint.payload.component || selectedPoint.payload.nombre_componente || undefined;

      // Resolve codigo_componente by fetching componentes and equipos and matching by names
      let codigoComponenteResolved: string = String(componentId);
      try {
        const [compsResp, equiposResp] = await Promise.all([componenteService.getAll(), equipoService.getAll()]);
        const comps = Array.isArray(compsResp.data) ? compsResp.data : [];
        const equipos = Array.isArray(equiposResp.data) ? equiposResp.data : [];

        const normalize = (s: any) => (s || '').toString().toLowerCase().replace(/[\s_\-]+/g, ' ').trim();
        const compNameNorm = normalize(comboValue);
        const machineName = selectedPoint.payload.Maquina || selectedPoint.payload.maquina || selectedPoint.payload.MAQUINA || selectedPoint.payload.MaquinaName || selectedPoint.payload.machine || undefined;
        const machineNameNorm = normalize(machineName);

        // find equipo by machine name
        let equipoFound = equipos.find((e: any) => normalize(e.nombre_equipo) === machineNameNorm);
        if (!equipoFound && machineNameNorm) {
          // loose match
          equipoFound = equipos.find((e: any) => normalize(e.nombre_equipo).includes(machineNameNorm) || machineNameNorm.includes(normalize(e.nombre_equipo)));
        }

        // find componente matching both nombre_componente and codigo_equipo (if equipoFound)
        let componentFound = comps.find((c: any) => normalize(c.nombre_componente) === compNameNorm && (!equipoFound || String(c.codigo_equipo) === String(equipoFound.codigo_equipo)));
        if (!componentFound && compNameNorm) {
          componentFound = comps.find((c: any) => normalize(c.nombre_componente).includes(compNameNorm) && (!equipoFound || String(c.codigo_equipo) === String(equipoFound?.codigo_equipo)));
        }

        // fallback: try matching by codigo_componente equals comboValue
        if (!componentFound && comboValue) {
          componentFound = comps.find((c: any) => String(c.codigo_componente) === String(comboValue));
        }

        // final fallback: match by componentId
        if (!componentFound) {
          componentFound = comps.find((c: any) => String(c.codigo_componente) === String(componentId) || normalize(c.nombre_componente) === normalize(componentId));
        }

        if (componentFound) {
          codigoComponenteResolved = String(componentFound.codigo_componente);
        }
      } catch (err) {
        console.warn('No se pudo obtener lista de componentes/equipos para resolver codigo_componente', err);
      }

      // Prepare request window — using the point date as both start and end
      const resolvedMaquinaForSave = (machine && String(machine).trim() !== '') ? String(machine)
        : (selectedPoint.payload?.Maquina && String(selectedPoint.payload.Maquina).trim() !== '') ? String(selectedPoint.payload.Maquina)
        : (selectedPoint.payload?.maquina && String(selectedPoint.payload.maquina).trim() !== '') ? String(selectedPoint.payload.maquina)
        : (sortedData && sortedData[0] && (sortedData[0] as any).Maquina) ? String((sortedData[0] as any).Maquina)
        : (sortedData && sortedData[0] && (sortedData[0] as any).maquina) ? String((sortedData[0] as any).maquina)
        : '';
      const resolvedComponenteForSave = (componentId && String(componentId).trim() !== '') ? String(componentId) : (comboValue ? String(comboValue) : '');

      const requestParams = {
        Maquina: resolvedMaquinaForSave,
        Componente: resolvedComponenteForSave,
        FechaInicio: payloadDate,
        FechaFin: payloadDate,
      };

      // Build a compact params object with the requested fields
      const regCurrent = selectedPoint.value !== undefined ? Number(selectedPoint.value) : null;
      const regDesbalance = selectedPoint.payload ? (selectedPoint.payload['Desbalance Suavizado'] !== undefined ? Number(selectedPoint.payload['Desbalance Suavizado']) : null) : null;
      const regFactorCarga = selectedPoint.payload ? (selectedPoint.payload['Factor De Carga Suavizado'] !== undefined ? Number(selectedPoint.payload['Factor De Carga Suavizado']) : null) : null;

      const paramsSimple = {
        x_hat: mean ?? null,
        reg_current: isNaN(regCurrent!) ? null : regCurrent,
        reg_desbalance: isNaN(regDesbalance!) ? null : regDesbalance,
        reg_factor_carga: isNaN(regFactorCarga!) ? null : regFactorCarga,
      };

      const historialPayload = {
        codigo_historial: 0,
        codigo_componente: codigoComponenteResolved,
        codigo_categoria_evento: String(failure.id),
        // Format fecha_evento in SQL-friendly format: YYYY-MM-DD HH:mm:ss
        fecha_evento: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        descripcion: failure.name,
        params: JSON.stringify(paramsSimple),
        estado: 'A',
      } as any;

      // Persist the historial via service
      try {
        const saveResp = await historialService.save(historialPayload);
        console.log('Historial guardado:', saveResp);
        toast({ title: 'Evento registrado', description: 'Historial guardado correctamente', variant: 'success' });
      } catch (err) {
        console.error('Error guardando historial (save):', err);
        toast({ title: 'Error', description: 'No se pudo guardar el historial', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error construyendo historial:', error);
    } finally {
      setSavingLabel(false);
      closeLabelingMenu();
    }
  };
  
  const handleChartClick = (state: any, event: any) => {
    if (metric !== 'current') return;
    if (labelingMenu) { closeLabelingMenu(); return; }
    if (state && state.activePayload && state.activePayload.length > 0) {
        const mainData = state.activePayload.find((p: any) => p.dataKey === valueKey) || state.activePayload[0];
        if (!mainData) return;
        const e = event || state.event; 
        if (e) {
          setSelectedPoint(mainData);
          setUnifiedModalTab('raw');
          setUnifiedModalOpen(true);
          if (tiposEventos.length === 0 && !tiposLoading) {
            (async () => {
              setTiposLoading(true);
              try {
                const resp = await tipoEventoService.getAll();
                const data = Array.isArray(resp.data) ? resp.data : [];
                setTiposEventos(data);
              } catch (err) {
                console.error('Error loading tipos de evento', err);
              } finally {
                setTiposLoading(false);
              }
            })();
          }
        }
    }
  };

    const getCategoriesForTipo = async (tipoId: string) => {
      const id = String(tipoId);
      if (categoriasMapLocal[id]) return categoriasMapLocal[id];
      setCategoriasLoadingLocal(prev => ({ ...prev, [id]: true }));
      try {
        const resp = await categoriaEventoService.getAll();
        const data = Array.isArray(resp.data) ? resp.data : [];
        const filtered = data.filter(c => String(c.codigo_tipo_evento) === id);
        setCategoriasMapLocal(prev => ({ ...prev, [id]: filtered }));
        return filtered;
      } catch (e) {
        console.error('Error cargando categorias desde backend', e);
        return [];
      } finally {
        setCategoriasLoadingLocal(prev => ({ ...prev, [id]: false }));
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

  // Normalize raw events into a consistent shape for plotting: { date, L1, L2, L3, avg }
  const plottedRaw = React.useMemo(() => {
    try {
      const arr = (rawEventsData || []).map((r: any) => {
        const dateVal = r.FECHA ?? r.Fecha ?? r.fecha ?? r.date ?? r.DATE ?? r.FECHA;
        let dateStr = '';
        try { dateStr = new Date(dateVal).toISOString(); } catch { dateStr = String(dateVal || ''); }
        const toNumber = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : NaN;
        };
        const l1 = toNumber(r.CORRIENTE_L1 ?? r.CORRIENTE_LA ?? r.corriente_l1 ?? r.L1 ?? r.l1 ?? null);
        const l2 = toNumber(r.CORRIENTE_L2 ?? r.CORRIENTE_LB ?? r.corriente_l2 ?? r.L2 ?? r.l2 ?? null);
        const l3 = toNumber(r.CORRIENTE_L3 ?? r.CORRIENTE_LC ?? r.corriente_l3 ?? r.L3 ?? r.l3 ?? null);
        const values = [l1, l2, l3].filter(v => !isNaN(v));
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
        return {
          date: dateStr,
          L1: isNaN(l1) ? null : l1,
          L2: isNaN(l2) ? null : l2,
          L3: isNaN(l3) ? null : l3,
          avg: isNaN(avg) ? null : Number(avg.toFixed(6)),
        };
      });
      return arr.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (e) {
      return [];
    }
  }, [rawEventsData]);

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

        {labelingMenu && selectedPointDetails && !unifiedModalOpen && (
          <div className="absolute left-4 top-4 z-20 bg-white/95 border border-slate-200 rounded-lg shadow-lg px-4 py-3 space-y-1 text-xs text-slate-600">
            <p className="uppercase tracking-wide text-[10px] text-slate-500 font-semibold">Punto seleccionado</p>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500">&nbsp;</p>
              <Button size="sm" variant="ghost" onClick={() => {
                try {
                  const payloadDate = selectedPoint.payload?.date ? new Date(selectedPoint.payload.date) : new Date();
                  const twoHours = 2 * 60 * 60 * 1000;
                  const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
                  setRawStart(toInput(payloadDate));
                  setRawEnd(toInput(new Date(payloadDate.getTime() + twoHours)));
                } catch (e) {
                  setRawStart(null);
                  setRawEnd(null);
                }
                setRawEventsData([]);
                setRawTotal(null);
                closeLabelingMenu();
                try {
                  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('close-classification-panel'));
                  }
                } catch (e) { }
                setUnifiedModalTab('raw');
                setUnifiedModalOpen(true);
              }}>Ver eventos sin suavizado</Button>
            </div>
            <p className="text-lg font-bold text-slate-900">{selectedPointDetails.value.toFixed(3)} A</p>
            <p className="text-[11px] text-slate-500">{selectedPointDetails.formattedDate}</p>
            {meanSigmaLine && (
              <p className="text-[11px] text-slate-600">Med (0σ): <span className="font-semibold text-slate-900">{meanSigmaLine.value.toFixed(3)} A</span></p>
            )}
          </div>
        )}

        {/* Unified Modal with Tabs */}
        {unifiedModalOpen && selectedPoint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => {
              setUnifiedModalOpen(false);
              setSelectedTipoModal(null);
            }} />
            <div className="relative bg-white rounded-lg shadow-xl w-[85vw] h-[75vh] max-w-none p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="text-lg font-semibold">{unifiedModalTab === 'classify' ? 'Clasificar Falla' : 'Eventos sin suavizado'}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUnifiedModalTab('classify')}
                    className={`px-4 py-2 rounded font-medium text-sm transition ${ 
                      unifiedModalTab === 'classify' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Clasificación
                  </button>
                  <button
                    onClick={() => setUnifiedModalTab('raw')}
                    className={`px-4 py-2 rounded font-medium text-sm transition ${ 
                      unifiedModalTab === 'raw' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Data cruda
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setUnifiedModalOpen(false);
                    setSelectedTipoModal(null);
                  }}><X className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Tab: Classify */}
              {unifiedModalTab === 'classify' && (
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 120px)' }}>
                  {tiposLoading ? (
                    <div className="text-sm text-slate-500">Cargando tipos...</div>
                  ) : !selectedTipoModal ? (
                    <div>
                      <p className="text-xs text-slate-500 mb-3">Seleccione el tipo de evento:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {tiposEventos.map((t: TipoEvento) => (
                          <button
                            key={t.codigo_tipo_evento}
                            onClick={() => {
                              setSelectedTipoModal(String(t.codigo_tipo_evento));
                              getCategoriesForTipo(String(t.codigo_tipo_evento));
                            }}
                            className="w-full text-left p-3 rounded border border-slate-300 hover:bg-blue-50 hover:border-blue-400 transition bg-white"
                          >
                            <span className="font-medium text-slate-700">{t.nombre_evento}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTipoModal(null)}
                          className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded transition"
                        >
                          ← Atrás
                        </button>
                        <p className="text-sm font-semibold text-slate-700">Categorías:</p>
                      </div>
                      {categoriasLoadingLocal[selectedTipoModal] ? (
                        <div className="text-sm text-slate-500">Cargando categorías...</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {(categoriasMapLocal[selectedTipoModal] || []).map((c: CategoriaEvento) => (
                            <button
                              key={c.codigo_categoria_evento}
                              onClick={() => handleSaveLabel(String(c.codigo_categoria_evento), { id: String(c.codigo_categoria_evento), name: c.descripcion })}
                              className="w-full text-left p-3 rounded border border-slate-300 hover:bg-green-50 hover:border-green-400 transition bg-white text-sm"
                            >
                              <span className="font-medium text-slate-700">{c.descripcion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Raw Data */}
              {unifiedModalTab === 'raw' && (
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 120px)' }}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-slate-500">Fecha inicio (máx -2h)</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded px-2 py-1 text-xs"
                    value={rawStart ?? ''}
                    onChange={(e) => setRawStart(e.target.value)}
                    max={selectedPoint?.payload?.date ? format(new Date(selectedPoint.payload.date), "yyyy-MM-dd'T'HH:mm") : undefined}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Fecha fin (máx +2h)</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded px-2 py-1 text-xs"
                    value={rawEnd ?? ''}
                    onChange={(e) => setRawEnd(e.target.value)}
                    min={selectedPoint?.payload?.date ? format(new Date(selectedPoint.payload.date), "yyyy-MM-dd'T'HH:mm") : undefined}
                  />
                </div>
              </div>
              {/* Hour slider selector */}
              <div className="w-full mb-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-3">Selector de hora (Y)</p>
                <div className="flex items-center justify-center gap-4">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      if (!rawCenterHour) return;
                      const prev = new Date(rawCenterHour.getTime() - 60 * 60 * 1000);
                      prev.setMinutes(0,0,0);
                      setRawCenterHour(prev);
                      const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
                      setRawStart(toInput(prev));
                      setRawEnd(toInput(new Date(prev.getTime() + 2 * 60 * 60 * 1000)));
                    }}
                  >
                    <ChevronLeft size={20} />
                  </Button>
                  
                  <div className="flex-1 overflow-x-auto flex items-center justify-center gap-2 px-2">
                    {(() => {
                      const center = rawCenterHour ? new Date(rawCenterHour) : (selectedPoint?.payload?.date ? (() => { const d = new Date(selectedPoint.payload.date); d.setMinutes(0,0,0); return d; })() : new Date());
                      const hours: Date[] = [];
                      for (let i = -3; i <= 3; i++) {
                        const h = new Date(center.getTime() + i * 60 * 60 * 1000);
                        h.setMinutes(0,0,0);
                        hours.push(h);
                      }
                      return hours.map((h, idx) => {
                        const isCenter = rawCenterHour ? h.getTime() === rawCenterHour.getTime() : idx === 3;
                        const label = format(h, 'HH');
                        return (
                          <button
                            key={h.toISOString()}
                            onClick={() => {
                              const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
                              const chosen = new Date(h);
                              chosen.setMinutes(0,0,0);
                              setRawCenterHour(chosen);
                              setRawStart(toInput(chosen));
                              setRawEnd(toInput(new Date(chosen.getTime() + 2 * 60 * 60 * 1000)));
                            }}
                            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all flex-shrink-0 ${ 
                              isCenter 
                                ? 'bg-blue-600 text-white text-lg scale-110 shadow-md' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      if (!rawCenterHour) return;
                      const next = new Date(rawCenterHour.getTime() + 60 * 60 * 1000);
                      next.setMinutes(0,0,0);
                      setRawCenterHour(next);
                      const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
                      setRawStart(toInput(next));
                      setRawEnd(toInput(new Date(next.getTime() + 2 * 60 * 60 * 1000)));
                    }}
                  >
                    <ChevronRight size={20} />
                  </Button>
                </div>
              </div>
              {/* Preset quick selectors around the event time Y */}
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs text-slate-500 mr-2">Ventana rápida:</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!rawCenterHour && !selectedPoint) return;
                    const center = rawCenterHour ? new Date(rawCenterHour) : new Date(selectedPoint.payload.date);
                    const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
                    // Y-2  -> Y
                    const start = new Date(center.getTime() - 2 * 60 * 60 * 1000);
                    setRawStart(toInput(start));
                    setRawEnd(toInput(center));
                  }}>Y-2 → Y</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!rawCenterHour && !selectedPoint) return;
                    const center = rawCenterHour ? new Date(rawCenterHour) : new Date(selectedPoint.payload.date);
                    const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
                    // Y -> Y+2 (default)
                    setRawStart(toInput(center));
                    setRawEnd(toInput(new Date(center.getTime() + 2 * 60 * 60 * 1000)));
                  }}>Y → Y+2</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!rawCenterHour && !selectedPoint) return;
                    const center = rawCenterHour ? new Date(rawCenterHour) : new Date(selectedPoint.payload.date);
                    const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
                    // Y-2 -> Y+2
                    const start = new Date(center.getTime() - 2 * 60 * 60 * 1000);
                    const end = new Date(center.getTime() + 2 * 60 * 60 * 1000);
                    setRawStart(toInput(start));
                    setRawEnd(toInput(end));
                  }}>Y-2 → Y+2</Button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Button size="sm" onClick={async () => {
                  if (!selectedPoint) return;
                  if (!rawStart || !rawEnd) { toast({ title: 'Rango incompleto', description: 'Seleccione inicio y fin', variant: 'destructive' }); return; }
                  // validate within ±2h of event
                  try {
                    const evt = selectedPoint.payload?.date ? new Date(selectedPoint.payload.date) : new Date();
                    const start = new Date(rawStart);
                    const end = new Date(rawEnd);
                    const minAllowed = new Date(evt.getTime() - 2 * 60 * 60 * 1000);
                    const maxAllowed = new Date(evt.getTime() + 2 * 60 * 60 * 1000);
                    if (start < minAllowed || start > evt || end < evt || end > maxAllowed || start >= end) {
                      toast({ title: 'Rango inválido', description: 'El rango debe estar dentro de ±2 horas alrededor del evento y start < end', variant: 'destructive' });
                      return;
                    }
                    setRawLoading(true);
                    // build params — prefer explicit componentId and try multiple fallbacks for machine
                    const comboValue = selectedPoint.payload?.Componente || selectedPoint.payload?.componente || selectedPoint.payload?.Component || selectedPoint.payload?.component || selectedPoint.payload?.nombre_componente || undefined;
                    const resolvedComponente = (componentId && String(componentId).trim() !== '') ? String(componentId) : (comboValue ? String(comboValue) : '');
                    const resolvedMaquina = (machine && String(machine).trim() !== '') ? String(machine)
                      : (selectedPoint.payload?.Maquina && String(selectedPoint.payload.Maquina).trim() !== '') ? String(selectedPoint.payload.Maquina)
                      : (selectedPoint.payload?.maquina && String(selectedPoint.payload.maquina).trim() !== '') ? String(selectedPoint.payload.maquina)
                      : (sortedData && sortedData[0] && (sortedData[0] as any).Maquina) ? String((sortedData[0] as any).Maquina)
                      : (sortedData && sortedData[0] && (sortedData[0] as any).maquina) ? String((sortedData[0] as any).maquina)
                      : '';

                    const paramsTotal = {
                      Maquina: resolvedMaquina,
                      Componente: resolvedComponente,
                      FechaInicio: format(start, "yyyy-MM-dd HH:mm:ss"),
                      FechaFin: format(end, "yyyy-MM-dd HH:mm:ss"),
                    };
                    // get total
                    const totalResp = await calculosCorrientesDatosMantenimientoService.getTotalDataCrudaPorFechaComponenteEquipo(paramsTotal as any);
                    const total = Array.isArray((totalResp as any).data) && (totalResp as any).data[0] && (totalResp as any).data[0].Total ? Number((totalResp as any).data[0].Total) : Number((totalResp as any).total || 0);
                    setRawTotal(total);
                    const perPage = 500;
                    const pages = Math.max(1, Math.ceil((total || 0) / perPage));
                    const acc: any[] = [];
                    for (let page = 1; page <= pages; page++) {
                      const resp = await calculosCorrientesDatosMantenimientoService.getTodosRegistrosDataCruda({ Maquina: paramsTotal.Maquina, Componente: paramsTotal.Componente, FechaInicio: paramsTotal.FechaInicio, FechaFin: paramsTotal.FechaFin, page, limit: perPage });
                      const pageData = Array.isArray((resp as any).data) ? (resp as any).data : [];
                      acc.push(...pageData);
                    }
                    setRawEventsData(acc);
                  } catch (err) {
                    console.error('Error cargando eventos sin suavizado', err);
                    toast({ title: 'Error', description: 'No se pudo recuperar eventos crudos', variant: 'destructive' });
                  } finally {
                    setRawLoading(false);
                  }
                }}>Buscar</Button>
                <Button size="sm" variant="outline" onClick={() => { setRawEventsData([]); setRawTotal(null); setUnifiedModalOpen(false); }}>Cerrar</Button>
                <div className="ml-auto text-xs text-slate-500">{rawLoading ? 'Cargando...' : (rawTotal !== null ? `Total: ${rawTotal}` : '')}</div>
              </div>

              <div className="h-64">
                {!rawLoading && rawEventsData.length === 0 && <div className="text-sm text-slate-500">No hay datos cargados.</div>}
                {!rawLoading && rawEventsData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={plottedRaw} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(v) => { try { return format(parseISO(String(v)), 'dd MMM HH:mm', { locale: es }); } catch { return String(v); } }} />
                      <YAxis />
                      <RechartsTooltip formatter={(value: any) => (value === null || value === undefined) ? ['-', ''] : [`${Number(value).toFixed(3)} A`, ''] } labelFormatter={(label) => { try { return format(parseISO(String(label)), 'dd MMM yyyy HH:mm:ss', { locale: es }); } catch { return String(label); } }} />
                      <Legend />
                      <Line type="monotone" dataKey="L1" name="Corriente L1" stroke="#9CA3AF" strokeWidth={1.5} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="L2" name="Corriente L2" stroke="#B7C0C7" strokeWidth={1.5} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="L3" name="Corriente L3" stroke="#D1D5DB" strokeWidth={1.5} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="avg" name="Promedio (L1,L2,L3)" stroke="#0055b8" strokeWidth={2.5} dot={false} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
                </div>
              )}
            </div>
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
          <LabelingMenu position={labelingMenu} onSelect={handleSaveLabel} onClose={closeLabelingMenu} tipos={tiposEventos} getCategoriesForTipo={getCategoriesForTipo} saving={savingLabel} />
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