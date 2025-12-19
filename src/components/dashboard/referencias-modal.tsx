"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { referenciaService } from "@/services/referencia.service";
import type { Referencia } from "@/types/interfaces";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  componenteId: string;
  componenteNombre?: string;
}

export default function ReferenciasModal({ isOpen, onClose, componenteId, componenteNombre }: Props) {
  const [items, setItems] = useState<Referencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"new" | "edit">("new");
  const [form, setForm] = useState<Partial<Referencia>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await referenciaService.getAll();
      const data = Array.isArray(resp.data) ? resp.data : [];
      setItems(data.filter(r => String(r.codigo_componente) === String(componenteId)));
    } catch (e: any) {
      setError(e?.message || "Error cargando referencias");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen) {
      load();
      startNew();
    } else {
      setItems([]);
      setFormMode("new");
      setForm({});
      setError(null);
    }
  }, [isOpen, componenteId]);

  const startNew = () => {
    setFormMode("new");
    setForm({ codigo_referencia: "0", codigo_componente: componenteId, fecha_inicio_referencia: "", fecha_fin_referencia: "", estado: "A" });
  };

  const startEdit = (r: Referencia) => {
    setFormMode("edit");
    setForm({ ...r });
  };

  const onChange = (field: keyof Referencia, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const canSave = () => !!form.codigo_componente && !!form.fecha_inicio_referencia && !!form.fecha_fin_referencia && !!form.estado;

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSave()) return;
    setSaving(true); setError(null);
    try {
      const payload: Referencia = {
        codigo_referencia: formMode === "edit" ? String(form.codigo_referencia ?? "") : "0",
        codigo_componente: String(form.codigo_componente ?? componenteId),
        fecha_inicio_referencia: form.fecha_inicio_referencia as any,
        fecha_fin_referencia: form.fecha_fin_referencia as any,
        estado: (form.estado || "A").toString(),
      };
      const resp = await referenciaService.save(payload);
      toast({ title: "Referencia guardada", variant: "success" });
      await load();
      setFormMode("new");
      setForm({});
    } catch (e: any) {
      setError(e?.message || "Error guardando referencia");
      toast({ title: "Error al guardar", description: e?.message || "Fallo desconocido", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar referencia?")) return;
    setDeletingId(id);
    try {
      await referenciaService.delete(id);
      toast({ title: "Referencia eliminada", variant: "success" });
      await load();
    } catch (e: any) {
      setError(e?.message || "Error eliminando referencia");
      toast({ title: "Error al eliminar", description: e?.message || "Fallo desconocido", variant: "destructive" });
    } finally { setDeletingId(null); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-[80vw]">
        <DialogHeader>
          <DialogTitle>Referencias - {String(componenteNombre ?? componenteId)}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <div className="w-1/2">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold">Listado</h4>
                <div>
                  <Button size="sm" onClick={startNew} className="bg-blue-500 text-white">Nuevo</Button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-64 border rounded bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Código</th>
                      <th className="text-left px-3 py-2">Inicio</th>
                      <th className="text-left px-3 py-2">Fin</th>
                      <th className="px-3 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Cargando...</td></tr>}
                    {!loading && items.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">Sin referencias</td></tr>}
                    {!loading && items.map(it => (
                      <tr key={it.codigo_referencia} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono">{it.codigo_referencia}</td>
                        <td className="px-3 py-2">{String(it.fecha_inicio_referencia)}</td>
                        <td className="px-3 py-2">{String(it.fecha_fin_referencia)}</td>
                        <td className="px-3 py-2 text-center">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(it)}>Editar</Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(it.codigo_referencia)} disabled={deletingId === it.codigo_referencia}>Eliminar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-1/2">
              <form onSubmit={handleSave} className="bg-white p-4 rounded border">
                <div className="mb-2">
                  <Label htmlFor="codigo_referencia">Código</Label>
                  <Input id="codigo_referencia" value={String(form.codigo_referencia ?? "")} disabled className="mt-1" />
                </div>
                <div className="mb-2">
                  <Label htmlFor="fecha_inicio_referencia">Fecha inicio *</Label>
                  <Input id="fecha_inicio_referencia" type="date" value={String(form.fecha_inicio_referencia ?? "")} onChange={e => onChange('fecha_inicio_referencia', e.target.value)} required className="mt-1" />
                </div>
                <div className="mb-2">
                  <Label htmlFor="fecha_fin_referencia">Fecha fin *</Label>
                  <Input id="fecha_fin_referencia" type="date" value={String(form.fecha_fin_referencia ?? "")} onChange={e => onChange('fecha_fin_referencia', e.target.value)} required className="mt-1" />
                </div>
                <div className="mb-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <select id="estado" className="w-full rounded-md border px-3 py-2 text-sm bg-white mt-1" value={String(form.estado ?? 'A')} onChange={e => onChange('estado', e.target.value)}>
                    <option value="A">Activo</option>
                    <option value="I">Inactivo</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className={formMode === 'edit' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} disabled={!canSave() || saving}>{formMode === 'edit' ? 'Actualizar' : 'Guardar'}</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { startNew(); }}>Cancelar</Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
