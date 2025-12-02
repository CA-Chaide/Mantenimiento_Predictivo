
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  title?: string;
  onRefresh?: () => void;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial timestamp on mount
    setLastUpdated(new Date());
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Use Next.js router to re-fetch server data
    router.refresh();
  };

  useEffect(() => {
    // After a re-render (which router.refresh() will cause),
    // stop the spinning and update the timestamp.
    if (isRefreshing) {
        setLastUpdated(new Date());
        setIsRefreshing(false);
    }
    // This effect should run whenever `isRefreshing` changes.
    // We don't add router here as it's stable.
  }, [isRefreshing]);

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
