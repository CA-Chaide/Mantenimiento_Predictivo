
import { environment } from "@/environments/environments.prod";
import type { BodyListResponse } from "@/types/body-list-response";

const API_URL = `${environment.apiURL}/api/CalculosCorrientesDatosMantenimiento`;

interface GetDataByMaquinaParams {
  maquina: string;
  page?: number;
  limit?: number;
}

interface GetDataByDateRangeParams {
  maquina: string;
  fecha_inicio: string;
  fecha_fin: string;
  page?: number;
  limit?: number;
}

interface GetComponentsByMachineParams {
  maquina: string;
  page?: number;
  limit?: number;
}

interface GetAllParams {
  page?: number;
  limit?: number;
}

const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImlzYWlhcy5jaGlxdXVpdG8iLCJyb2xlcyI6WyJhZG1pbiIsImRldmVsb3BlciJdLCJpYXQiOjE3MjI1OTM1NjgsImV4cCI6MTczMzEzMzU2OH0.q-gSO3M3rV2CRaL0JNb2f62uI1Jg_Mh72c_v1-5Fp_E';

export const calculosCorrientesDatosMantenimientoService = {
  async getTotalByMaquina(maquina: string): Promise<{ total: number }> {
    const response = await fetch(API_URL + '/totalByMaquina', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({ maquina }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
      throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async getDataByMaquina(params: GetDataByMaquinaParams): Promise<BodyListResponse<any>> {
    const requestBody = {
      maquina: params.maquina,
      page: params.page || 1,
      limit: params.limit || 100,
    };

    const response = await fetch(API_URL + '/dataByMaquina', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
      throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async getDataByMachineAndDates(params: GetDataByDateRangeParams): Promise<BodyListResponse<any>> {
    const requestBody = {
      maquina: params.maquina,
      fecha_inicio: params.fecha_inicio,
      fecha_fin: params.fecha_fin,
      page: params.page || 1,
      limit: params.limit || 100,
    };

    const response = await fetch(API_URL + '/dataByMachineAndDates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
      throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async getMachines(params?: GetAllParams): Promise<BodyListResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(API_URL + '/machines?' + queryParams.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
      throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async getComponentsByMachine(params: GetComponentsByMachineParams): Promise<BodyListResponse<any>> {
    const requestBody = {
      maquina: params.maquina,
      page: params.page || 1,
      limit: params.limit || 100,
    };

    const response = await fetch(API_URL + '/componentsByMachine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
      throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },
};
