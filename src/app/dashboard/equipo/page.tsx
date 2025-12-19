"use client";

import { useEffect, useMemo, useState } from "react";
import { equipoService } from "@/services/equipo.service";
import { areaService } from "@/services/area.service";
import type { Equipo, Area } from "@/types/interfaces";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Plus, Save, RefreshCw, Trash2, X, Flag, EllipsisVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type FormState = {
  mode: "new" | "edit";
  data: Partial<Equipo>;
};

const emptyEquipo: Equipo = {
  codigo_equipo: 0 as any, // 0 para inserción
  codigo_area: "",
  nombre_equipo: "",
  estado: "A",
};

export default function EquipoPage() {
  const [items, setItems] = useState<Equipo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]); // Estado para almacenar las áreas disponibles
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<FormState>({ mode: "new", data: emptyEquipo });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const { toast }:
    { toast: (args: { title: string; description?: string; variant?: "default" | "destructive" | "success" | "warning" }) => void } = useToast();

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await equipoService.getAll();
      const data = Array.isArray(resp.data) ? resp.data : [];
      setItems(data);
      if (data.length === 0) {
        setShowForm(true);
      }
    } catch (e: any) {
      setError(e?.message || "Error cargando equipos");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const loadAreas = async () => {
      try {
        const resp = await areaService.getAll();
        setAreas(Array.isArray(resp.data) ? resp.data : []);
      } catch (e: any) {
        console.error("Error cargando áreas", e);
      }
    };
    loadAreas();
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return items;
    const f = filter.toLowerCase();
    return items.filter(it =>
      String(it.codigo_equipo).toLowerCase().includes(f) ||
      it.codigo_area.toLowerCase().includes(f) ||
      it.nombre_equipo.toLowerCase().includes(f) ||
      it.estado.toLowerCase().includes(f)
    );
  }, [items, filter]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const startNew = () => setForm({ mode: "new", data: { ...emptyEquipo } });
  const startEdit = (c: Equipo) => setForm({ mode: "edit", data: { ...c } });
  const cancelEdit = () => startNew();

  const onChangeField = (field: keyof Equipo, value: string) => {
    setForm(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const canSave = () => !!form.data.nombre_equipo && form.data.estado && form.data.codigo_area;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave()) return;
    setSaving(true); setError(null);
    try {
      const payload: any = {
        codigo_equipo: form.mode === "edit" ? String(form.data.codigo_equipo ?? 0) : 0,
        codigo_area: form.data.codigo_area || "",
        nombre_equipo: (form.data.nombre_equipo || "").trim(),
        estado: (form.data.estado || "A").trim(),
      };
      const respSaved = await equipoService.save(payload);
      const saved = respSaved.data;
      setItems(prev => {
        const exists = prev.some(it => it.codigo_equipo === saved.codigo_equipo);
        if (exists) return prev.map(it => it.codigo_equipo === saved.codigo_equipo ? saved : it);
        return [saved, ...prev];
      });
      startNew();
      setShowForm(false);
      toast({ title: "Equipo guardado", description: `Equipo ${saved.nombre_equipo} (${saved.codigo_equipo}) guardado.`, variant: "success" });
    } catch (e: any) {
      setError(e?.message || "Error guardando equipo");
      toast({ title: "Error al guardar", description: e?.message || "Fallo desconocido", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (codigo: string) => {
    if (!confirm("¿Eliminar equipo?")) return;
    setDeletingId(codigo); setError(null);
    try {
      await equipoService.delete(codigo);
      await load();
      if (form.mode === "edit" && form.data.codigo_equipo === codigo) startNew();
      toast({ title: "Equipo eliminado", description: `Se eliminó el equipo ${codigo}.`, variant: "success" });
    } catch (e: any) {
      setError(e?.message || "Error eliminando equipo");
      toast({ title: "Error al eliminar", description: e?.message || "Fallo desconocido", variant: "destructive" });
    } finally { setDeletingId(null); }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Equipos</CardTitle>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowForm(prev => !prev)}
              disabled={saving}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {showForm ? "Cerrar" : "Nuevo"}
            </Button>
          </div>
          <div className="mt-3">
            <Input
              placeholder="Filtrar (código, área, nombre, estado)"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-white border rounded-md px-3 py-2"
            />
          </div>
        </CardHeader>
        <CardContent>
          {showForm ? (
            <>
              {/* Formulario de creación/edición */}
              <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded-lg border max-w-md">
                <div className="mb-2">
                  <Label htmlFor="codigo_equipo">Código</Label>
                  <Input id="codigo_equipo" value={form.data.codigo_equipo ?? ''} disabled className="mt-1" />
                </div>
                <div className="mb-2">
                  <Label htmlFor="codigo_area">Área *</Label>
                  <Select
                    value={String(form.data.codigo_area) || ''}
                    onValueChange={value => onChangeField('codigo_area', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map(area => (
                        <SelectItem key={area.codigo_area} value={String(area.codigo_area)}>
                          {area.nombre_area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mb-2">
                  <Label htmlFor="nombre_equipo">Nombre *</Label>
                  <Input id="nombre_equipo" value={form.data.nombre_equipo || ''} onChange={e => onChangeField('nombre_equipo', e.target.value)} required className="mt-1" />
                </div>
                <div className="mb-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <select id="estado" className="w-full rounded-md border px-3 py-2 text-sm bg-white mt-1" value={form.data.estado || 'A'} onChange={e => onChangeField('estado', e.target.value)}>
                    <option value="A">Activo</option>
                    <option value="I">Inactivo</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className={form.mode === 'edit' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} disabled={!canSave() || saving}>
                    {form.mode === 'edit' ? 'Actualizar' : 'Guardar'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setShowForm(false); cancelEdit(); }} className="flex items-center gap-1">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Tabla de equipos */}
              <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="text-left px-3 py-2 w-32">Código</th>
                    <th className="text-left px-3 py-2">Área</th>
                    <th className="text-left px-3 py-2">Nombre</th>
                    <th className="text-left px-3 py-2">Estado</th>
                    <th className="px-3 py-2 text-center w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Cargando...</td></tr>
                  )}
                  {!loading && paginatedItems.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Sin resultados</td></tr>
                  )}
                  {!loading && paginatedItems.map(eq => (
                    <tr key={eq.codigo_equipo} className="transition-colors bg-white hover:bg-gray-100">
                      <td className="px-3 py-2 font-mono text-xs align-middle">{eq.codigo_equipo}</td>
                      <td className="px-3 py-2 align-middle">{areas.find(a => a.codigo_area === eq.codigo_area)?.nombre_area || eq.codigo_area}</td>
                      <td className="px-3 py-2 align-middle">{eq.nombre_equipo}</td>
                      <td className="px-3 py-2 align-middle">
                        <span className="inline-block rounded-full bg-green-600 text-white px-3 py-0.5 text-xs font-semibold">
                          Activo
                        </span>
                      </td>
                      <td className="px-3 py-1 text-center align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <EllipsisVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { startEdit(eq); setShowForm(true); }}>
                              ✏️ Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(eq.codigo_equipo)}
                              disabled={deletingId === eq.codigo_equipo}
                              className="text-red-600"
                            >
                              🗑️ Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* Controles de paginación */}
              <div className="flex items-center gap-4 mt-4">
                <label htmlFor="itemsPerPage" className="mr-2 text-sm">Items per page:</label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                  style={{ minWidth: 56 }}
                >
                  {[5, 10, 20].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-700">
                  {filtered.length === 0
                    ? '0'
                    : `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filtered.length)} of ${filtered.length}`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-2 py-1 rounded ${currentPage === 1 ? 'text-gray-400' : 'hover:bg-gray-200'}`}
                    aria-label="Primera página"
                  >&#171;</button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-2 py-1 rounded ${currentPage === 1 ? 'text-gray-400' : 'hover:bg-gray-200'}`}
                    aria-label="Página anterior"
                  >&#60;</button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`px-2 py-1 rounded ${currentPage === totalPages || totalPages === 0 ? 'text-gray-400' : 'hover:bg-gray-200'}`}
                    aria-label="Página siguiente"
                  >&#62;</button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`px-2 py-1 rounded ${currentPage === totalPages || totalPages === 0 ? 'text-gray-400' : 'hover:bg-gray-200'}`}
                    aria-label="Última página"
                  >&#187;</button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
