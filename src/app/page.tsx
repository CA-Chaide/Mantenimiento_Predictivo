import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { useMaintenanceData, MACHINES, COMPONENTS, MachineId } from "@/lib/data";
import type { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, addMonths, format, parseISO } from "date-fns";
import { Bot } from "lucide-react";

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const machine = (
    typeof searchParams.machine === 'string' && MACHINES.some(m => m.id === searchParams.machine)
      ? searchParams.machine
      : MACHINES[0].id
  ) as MachineId;

  // Use a string literal for the date to ensure it's timezone-agnostic (interpreted as UTC)
  const simulatedToday = parseISO('2025-11-15T00:00:00Z');
  
  const startOfSimulatedMonth = startOfMonth(simulatedToday);
  const endOfSimulatedMonth = endOfMonth(simulatedToday);

  // Default date range is the current simulated month. Dates are parsed from ISO strings to ensure consistency.
  const fromDateString = typeof searchParams.from === 'string' ? searchParams.from : format(startOfSimulatedMonth, "yyyy-MM-dd");
  const toDateString = typeof searchParams.to === 'string' ? searchParams.to : format(endOfSimulatedMonth, "yyyy-MM-dd");
  
  // Use parseISO to correctly handle dates without timezone causing shifts.
  const fromDate = parseISO(fromDateString);
  const toDate = parseISO(toDateString);

  // Add 3 months for future projection
  const futureProjectionDate = addMonths(toDate, 3);
  
  const fullRange: DateRange = {
    from: fromDate,
    to: futureProjectionDate,
  };

  const displayRange: DateRange = {
    from: fromDate,
    to: toDate,
  }

  const { data, aprilData } = useMaintenanceData(machine, fullRange, simulatedToday);

  const machineComponents = COMPONENTS[machine] || [];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" side="left" className="border-r-0">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-12 items-center gap-2 px-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="size-5" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <h2 className="font-semibold text-lg tracking-tight text-sidebar-foreground">Predictive Insight</h2>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-slate-50">
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden"/>
          <div className="flex-1">
            <h1 className="text-lg font-semibold md:text-2xl capitalize">{MACHINES.find(m => m.id === machine)?.name}</h1>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <DashboardClient
            machineComponents={machineComponents}
            data={data}
            aprilData={aprilData}
            dateRange={displayRange}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
