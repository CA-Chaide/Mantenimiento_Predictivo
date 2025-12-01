"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "./metric-chart";
import { ChartDataPoint, Component } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import React from "react";

interface DashboardClientProps {
  machineComponents: Component[];
  data: ChartDataPoint[];
  aprilData: ChartDataPoint[];
}

export function DashboardClient({ machineComponents, data, aprilData }: DashboardClientProps) {
  const [showApril, setShowApril] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox id="show-april" checked={showApril} onCheckedChange={(checked) => setShowApril(!!checked)} />
          <Label htmlFor="show-april">Comparar con Abril 2025</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
        {machineComponents.map((component) => (
          <React.Fragment key={component.id}>
            <Card>
              <CardHeader>
                <CardTitle>{component.name} - Corriente</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricChart
                  data={data}
                  aprilData={aprilData}
                  showApril={showApril}
                  valueKey="realValue"
                  limitKey="limitValue"
                  refKey="refValue"
                  predictionKey="predictedValue"
                  aprilKey="aprilBaseline"
                  yAxisLabel="Amperios"
                  componentId={component.id}
                  metric="current"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{component.name} - Desbalance</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricChart
                  data={data}
                  aprilData={aprilData}
                  showApril={showApril}
                  valueKey="realValue"
                  limitKey="limitValue"
                  refKey="refValue"
                  predictionKey="predictedValue"
                  aprilKey="aprilBaseline"
                  yAxisLabel="%"
                  componentId={component.id}
                  metric="unbalance"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{component.name} - Factor de Carga</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricChart
                  data={data}
                  aprilData={aprilData}
                  showApril={showApril}
                  valueKey="realValue"
                  limitKey="limitValue"
                  refKey="refValue"
                  predictionKey="predictedValue"
                  aprilKey="aprilBaseline"
                  yAxisLabel="Factor"
                  componentId={component.id}
                  metric="load_factor"
                />
              </CardContent>
            </Card>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
