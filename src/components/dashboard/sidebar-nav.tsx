"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { MACHINES } from "@/lib/data";
import { HardDrive } from "lucide-react";

export function SidebarNav() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentMachine = searchParams.get("machine") || MACHINES[0].id;

  const handleMachineChange = (machineId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("machine", machineId);
    
    // Remove component since it's not selected via sidebar
    newParams.delete("component"); 
    
    router.push(`${pathname}?${newParams.toString()}`);
  };

  return (
    <SidebarMenu>
      {MACHINES.map((machine) => (
        <SidebarMenuItem key={machine.id}>
          <SidebarMenuButton
            onClick={() => handleMachineChange(machine.id)}
            isActive={currentMachine === machine.id}
            tooltip={{ children: machine.name, side: 'right' }}
          >
            <HardDrive />
            <span>{machine.name}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
