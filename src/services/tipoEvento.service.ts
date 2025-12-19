import type { TipoEvento } from "@/types/interfaces";
import type { BodyListResponse } from "@/types/body-list-response";
import type { BodyResponse } from "@/types/body-response";
import { environment } from "@/environments/environments.prod";

const API_URL = `${environment.apiURL}/api/tipo_evento`;

// Simple in-flight cache / mutex to avoid issuing multiple concurrent GETs
let _getAllPromise: Promise<BodyListResponse<TipoEvento>> | null = null;
// Simple memory cache with TTL to avoid re-fetching on quick navigations
let _lastGetAllResult: BodyListResponse<TipoEvento> | null = null;
let _lastGetAllAt = 0;

export const tipoEventoService = {
  async getAll(): Promise<BodyListResponse<TipoEvento>> {
    const cacheTtlMs = 60 * 1000; // 60 seconds

    // If we have a cached result and it's fresh, return it
    if (_lastGetAllResult && Date.now() - _lastGetAllAt < cacheTtlMs) {
      return Promise.resolve(_lastGetAllResult);
    }

    if (_getAllPromise) {
      // Return the existing in-flight promise to avoid duplicate requests
      return _getAllPromise;
    }

    const controller = new AbortController();
    const timeoutMs = 30000; // 30s timeout to avoid very long hanging requests

    _getAllPromise = (async () => {
      try {
        console.log("📡 Calling API:", API_URL);
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        console.log("📊 API Response status:", response.status, response.statusText);
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
          console.error("❌ API Error:", errorBody);
          throw new Error(errorBody.message || 'Failed to fetch tipo-eventos');
        }
        const data = await response.json();
        console.log("✅ API Data received:", data);
        // store in-memory cache
        _lastGetAllResult = data;
        _lastGetAllAt = Date.now();
        return data;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.error('⏱️ Request aborted due to timeout');
          throw new Error('Request timeout');
        }
        console.error("💥 Fetch error:", error);
        throw error;
      } finally {
        // clear the in-flight marker so subsequent calls can make a new request
        _getAllPromise = null;
      }
    })();

    return _getAllPromise;
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
