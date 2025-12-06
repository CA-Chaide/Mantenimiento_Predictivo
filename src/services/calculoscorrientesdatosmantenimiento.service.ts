
import { environment } from "@/environments/environments.prod";
import type { BodyListResponse } from "@/types/body-list-response";

const API_URL = `${environment.apiURL}/api/CalculosCorrientesDatosMantenimiento`;
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImludGVsaWdlbnRpYSIsImlhdCI6MTcyMTM0NjQzMiwiZXhwIjoxNzMyODgyNDMyfQ.5Z5aQj1fG4f4i-rL8p3g4n-X_VwE-b-T9tC2a1iH3xY";

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

interface GetDataByDateRangeParamsAndComponent {
  maquina: string;
  componente: string;
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

export const calculosCorrientesDatosMantenimientoService = {
  async getTotalByMaquina(maquina: string): Promise<{ total: number }> {
    const response = await fetch(API_URL + '/totalByMaquina', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ maquina }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
      throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async getTotalByMaquinaAndComponente(maquina: string, componente: string, fecha_inicio: string, fecha_fin: string): Promise<{ total: number }> {
    const response = await fetch(API_URL + '/totalByMaquinaAndComponente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ maquina, componente, fecha_inicio, fecha_fin }),
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
        'Authorization': `Bearer ${TOKEN}`,
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
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
      throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },


  async getDataByMachineComponentAndDates(params: GetDataByDateRangeParamsAndComponent): Promise<BodyListResponse<any>> {
    const requestBody = {
      maquina: params.maquina,
      componente: params.componente,
      fecha_inicio: params.fecha_inicio,
      fecha_fin: params.fecha_fin,
      page: params.page || 1,
      limit: params.limit || 1000,
    };

    const response = await fetch(API_URL + '/machineComponentDates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
      throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async getDataByMachineComponentAndDatesAggregated(params: Omit<GetDataByDateRangeParamsAndComponent, 'page' | 'limit'>): Promise<BodyListResponse<any>> {
    const requestBody = {
      maquina: params.maquina,
      componente: params.componente,
      fecha_inicio: params.fecha_inicio,
      fecha_fin: params.fecha_fin,
    };
  
    const response = await fetch(API_URL + '/machineComponentDatesAggregated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
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
        'Authorization': `Bearer ${TOKEN}`,
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
        'Authorization': `Bearer ${TOKEN}`,
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
