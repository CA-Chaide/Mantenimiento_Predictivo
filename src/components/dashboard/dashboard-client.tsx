

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "./metric-chart";
import { ChartDataPoint, Component } from "@/lib/data";
import React from "react";
import { StatusIndicator, getComponentStatus, ComponentStatus } from "./status-indicator";
import { AnalysisModal } from "./analysis-modal";

interface DashboardClientProps {
  machineComponents: Component[];
  data: ChartDataPoint[];
  aprilData: ChartDataPoint[];
}

export function DashboardClient({ machineComponents, data, aprilData }: DashboardClientProps) {
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
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                  Corriente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
                  valueKey="Corriente Promedio Suavizado"
                  referenceKey="Referencia Corriente Promedio Suavizado"
                  limitKey="Corriente Máxima"
                  limitLabel="Corriente Max"
                  predictionKey="proyeccion_corriente_tendencia"
                  predictionPesimisticKey="proyeccion_corriente_pesimista"
                  predictionOptimisticKey="proyeccion_corriente_optimista"
                  referencePredictionKey="proyeccion_referencia_corriente_tendencia"
                  yAxisLabel="Amperios"
                  componentId={component.id}
                  metric="current"
                />
              </CardContent>
            </Card>
            
            <Card id={`component-${component.id}-unbalance`} className="w-full rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                  Desbalance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
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
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                  Factor de Carga
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
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

    