

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "./metric-chart";
import { ChartDataPoint, Component } from "@/lib/data";
import React from "react";
import { StatusIndicator, getComponentStatus, ComponentStatus } from "./status-indicator";
import { AnalysisModal } from "./analysis-modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface DashboardClientProps {
  machineComponents: Component[];
  data: ChartDataPoint[];
  aggregationLevel: 'minute' | 'hour' | 'month';
}

export function DashboardClient({ machineComponents, data, aggregationLevel }: DashboardClientProps) {
  const [modalStatus, setModalStatus] = React.useState<ComponentStatus | null>(null);

  const handleStatusClick = (status: ComponentStatus) => {
    setModalStatus(status);
  };

  const closeModal = () => {
    setModalStatus(null);
  };

  return (
    <div className="space-y-8">
      {machineComponents.map((component) => {
        const componentData = data; // Data is already filtered by component in page.tsx
        const statusInfo = getComponentStatus(componentData, component.name);
        
        return (
          <div key={component.id} className="w-full space-y-4">
             <div className="flex items-center gap-3 text-lg font-semibold text-slate-800 -mb-2">
                <div onClick={() => handleStatusClick(statusInfo)} className="cursor-pointer flex items-center gap-3">
                  <StatusIndicator status={statusInfo.status} message={statusInfo.message} />
                </div>
              </div>
            <Card id={`component-${component.id}`} className="w-full rounded-xl shadow-sm">
              <CardHeader>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 cursor-default">
                        Corriente
                        <Info className="size-4 text-slate-400" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Esfuerzo real del motor. Detecta sobrecargas o atascos.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
                  aggregationLevel={aggregationLevel}
                  valueKey="Corriente Promedio Suavizado"
                  referenceKey="Referencia Corriente Promedio Suavizado"
                  limitKey="Corriente Máxima"
                  limitLabel="Corriente Max"
                  predictionKey="proyeccion_corriente_tendencia"
                  predictionPesimisticKey="proyeccion_corriente_pesimista"
                  predictionOptimisticKey="proyeccion_corriente_optimista"
                  yAxisLabel="Amperios"
                  componentId={component.id}
                  metric="current"
                />
              </CardContent>
            </Card>
            
            <Card id={`component-${component.id}-unbalance`} className="w-full rounded-xl shadow-sm">
              <CardHeader>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 cursor-default">
                        Desbalance
                        <Info className="size-4 text-slate-400" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mide la diferencia de voltaje/corriente entre las líneas de alimentación.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
                  aggregationLevel={aggregationLevel}
                  valueKey="Desbalance Suavizado"
                  referenceKey="Referencia Desbalance Suavizado"
                  limitKey="Umbral Desbalance"
                  limitLabel="Umbral Max"
                  predictionKey="proyeccion_desbalance_tendencia"
                  predictionPesimisticKey="proyeccion_desbalance_pesimista"
                  predictionOptimisticKey="proyeccion_desbalance_optimista"
                  yAxisLabel="%"
                  componentId={component.id}
                  metric="unbalance"
                />
              </CardContent>
            </Card>

            <Card id={`component-${component.id}-load_factor`} className="w-full rounded-xl shadow-sm">
              <CardHeader>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 cursor-default">
                        Factor de Carga
                        <Info className="size-4 text-slate-400" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Porcentaje de capacidad utilizada. Indica si el motor es eficiente.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
                  aggregationLevel={aggregationLevel}
                  valueKey="Factor De Carga Suavizado"
                  referenceKey="Referencia Factor De Carga Suavizado"
                  limitKey="Umbral Factor Carga"
                  limitLabel="Umbral Max"
                  predictionKey="proyeccion_factor_carga_tendencia"
                  predictionPesimisticKey="proyeccion_factor_carga_pesimista"
                  predictionOptimisticKey="proyeccion_factor_carga_optimista"
                  yAxisLabel="Factor"
                  componentId={component.id}
                  metric="load_factor"
                />
              </CardContent>
            </Card>
          </div>
        )
      })}
      
      <AnalysisModal
        isOpen={!!modalStatus}
        onClose={closeModal}
        statusInfo={modalStatus}
      />
    </div>
  );
}

    