import type { CategoriaEvento, Componente } from "@/types/interfaces";
import type { BodyListResponse } from "@/types/body-list-response";
import type { BodyResponse } from "@/types/body-response";
import { environment } from "@/environments/environments.prod";

const API_URL = `${environment.apiURL}/api/categoria_evento`;

export const categoriaEventoService = {
  async getAll(): Promise<BodyListResponse<CategoriaEvento>> {
    const response = await fetch(API_URL);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || 'Failed to fetch componentes');
    }
    return response.json();
  },

  async getById(id: number | string): Promise<BodyResponse<CategoriaEvento>> {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch CategoriaEvento with id ${id}`);
    }
    return response.json();
  },

  async save(data: CategoriaEvento): Promise<BodyResponse<CategoriaEvento>> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || 'Failed to save CategoriaEvento');
    }
    return response.json();
  },

  async delete(id: number | string): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to delete CategoriaEvento with id ${id}`);
    }
  },
};
