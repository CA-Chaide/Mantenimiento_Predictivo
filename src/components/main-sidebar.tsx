'use client';
import React from 'react';
import { SidebarContent, SidebarGroup, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import AuthCheckingOverlay from './auth-checking-overlay';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { History, LayoutDashboard, PlusCircle, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export function MainSidebar() {
  const { authData, logout, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/new-record', label: 'Nuevo Registro', icon: PlusCircle },
    { href: '/dashboard/history', label: 'Historial', icon: History },
    { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
  ];

  let localidadParseada = authData?.localidad || '';
  if (authData?.localidad === 'UIO') {
    localidadParseada = 'Quito';
  } else if (authData?.localidad === 'GYE') {
    localidadParseada = 'Guayaquil';
  }

  const userData = {
    nombre: authData?.nombre || '',
    departamento: authData?.departamento || '',
    localidad: localidadParseada,
    turno: authData?.turno || 'diurno'
  };

  // Mostrar toast si no hay sesión activa y no está cargando
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: 'Sesión requerida',
        description: 'Por favor, inicie sesión para continuar.',
        duration: 4000,
        variant: 'destructive',
      });
    }
  }, [isLoading, isAuthenticated, toast]);

  return (
    <>
      {isLoading && <AuthCheckingOverlay />}
      <SidebarHeader className="p-4" style={{ backgroundColor: '#0055b8' }}>
        <Link href="/dashboard" className="flex items-center">
          <Image src="https://chaideec.vtexassets.com/assets/vtex.file-manager-graphql/images/9f760bac-f8fe-40b2-8ba6-ca1acbcdcde1___d3f5a5d16f57e5e2ff8d1ee0f77e428d.png" alt="Chaide Logo" width={140} height={38} priority />
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-4" style={{ backgroundColor: '#0055b8' }}>
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className="[&[data-active=true]]:bg-white/10 [&[data-active=true]]:text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span className="text-white">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4" style={{ backgroundColor: '#0055b8' }}>
        <div className="flex items-center justify-between rounded-lg bg-white/10 p-2">
          <div className="flex flex-col items-start overflow-hidden">
            <span className="font-semibold text-white text-sm leading-tight break-words max-w-full">
              {userData.nombre || 'Usuario'}
            </span>
            <span className="text-xs text-white/70">
              {userData.departamento}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-white hover:bg-white/10">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
