import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { generateMockData, MACHINES, COMPONENTS, MachineId, ComponentId } from "@/lib/data";
import type { DateRange } from "react-day-picker";
import { addDays, startOfMonth } from "date-fns";
import { Bot } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const machine = (
    typeof searchParams.machine === 'string' && MACHINES.some(m => m.id === searchParams.machine)
      ? searchParams.machine
      : MACHINES[0].id
  ) as MachineId;

  const availableComponents = COMPONENTS[machine];
  const component = (
    typeof searchParams.component === 'string' && availableComponents.some(c => c.id === searchParams.component)
      ? searchParams.component
      : availableComponents[0].id
  ) as ComponentId;

  const today = new Date(2025, 10, 15); // Simulated current date: Nov 2025
  const defaultFrom = startOfMonth(today);
  const defaultTo = addDays(defaultFrom, 14);

  const dateRange: DateRange = {
    from: searchParams.from ? new Date(searchParams.from as string) : defaultFrom,
    to: searchParams.to ? new Date(searchParams.to as string) : defaultTo,
  };

  const data = generateMockData(machine, component, dateRange);

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
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden"/>
          <div className="flex-1">
            <h1 className="text-lg font-semibold md:text-2xl capitalize">{MACHINES.find(m => m.id === machine)?.name}</h1>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <DashboardClient
            data={data}
            machineId={machine}
            componentId={component}
            dateRange={dateRange}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
