
"use client";

import React, { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface DashboardHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({ title, children }: DashboardHeaderProps) {

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-2xl">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </header>
  );
}

    