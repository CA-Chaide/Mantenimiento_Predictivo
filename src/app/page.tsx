
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { useMaintenanceData, MACHINES, COMPONENTS, MachineId, Component } from "@/lib/data";
import type { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, addMonths, format, parseISO } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, LogOut, MousePointerClick } from "lucide-react";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white">
      <div className="text-center">
        <MousePointerClick className="mx-auto h-24 w-24 text-slate-300" />
        <h3 className="mt-4 text-xl font-semibold text-slate-600">Seleccione un Componente</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Haga clic en una de las opciones del menú lateral para visualizar los indicadores de Corriente, Desbalance y Factor de Carga.
        </p>
      </div>
    </div>
  )
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const machineId = (
    typeof searchParams.machine === 'string' && MACHINES.some(m => m.id === searchParams.machine)
      ? searchParams.machine
      : MACHINES[0].id
  ) as MachineId;

  const componentId = typeof searchParams.component === 'string' ? searchParams.component : undefined;

  const simulatedToday = parseISO('2025-11-26T00:00:00Z');
  
  const defaultFromDate = startOfMonth(simulatedToday);
  const defaultToDate = endOfMonth(simulatedToday);
  
  const fromDateString = typeof searchParams.from === 'string' ? searchParams.from : format(defaultFromDate, "yyyy-MM-dd");
  const toDateString = typeof searchParams.to === 'string' ? searchParams.to : format(defaultToDate, "yyyy-MM-dd");
  
  const fromDate = parseISO(fromDateString);
  const toDate = parseISO(toDateString);

  const futureProjectionDate = addMonths(toDate, 3);
  
  const fullRange: DateRange = {
    from: fromDate,
    to: futureProjectionDate,
  };

  const displayRange: DateRange = {
    from: fromDate,
    to: toDate,
  }

  const { data, aprilData } = useMaintenanceData(machineId, fullRange, simulatedToday);

  const allMachineComponents = COMPONENTS[machineId] || [];
  const selectedComponent = componentId ? allMachineComponents.find(c => c.id === componentId) : undefined;
  
  const machine = MACHINES.find(m => m.id === machineId);
  const headerTitle = selectedComponent ? `${machine?.name} > ${selectedComponent.name}` : machine?.name;

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
                <SidebarContent className="p-2">
                    <div className="p-2 flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
                        <label className="text-xs font-medium text-sidebar-foreground/80 px-2">Rango de Fechas</label>
                        <DateRangePicker initialDate={displayRange} className="w-full" />
                    </div>
                <SidebarNav allComponents={allMachineComponents} />
                </SidebarContent>
            </div>

            <div className="mt-auto">
                <div className="border-t border-sidebar-border p-2">
                    <div className="group-data-[collapsible=icon]:hidden p-2 flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">AD</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-semibold text-sidebar-foreground">Admin Planta</p>
                            <p className="text-xs text-sidebar-foreground/80">Supervisor</p>
                        </div>
                        <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                            <LogOut className="size-4" />
                        </Button>
                    </div>
                    <div className="hidden group-data-[collapsible=icon]:flex justify-center p-2">
                         <Button variant="ghost" size="icon" className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                            <LogOut className="size-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </Sidebar>
      <SidebarInset className="bg-slate-50">
        <DashboardHeader title={headerTitle} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {selectedComponent ? (
            <DashboardClient
              machineComponents={[selectedComponent]}
              data={data}
              aprilData={aprilData}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
