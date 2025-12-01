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

  const statusConfig = {
    normal: { color: "bg-green-500", label: "Normal" },
    warning: { color: "bg-yellow-500", label: "Alerta" },
    critical: { color: "bg-red-500", label: "Crítico" },
  };

  const renderDiagnosis = () => {
    switch (status) {
      case "critical":
        return `CRÍTICO: El valor actual de ${getMetricName(details.metric)} (${details.currentValue?.toFixed(2)}) ha superado el límite permitido (${details.limitValue}). Se recomienda una parada y revisión inmediata.`;
      case "warning":
        if (details.projectedDate) {
          return `ALERTA TEMPRANA: La IA ha detectado una tendencia de riesgo. Se proyecta que el ${getMetricName(details.metric)} superará el umbral de seguridad en ${details.projectedDate}. Planificar mantenimiento preventivo.`;
        }
        return `ALERTA: El valor actual de ${getMetricName(details.metric)} (${details.currentValue?.toFixed(2)}) está operando cerca del límite de seguridad (${details.limitValue}). Se recomienda monitoreo continuo.`;
      case "normal":
      default:
        return "OPERACIÓN NORMAL: Todos los parámetros operativos se encuentran dentro de los rangos seguros. No se detectan anomalías en las proyecciones a 3 meses.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className={cn("size-5 rounded-full flex-shrink-0", statusConfig[status].color, status === 'critical' && 'animate-pulse')} />
            Análisis de Estado: {componentName}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">{renderDiagnosis()}</p>
          
          <h4 className="font-semibold mt-4">Detalles Técnicos Actuales</h4>
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
