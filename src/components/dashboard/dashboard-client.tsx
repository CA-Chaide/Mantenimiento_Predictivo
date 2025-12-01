"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "./metric-chart";
import { ChartDataPoint, Component } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import React from "react";
import { StatusIndicator, getComponentStatus, ComponentStatus } from "./status-indicator";
import { AnalysisModal } from "./analysis-modal";

interface DashboardClientProps {
  machineComponents: Component[];
  data: ChartDataPoint[];
  aprilData: ChartDataPoint[];
}

export function DashboardClient({ machineComponents, data, aprilData }: DashboardClientProps) {
  const [showApril, setShowApril] = React.useState(false);
  const [modalStatus, setModalStatus] = React.useState<ComponentStatus | null>(null);

  const handleStatusClick = (status: ComponentStatus) => {
    setModalStatus(status);
  };

  const closeModal = () => {
    setModalStatus(null);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox id="show-april" checked={showApril} onCheckedChange={(checked) => setShowApril(!!checked)} />
          <Label htmlFor="show-april">Comparar con Abril 2025</Label>
        </div>
      </div>

      {machineComponents.map((component) => {
        const componentData = data.filter(d => d.componentId === component.id);
        const statusInfo = getComponentStatus(componentData, component.name);
        
        return (
          <div key={component.id} className="w-full space-y-8">
            <Card id={`component-${component.id}`} className="w-full rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                  Corriente (Amperios)
                  <div onClick={() => handleStatusClick(statusInfo)} className="cursor-pointer">
                    <StatusIndicator status={statusInfo.status} message={statusInfo.message} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
                  aprilData={aprilData}
                  showApril={showApril}
                  valueKey="Corriente Promedio Suavizado"
                  limitKey="Corriente Máxima"
                  limitLabel="Corriente Max"
                  refKey="Referencia Corriente Promedio Suavizado"
                  predictionKey="predictedValue"
                  aprilKey="aprilBaseline"
                  yAxisLabel="Amperios"
                  componentId={component.id}
                  metric="current"
                />
              </CardContent>
            </Card>
            
            <Card id={`component-${component.id}-unbalance`} className="w-full rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                  Desbalance (%)
                  <div onClick={() => handleStatusClick(statusInfo)} className="cursor-pointer">
                    <StatusIndicator status={statusInfo.status} message={statusInfo.message} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
                  aprilData={aprilData}
                  showApril={showApril}
                  valueKey="Desbalance Suavizado"
                  limitKey="Umbral Desbalance"
                  limitLabel="Umbral Max"
                  refKey="Referencia Desbalance Suavizado"
                  predictionKey="predictedValue"
                  aprilKey="aprilBaseline"
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
                   <div onClick={() => handleStatusClick(statusInfo)} className="cursor-pointer">
                    <StatusIndicator status={statusInfo.status} message={statusInfo.message} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MetricChart
                  data={data}
                  aprilData={aprilData}
                  showApril={showApril}
                  valueKey="Factor De Carga Suavizado"
                  limitKey="Umbral Factor Carga"
                  limitLabel="Umbral Max"
                  refKey="Referencia Factor De Carga Suavizado"
                  predictionKey="predictedValue"
                  aprilKey="aprilBaseline"
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
