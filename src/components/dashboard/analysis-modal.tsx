
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
import { Badge } from "../ui/badge";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusInfo: ComponentStatus | null;
}

export function AnalysisModal({ isOpen, onClose, statusInfo }: AnalysisModalProps) {
  if (!statusInfo) return null;

  const { status, componentName, details, allMetrics } = statusInfo;

  const statusConfig = {
    normal: { color: "bg-green-500", text: 'text-green-700', label: "Normal", badge: 'default' },
    warning: { color: "bg-yellow-500", text: 'text-yellow-700', label: "Alerta", badge: 'secondary' },
    critical: { color: "bg-red-500", text: 'text-red-700', label: "Crítico", badge: 'destructive' },
    unknown: { color: "bg-slate-400", text: 'text-slate-500', label: "Desconocido", badge: 'outline' }
  };
  
  const currentStatusInfo = statusConfig[status];

  let timeToFailureMessage = null;
  if (status === 'warning' && details.projectedDate) {
    const daysToFailure = differenceInDays(parseISO(details.projectedDate), new Date());
    if (daysToFailure >= 0) {
      timeToFailureMessage = `Proyección IA: Cruce de límite en ~${daysToFailure} días.`;
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Estado: {componentName}</span>
            <Badge variant={currentStatusInfo.badge} className={cn(
                status === 'normal' && 'bg-green-100 text-green-800',
                status === 'warning' && 'bg-yellow-100 text-yellow-800',
            )}>
              {currentStatusInfo.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead>Valor Actual</TableHead>
                <TableHead>Límite</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMetrics.map(metric => {
                const metricStatusInfo = statusConfig[metric.status];
                return (
                    <TableRow key={metric.metric}>
                        <TableCell className="font-semibold">{metric.metric}</TableCell>
                        <TableCell className="font-mono">{metric.value?.toFixed(2) ?? 'N/A'}</TableCell>
                        <TableCell className="font-mono">{metric.limit?.toFixed(2) ?? 'N/A'}</TableCell>
                        <TableCell className="text-right">
                           <Badge variant={metricStatusInfo.badge} className={cn(
                                metric.status === 'normal' && 'bg-green-100 text-green-800',
                                metric.status === 'warning' && 'bg-yellow-100 text-yellow-800',
                            )}>
                                {metricStatusInfo.label}
                            </Badge>
                        </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>

            {timeToFailureMessage && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-center">
                    <p className="font-bold text-sm text-yellow-800">{timeToFailureMessage}</p>
                </div>
            )}

        </div>
        <DialogFooter>
          <Button onClick={onClose}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
