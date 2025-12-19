"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { menuService } from "@/services/menu.service";
import { environment } from "@/environments/environments.prod";
import type { ReactNode } from "react";

type MenuNode = {
  codigo_menu: number;
  codigo_padre: number | null;
  nombre: string;
  icono: string;
  path: string;
  estado: string;
  codigo_aplicacion: string;
  children?: MenuNode[];
};

type DashboardData = {
  menuItems: any[];
  menuLoading: boolean;
  menuError: string | null;
  reloadMenu: () => Promise<void>;
};

const DashboardDataContext = createContext<DashboardData | null>(null);

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error("useDashboardData must be used within DashboardDataProvider");
  return ctx;
}

function filterActive(nodes: MenuNode[]): MenuNode[] {
  return nodes
    .filter((node) => node.estado === "A")
    .map((node) => ({ ...node, children: node.children ? filterActive(node.children) : undefined }));
}

function combineMenus(menus: MenuNode[]): MenuNode[] {
  if (!menus || menus.length === 0) return [];
  const menuMap = new Map<number, MenuNode>();
  menus.forEach((menu) => {
    if (!menu || !menu.codigo_menu) return;
    const existing = menuMap.get(menu.codigo_menu);
    if (existing) {
      const allChildren = [...(existing.children || []), ...(menu.children || [])];
      menuMap.set(menu.codigo_menu, { ...existing, children: allChildren.length ? combineMenus(allChildren) : undefined });
    } else {
      menuMap.set(menu.codigo_menu, { ...menu, children: menu.children && menu.children.length ? combineMenus(menu.children) : undefined });
    }
  });
  return Array.from(menuMap.values());
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  async function cargarMenu() {
    setMenuLoading(true);
    setMenuError(null);
    try {
      const usuarioCodigo = typeof window !== "undefined" ? sessionStorage.getItem("usuario_codigo") : null;
      const codigoAplicacion = environment.nombreAplicacion || "APP_MENU_RESERVA";
      if (usuarioCodigo && codigoAplicacion) {
        const profileRes = await menuService.getUserProfiles(usuarioCodigo);
        const tipoUsuarioObj = (profileRes?.data as { Tipo_usuario?: any })?.Tipo_usuario || {};
        const usuarioPerfiles = Object.values(tipoUsuarioObj).map((tu: any) => tu.codigo_tipo_usuario);
        const appProfilesRes = await menuService.getAplicationProfiles(codigoAplicacion);
        const appPerfiles = (appProfilesRes?.data || []).map((ap: any) => ap.codigo_tipo_usuario);
        const perfilesMatch = usuarioPerfiles.filter((codigo: any) => appPerfiles.includes(codigo));
        const menusRes = await Promise.all(perfilesMatch.map((codigoTipoUsuario: any) => menuService.getMenuByCodigoTipoUsuario(codigoTipoUsuario)));
        let allMenus: MenuNode[] = [];
        menusRes.forEach((res) => {
          if (res && res.data) allMenus.push(res.data as MenuNode);
          else if (res && (res as any).codigo_menu) allMenus.push(res as any);
        });
        const combinedMenus = combineMenus(allMenus);
        const activeMenus = filterActive(combinedMenus);
        setMenuItems(activeMenus);
        try { if (typeof window !== "undefined") { sessionStorage.setItem("menu_has_items", activeMenus && activeMenus.length > 0 ? "true" : "false"); window.dispatchEvent(new Event("menu-items-updated")); } } catch {}
        if (!activeMenus || activeMenus.length === 0) {
          setMenuError("No tienes acceso a esta aplicación.");
        }
      } else {
        setMenuError("No tienes acceso a esta aplicación.");
      }
    } catch (err: any) {
      console.error("Error cargando menú en DashboardDataProvider:", err);
      setMenuError("Error cargando menú");
    } finally {
      setMenuLoading(false);
    }
  }

  useEffect(() => { cargarMenu(); }, []);

  return (
    <DashboardDataContext.Provider value={{ menuItems, menuLoading, menuError, reloadMenu: cargarMenu }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export default DashboardDataContext;
