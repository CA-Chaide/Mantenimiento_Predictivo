"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar";
import { MACHINES, Component, COMPONENTS } from "@/lib/data";
import { HardDrive, ChevronRight } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
    components: Component[];
}

export function SidebarNav({ components }: SidebarNavProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentMachine = searchParams.get("machine") || MACHINES[0].id;

  const handleMachineChange = (machineId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("machine", machineId);
    
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const handleComponentScroll = (componentId: string) => {
    const element = document.getElementById(`component-${componentId}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  return (
    <SidebarMenu>
        <div className="px-4 pt-4 pb-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">MÁQUINAS</div>
      {MACHINES.map((machine) => {
        const isActive = currentMachine === machine.id;
        return (
          <SidebarMenuItem key={machine.id}>
            <SidebarMenuButton
              onClick={() => handleMachineChange(machine.id)}
              isActive={isActive}
              tooltip={{ children: machine.name, side: 'right' }}
            >
              <HardDrive />
              <span>{machine.name}</span>
              <ChevronRight className={cn(
                  "ml-auto size-4 transform transition-transform",
                  isActive && "rotate-90"
              )} />
            </SidebarMenuButton>
            {isActive && (
                <SidebarMenuSub>
                    {COMPONENTS[machine.id].map(component => (
                        <SidebarMenuItem key={component.id}>
                            <SidebarMenuSubButton onClick={() => handleComponentScroll(component.id)}>
                                <span>{component.name}</span>
                            </SidebarMenuSubButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  );
}
