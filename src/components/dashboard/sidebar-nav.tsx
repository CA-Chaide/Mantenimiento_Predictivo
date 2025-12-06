
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar";
import { Component, Machine } from "@/lib/data";
import { HardDrive } from "lucide-react";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SidebarNavProps {
    machines: Machine[];
    components: Component[];
}

export function SidebarNav({ machines, components }: SidebarNavProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { state: sidebarState } = useSidebar();

  const currentMachine = searchParams.get("machine") || "";
  const currentComponent = searchParams.get("component");

  const handleMachineChange = (machineId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("machine", machineId);
    newParams.delete("component");
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const handleComponentSelect = (componentId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("component", componentId);
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
  };

  if (!machines || machines.length === 0) {
    return (
        <div className="p-4 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            Cargando máquinas...
        </div>
    );
  }

  return (
    <SidebarMenu>
      <div className="px-4 pt-4 pb-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        MÁQUINAS
      </div>
      <div className="px-2 group-data-[collapsible=icon]:hidden">
        <Select onValueChange={handleMachineChange} defaultValue={currentMachine} value={currentMachine}>
            <SelectTrigger className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white focus:ring-2 focus:ring-white">
                <SelectValue placeholder="Seleccione una máquina" />
            </SelectTrigger>
            <SelectContent>
                {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                        {machine.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      <div className="px-4 pt-4 pb-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        COMPONENTES
      </div>
      
      {/* Icon-only view for collapsed sidebar */}
      <div className="hidden group-data-[collapsible=icon]:flex flex-col gap-1">
        {machines.map((machine) => {
          const isActive = currentMachine === machine.id;
          return (
            <SidebarMenuItem key={machine.id}>
                <SidebarMenuButton
                onClick={() => handleMachineChange(machine.id)}
                isActive={isActive}
                tooltip={{ children: machine.name, side: 'right' }}
                >
                <HardDrive />
                </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </div>
      
      {/* Expanded view */}
      <div className="group-data-[collapsible=icon]:hidden">
        {currentMachine && components.length > 0 && (
            <SidebarMenuSub>
                {components.map(component => (
                    <SidebarMenuItem key={component.id}>
                        <SidebarMenuSubButton 
                            onClick={() => handleComponentSelect(component.id)}
                            isActive={currentComponent === component.id}
                        >
                            <span>{component.name}</span>
                        </SidebarMenuSubButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenuSub>
        )}
        {currentMachine && components.length === 0 && (
            <div className="p-4 text-xs text-sidebar-foreground/70">
                No hay componentes para esta máquina.
            </div>
        )}
      </div>
    </SidebarMenu>
  );
}
