"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate a data fetch
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
      // Here you would typically trigger a re-fetch of the data
      // For example: router.refresh() or a state management action
    }, 1500);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-2xl">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-slate-500">
          {lastUpdated ? `Actualizado: ${format(lastUpdated, "PPP p", { locale: es })}` : 'Actualizando...'}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          />
          <span className="sr-only">Refrescar datos</span>
        </Button>
      </div>
    </header>
  );
}
