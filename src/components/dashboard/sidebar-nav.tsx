
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Component, Machine } from "@/lib/data";
import React from "react";
import { Button } from "../ui/button";

interface SidebarNavProps {
    machines: Machine[];
    components: Component[];
}

export function SidebarNav({ machines, components }: SidebarNavProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentMachine = searchParams.get("machine") || "";
  const currentComponent = searchParams.get("component");

  const handleMachineChange = (machineId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("machine", machineId);
    newParams.delete("component"); // Deselect component when machine changes
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
    <div className="w-full group-data-[collapsible=icon]:hidden px-2">
        <Accordion 
            type="single" 
            collapsible 
            className="w-full" 
            value={currentMachine}
            onValueChange={(value) => {
                if (value) handleMachineChange(value);
            }}
        >
            {machines.map((machine) => (
                <AccordionItem value={machine.id} key={machine.id} className="border-b-0">
                    <AccordionTrigger className="w-full text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:no-underline rounded-md px-3 py-2 [&[data-state=open]>svg]:text-primary">
                        {machine.name}
                    </AccordionTrigger>
                    <AccordionContent className="pt-1">
                        <div className="flex flex-col gap-1 pl-4 border-l-2 border-primary ml-2">
                        {machine.id === currentMachine && components.length > 0 ? (
                            components.map((component) => (
                                <Button
                                    key={component.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleComponentSelect(component.id)}
                                    className={`w-full justify-start h-auto py-1.5 px-2 text-left ${currentComponent === component.id ? 'bg-primary/20 text-primary-foreground font-semibold' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                                >
                                    {component.name}
                                </Button>
                            ))
                        ) : machine.id === currentMachine ? (
                            <div className="px-3 py-2 text-xs text-sidebar-foreground/60">
                                No hay componentes.
                            </div>
                        ) : null}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    </div>
  );
}
