
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ComponentStatus } from "./status-indicator";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInDays, parseISO } from "date-fns";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusInfo: ComponentStatus | null;
}

const getMetricName = (metric: 'current' | 'unbalance' | 'load_factor' | 'none') => {
    switch (metric) {
      case 'current': return 'Corriente';
      case 'unbalance': return 'Desbalance';
      case 'load_factor': return 'Factor de Carga';
      default: return '';
    }
  };

export function AnalysisModal({ isOpen, onClose, statusInfo }: AnalysisModalProps) {
  if (!statusInfo) return null;

  const { status, componentName, details, allMetrics } = statusInfo;
  const simulatedToday = new Date('2025-11-26T00:00:00Z');

  const statusConfig = {
    normal: { color: "bg-green-500", label: "Normal" },
    warning: { color: "bg-yellow-500", label: "Alerta" },
    critical: { color: "bg-red-500", label: "Crítico" },
  };

  const getAnalysisData = () => {
    const data = {
        condicion: "NORMAL - Estable",
        diagnostico: "Holgura de seguridad: OK",
        tiempoEstimado: "N/A",
        accion: "Monitoreo Continuo"
    };

    switch (status) {
      case "critical":
        data.condicion = "CRÍTICO - Límite Excedido";
        data.accion = "Parada / Inspección Física";
        data.tiempoEstimado = "Inmediato / Actual";
        if (details.currentValue != null && details.limitValue != null) {
          const percentage = ((details.currentValue / details.limitValue) * 100).toFixed(0);
          data.diagnostico = `Valor al ${percentage}% del límite (${details.currentValue.toFixed(2)} / ${details.limitValue.toFixed(2)})`;
        } else {
            data.diagnostico = "Valor actual excede el límite de seguridad.";
        }
        break;
      case "warning":
        data.condicion = "PREDICTIVO - Tendencia Ascendente";
        data.accion = "Planificar Mantenimiento / Pedir Repuesto";
        if (details.projectedDate) {
          const daysToFailure = differenceInDays(parseISO(details.projectedDate), simulatedToday);
          data.tiempoEstimado = `~${daysToFailure} Días para fallo crítico`;
          data.diagnostico = `Proyección alcanzará el límite en ${details.projectedDate}`;
        } else if (details.currentValue != null && details.limitValue != null) {
            const percentage = ((details.currentValue / details.limitValue) * 100).toFixed(0);
            data.diagnostico = `Valor actual al ${percentage}% del límite (${details.currentValue.toFixed(2)} / ${details.limitValue.toFixed(2)})`;
            data.tiempoEstimado = "N/A (monitoreo)";
        }
        break;
    }
    return data;
  }

  const analysis = getAnalysisData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className={cn("size-5 rounded-full flex-shrink-0", statusConfig[status].color, status === 'critical' && 'animate-pulse')} />
            Ficha Técnica: {componentName}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 pt-4">
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-semibold text-muted-foreground w-1/3">Condición</TableCell>
                        <TableCell>
                            <span className={cn(
                                status === 'critical' && 'text-red-600 font-bold',
                                status === 'warning' && 'text-yellow-600 font-bold'
                            )}>
                                {analysis.condicion}
                            </span>
                        </TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-semibold text-muted-foreground">Diagnóstico</TableCell>
                        <TableCell className="font-mono">{analysis.diagnostico}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-semibold text-muted-foreground">Tiempo Estimado</TableCell>
                        <TableCell className="font-bold font-mono">{analysis.tiempoEstimado}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-semibold text-muted-foreground">Acción Sugerida</TableCell>
                        <TableCell>{analysis.accion}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>

          <h4 className="font-semibold">Detalles Técnicos Actuales ({getMetricName(details.metric)})</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-right">Valor / Límite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMetrics.map(metric => (
                <TableRow key={metric.metric}>
                  <TableCell>{metric.metric}</TableCell>
                  <TableCell className="text-right font-mono">{metric.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

        </div>
        <DialogFooter>
          <Button onClick={onClose}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
