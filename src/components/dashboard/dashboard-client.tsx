"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "./date-range-picker";
import { MetricChart } from "./metric-chart";
import { COMPONENTS, type MachineId, type ComponentId, type MetricDataPoint } from "@/lib/data";

interface DashboardClientProps {
  data: MetricDataPoint[];
  machineId: MachineId;
  componentId: ComponentId;
  dateRange: DateRange;
}

export function DashboardClient({ data, machineId, componentId, dateRange }: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleComponentChange = (newComponentId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("component", newComponentId);
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const availableComponents = COMPONENTS[machineId];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={componentId} onValueChange={handleComponentChange}>
          <TabsList>
            {availableComponents.map((comp) => (
              <TabsTrigger key={comp.id} value={comp.id}>
                {comp.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <DateRangePicker initialDate={dateRange} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Corriente</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart
              data={data}
              metricKey="current"
              yAxisLabel="Amperios"
              lineConfig={{
                real: { name: "Corriente Promedio Suavizado", key: "val_smooth" },
                ref: { name: "Referencia Corriente Promedio Suavizado", key: "ref_smooth" },
                limit: { name: "Corriente Máxima", key: "max" },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Desbalance</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart
              data={data}
              metricKey="unbalance"
              yAxisLabel="%"
              lineConfig={{
                real: { name: "Desbalance Suavizado", key: "val_smooth" },
                ref: { name: "Referencia Desbalance Suavizado", key: "ref_smooth" },
                limit: { name: "Umbral Desbalance", key: "threshold" },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Factor de Carga</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart
              data={data}
              metricKey="load_factor"
              yAxisLabel="Factor"
              lineConfig={{
                real: { name: "Factor De Carga Suavizado", key: "val_smooth" },
                ref: { name: "Referencia Factor De Carga Suavizado", key: "ref_smooth" },
                limit: { name: "Umbral Factor Carga", key: "threshold" },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
