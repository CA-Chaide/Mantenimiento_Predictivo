import type { TipoEvento } from "@/types/interfaces";
import type { BodyListResponse } from "@/types/body-list-response";
import type { BodyResponse } from "@/types/body-response";
import { environment } from "@/environments/environments.prod";

const API_URL = `${environment.apiURL}/api/tipo_evento`;

export const tipoEventoService = {
  async getAll(): Promise<BodyListResponse<TipoEvento>> {
    const response = await fetch(API_URL);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || 'Failed to fetch tipo-eventos');
    }
    return response.json();
  },

  async getById(id: number | string): Promise<BodyResponse<TipoEvento>> {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch tipo-evento with id ${id}`);
    }
    return response.json();
  },

  async save(data: TipoEvento): Promise<BodyResponse<TipoEvento>> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || 'Failed to save tipo-evento');
    }
    return response.json();
  },

  async delete(id: number | string): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to delete tipo-evento with id ${id}`);
    }
  },
};
