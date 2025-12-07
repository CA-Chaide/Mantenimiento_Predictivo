
'use client';

import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarTrigger, SidebarFooter } from "@/components/ui/sidebar";
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { useRealMaintenanceData, type MachineId, type Component, type Machine, aggregateDataByDay } from "@/lib/data";
import type { DateRange } from "react-day-picker";
import { format, parseISO, subDays } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, LogOut, MousePointerClick, Loader } from "lucide-react";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { calculosCorrientesDatosMantenimientoService } from "@/services/calculoscorrientesdatosmantenimiento.service";
import { useToast } from "@/hooks/use-toast";

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white">
      <div className="text-center">
        <MousePointerClick className="mx-auto h-24 w-24 text-slate-300" />
        <h3 className="mt-4 text-xl font-semibold text-slate-600">Seleccione un Componente</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Haga clic en una de las opciones del menú lateral y seleccione un rango de fechas para visualizar los indicadores.
        </p>
      </div>
    </div>
  )
}

function LoadingState({ progress }: { progress: number }) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg bg-slate-50">
        <div className="text-center">
          <Loader className="mx-auto h-24 w-24 animate-spin text-primary" />
          <h3 className="mt-4 text-xl font-semibold text-slate-700">Cargando Datos...</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Por favor espere mientras obtenemos la información más reciente.
          </p>
          {progress > 0 && (
            <div className="mt-4 w-64 mx-auto">
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-xs text-slate-600">{Math.round(progress)}% completado</p>
            </div>
          )}
        </div>
      </div>
    );
  }

function NoDataState() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-200 bg-amber-50">
      <div className="text-center">
        <svg className="mx-auto h-24 w-24 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="mt-4 text-xl font-semibold text-amber-800">No hay registros disponibles</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-amber-600">
          No se encontraron datos para la máquina y componente seleccionados en el rango de fechas especificado.
        </p>
      </div>
    </div>
  );
}

