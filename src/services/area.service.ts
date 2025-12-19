import type { Area } from "@/types/interfaces";
import type { BodyListResponse } from "@/types/body-list-response";
import type { BodyResponse } from "@/types/body-response";
import { environment } from "@/environments/environments.prod";

const API_URL = `${environment.apiURL}/api/area`;

export const areaService = {
  async getAll(): Promise<BodyListResponse<Area>> {
    const response = await fetch(API_URL);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || 'Failed to fetch areas');
    }
    return response.json();
  },

  async getById(id: number | string): Promise<BodyResponse<Area>> {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch area with id ${id}`);
    }
    return response.json();
  },

  async save(data: Area): Promise<BodyResponse<Area>> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || 'Failed to save area');
    }
    return response.json();
  },

  async delete(id: number | string): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to delete area with id ${id}`);
    }
  },
};