// Mapa para corregir nombres de componentes
const componentNameMapping: Record<string, Record<string, string>> = {
  "PUENTE GRUA": {
    "MOTOR ELEVACION DER": "Motor elevacion derecha",
    "MOTOR ELEVACION IZQ": "Motor elevacion izquierda",
    "MOTOR TRASLACION DER/IZQ": "Motor traslacion der/izq",
  },
};

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [machineList, setMachineList] = useState<Machine[]>([]);
  const [componentList, setComponentList] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [noDataAvailable, setNoDataAvailable] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Fetch machines
  useEffect(() => {
    async function fetchMachines() {
      try {
        const response = await calculosCorrientesDatosMantenimientoService.getMachines();
        if (response.data && Array.isArray(response.data)) {
          const transformedMachines = response.data
          .filter((m: any) => m.MAQUINA)
          .map((m: any) => {
            const machineName = m.MAQUINA;
            return {
              id: machineName.toString(),
              name: machineName.toString()
            };
          });
          setMachineList(transformedMachines);
        } else {
          console.error("Formato de respuesta inesperado para máquinas:", response);
          setMachineList([]);
        }
      } catch (error) {
        console.error("Error fetching machines:", error);
        setMachineList([]); 
      } finally {
        setLoading(false);
      }
    }
    fetchMachines();
  }, []);
  
  const machineId = (
    typeof searchParams.get('machine') === 'string' && machineList.some(m => m.id === searchParams.get('machine'))
      ? searchParams.get('machine')
      : undefined
  ) as MachineId | undefined;

  // Fetch components when machine changes
  useEffect(() => {
    async function fetchComponents() {
      if (!machineId) {
        setComponentList([]);
        return;
      };
      try {
        const response = await calculosCorrientesDatosMantenimientoService.getComponentsByMachine({ maquina: machineId });
        if (response.data && Array.isArray(response.data)) {
          const transformedComponents = response.data
          .filter((c: any) => c.COMPONENTE)
          .map((c: any) => {
            const originalName = c.COMPONENTE.toString();
            // Verificar si hay un mapeo para la máquina y componente actual
            const nameMappingForMachine = componentNameMapping[machineId];
            const correctedName = nameMappingForMachine ? nameMappingForMachine[originalName] || originalName : originalName;

            return {
              id: correctedName.toLowerCase().replace(/ /g, '_'),
              name: correctedName,
              originalName: originalName,
            };
          });
          setComponentList(transformedComponents);
        } else {
          console.error("Formato de respuesta inesperado para componentes:", response);
          setComponentList([]);
        }
      } catch (error) {
        console.error("Error fetching components:", error);
        setComponentList([]);
      }
    }
    fetchComponents();
  }, [machineId]);

  const componentId = typeof searchParams.get('component') === 'string' ? searchParams.get('component') : undefined;
  
  const fromDateString = searchParams.get('from');
  const toDateString = searchParams.get('to');
  
  const fromDate = useMemo(() => {
    try {
      if (fromDateString) return parseISO(fromDateString);
      return undefined;
    } catch (e) {
      return undefined;
    }
  }, [fromDateString]);
  
  const toDate = useMemo(() => {
    try {
      if (toDateString) return parseISO(toDateString);
      return undefined;
    } catch (e) {
      return undefined;
    }
  }, [toDateString]);

  const displayRange: DateRange | undefined = useMemo(() => {
    if (!fromDate || !toDate) return undefined;
    return { from: fromDate, to: toDate };
  }, [fromDate, toDate]);

  // Load real data when component or date range is selected
  useEffect(() => {
    async function loadChartData() {
      setNoDataAvailable(false);
      setLoadingProgress(0);
      
      if (!machineId || !componentId || !displayRange) {
        setChartData([]);
        setChartLoading(false);
        return;
      }

      const selectedComp = componentList.find(c => c.id === componentId);
      if (!selectedComp) {
        setChartData([]);
        setChartLoading(false);
        return;
      }

      setChartLoading(true);
      try {
        if (!displayRange.from || !displayRange.to) {
          setChartData([]);
          setChartLoading(false);
          return;
        }

        const result = await useRealMaintenanceData(
          machineId,
          selectedComp,
          displayRange,
          calculosCorrientesDatosMantenimientoService,
          (partialData, progress) => {
            setLoadingProgress(progress);
            if (progress < 100) {
              const aggregatedData = aggregateDataByDay(partialData);
              setChartData(aggregatedData);
            }
            if (partialData.length > 0) {
              setNoDataAvailable(false);
            }
          }
        );
        
        if (result.data.length > 0) {
          setChartData(result.data);
          setNoDataAvailable(false);
          toast({
            title: "Carga de Datos Completa",
            description: "La información ha sido actualizada correctamente.",
          });
        } else {
          setChartData([]);
          setNoDataAvailable(true);
        }
        setLoadingProgress(100);
      } catch (error: any) {
        console.error("Error loading chart data:", error);
        setChartData([]);
        setNoDataAvailable(true);
        setLoadingProgress(0);
        toast({
            variant: "destructive",
            title: "Error al Cargar Datos",
            description: error.message || "No se pudo obtener la información del servidor.",
        });
      } finally {
        setChartLoading(false);
      }
    }

    loadChartData();
  }, [machineId, componentId, fromDateString, toDateString, componentList, displayRange, toast]);

  // Early return after all hooks
  if (loading) {
    return (
      <SidebarProvider>
        <Sidebar collapsible="icon" side="left" className="border-r-0">
          <div className="flex flex-col justify-between h-full">
            <div>
              <SidebarHeader className="border-b border-sidebar-border">
                <div className="flex h-16 items-center gap-3 px-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Bot className="size-6" />
                  </div>
                </div>
              </SidebarHeader>
            </div>
          </div>
        </Sidebar>
        <SidebarInset className="bg-slate-50">
          <DashboardHeader title="Cargando..." />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <LoadingState progress={0} />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const selectedComponent = componentId ? componentList.find(c => c.id === componentId) : undefined;
  const machine = machineList.find(m => m.id === machineId);
  const headerTitle = selectedComponent ? `${machine?.name} > ${selectedComponent.name}` : machine?.name || 'Dashboard';
  
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" side="left" className="border-r-0">
        <div className="flex flex-col justify-between h-full">
            <div>
                <SidebarHeader className="border-b border-sidebar-border">
                <div className="flex h-16 items-center gap-3 px-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Bot className="size-6" />
                    </div>
                    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                      <h2 className="font-bold text-xl text-sidebar-foreground">Gemelo Digital</h2>
                      <p className="text-xs text-blue-200">Mantenimiento Predictivo</p>
                    </div>
                </div>
                </SidebarHeader>
                <SidebarContent>
                    <div className="p-2 flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
                        <label className="text-xs font-medium text-sidebar-foreground/80 px-2">Rango de Fechas</label>
                        <DateRangePicker initialDate={displayRange} className="w-full" />
                    </div>
                    <SidebarNav machines={machineList} components={componentList} />
                </SidebarContent>
            </div>
            <SidebarFooter className="p-2 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>N</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-sidebar-foreground truncate">Nombre Usuario</p>
                        <p className="text-xs text-sidebar-foreground/70 truncate">usuario@email.com</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </SidebarFooter>
        </div>
      </Sidebar>
      <SidebarInset className="bg-slate-50">
        <DashboardHeader title={headerTitle} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {!selectedComponent || !machineId || !displayRange ? (
            <EmptyState />
          ) : noDataAvailable && !chartLoading ? (
            <NoDataState />
          ) : chartLoading && chartData.length === 0 ? (
            <LoadingState progress={loadingProgress} />
          ) : (
            <div className="relative">
              {chartLoading && chartData.length > 0 && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-slate-50/80 backdrop-blur-sm h-full flex items-center justify-center">
                    <div className="text-center">
                         <Loader className="mx-auto h-12 w-12 animate-spin text-primary" />
                         <p className="mt-2 text-sm font-semibold text-slate-600">Recalculando Proyección...</p>
                    </div>
                </div>
              )}
              <div className={chartLoading ? "opacity-30" : ""}>
                <DashboardClient
                  machineComponents={selectedComponent ? [selectedComponent] : []}
                  data={chartData}
                  aprilData={[]}
                />
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

    