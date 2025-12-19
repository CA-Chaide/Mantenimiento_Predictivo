// Este archivo es autogenerado. No lo modifiques manually.

export interface AreaProcessControl {
  codigo_rcp: number;
  resp_ctrl_prod: string;
  estado: string;
  maquina: string;
  direccion_ip: string;
}

export interface Estacion {
  codigo_estacion: number;
  nombre_estacion: string;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
  codigo_linea: number;
  direccion_ip: string;
  notifica: boolean;
  ip_impresion: string;
}

export interface Linea {
  codigo_linea: number;
  nombre_linea: string;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
}

export interface LineaDepartamento {
  codigo_linea_departamento: number;
  codigo_departamento: number;
  codigo_linea: number;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
  rel?: string;
  // Relaciones incluidas desde el backend
  departamento?: Departamento;
  linea?: Linea;
}

export interface Departamento {
  codigo_departamento: number;
  nombre_departamento: string;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
  see: boolean;
}

export interface Sesion {
  codigo_sesion: number;
  codigo_rcp: number;
  codigo_estacion: number;
  codigo_operador: string;
  fecha_evento: Date | string;
  tipo_evento: string;
  estado: string;
}
export interface LogReimpresiones {
  codigo_log: string;
  orden: string;
  paquete: number;
  parametros: string;
  estado: string;
  usuario_reimpresion: string;
}

export interface Configuracion {
  codigo_equipo: number;
  mac_address: string;
  estado: string;
}

export interface LogOrdenes {
  codigo_log: number;
  orden_log: string;
  codigo_empleado: string;
  codigo_equipo: string;
  fecha_log: Date | string;
  cantidad_entregada: number;
  cantidad_rechazada: number;
  cantidad_reproceso: number;
  orden_reproceso: string;
}

export interface OrdenEmpleado {
  ID: number;
  NUM_ORDEN: string;
  CODIGO_EMP: string;
  UNIDADES_PROD: number;
  FECHA: string; // Changed to string to match formatted date
  HORA: string;
  TURNO: string;
  CENTRO: string;
  CODIGO: string;
  MAQUINA: string;
}

export interface OrdenEmpleadoDecimal {
  ID: number;
  NUM_ORDEN: string;
  CODIGO_EMP: string;
  UNIDADES_PROD: number;
  FECHA: string; // Changed to string to match formatted date
  HORA: string;
  TURNO: string;
  CENTRO: string;
  CODIGO: string;
  MAQUINA: string;
}

// Interfaces for Authentication
export interface Ficha {
  CODIGO: string;
  NOMBRE: string;
  DEPARTAMENTO: string;
  codigo_rcp: number;
  resp_ctrl_prod: string;
  estado: string;
  maquina: string;
  mac_address: string;
  Centro: string;
  direccion_ip: string; // Added from your spec
}

export interface User {
  name: string;
  code: string;
  imageUrl?: string;
  machine?: string;
  department?: string;
  resp_ctrl_prod?: string;
  Centro?: string;
  ip_address?: string;
}

export interface AuthUser {
  id: string;
  ficha: Ficha;
}

export interface AuthResponse {
  message: string;
  token: string;
  expiresIn: string;
  user: AuthUser;
}

// Interface for Production Orders from servicio.service
export interface OrdenProduccion {
  Orden: string;
  Fecha: string;
  Material: string;
  Nombre: string;
  CantProgramada: number;
  CantNotificada: number;
  CantRechazo: number;
  Estacion: string;
  RespCtrlProd: string;
  Maquina: string;
}

export interface OrdenReimpresion {
  POSICION: number;
  FECHA: Date;
  HORA: string;
  MAQUINA: string;
  NUM_ORDEN: string;
  CANTIDAD: number;
  UNIDAD: string;
  COD_MATERIAL: string;
  MATERIAL: string;
  OPERADOR: string;
  COLABORADORES: string;
  TURNO: string;
  DEPARTAMENTO: string;
  CODIGO_BARRAS: string;
}

// Interface for Admin Users from usuario.service
export interface Usuario {
  codigo_usuario: number;
  nombres_usuario: string;
  correo_usuario: string;
  estado: "A" | "I" | string;
}

export interface CodigoBarras {
  codigoBarras: string;
  numeroPaquete: number;
}

//////////////////////////////////////////////////////////////Elementos Módulo de seguridad
export interface Menu {
  codigo_menu: number;
  codigo_padre: number;
  nombre: string;
  icono: string;
  path: string;
  estado: string;
  codigo_aplicacion: string;
  children?: Menu[];
}

export interface Empleado {
  GRUPO_DEPARTAMENTO: string;
  DEPARTAMENTO: string;
  CODIGO: string;
  NOMBRE: string;
  LOCALIDAD: string;
}

export interface EtiquetaPlastificado {
  CODIGO: string;
  RECETA: string;
  NOMBRE: string;
  CANTIDAD: string;
  CIUDAD: string;
  COLOR: string;
  VCSIMPRESO: string;
  NUM_CABECERA: string;
  Etiqueta_Material: string;
  Ancho: string;
  Largo: string;
  Alto: string;
  Clase: string;
  Tipo: string;
  Resortes: string;
  Aislante_Pading: string;
  Fibra_Pading: string;
  Espuma: string;
  Aislante: string;
  Lamina1: string;
  Lamina2: string;
  Lamina3: string;
  Lamina4: string;
  Lamina5: string;
  Lamina_Banda: string;
  Lamina_Tapa: string;
  Lamina_Tapa2: string;
  Tela_Tapa1: string;
  Tela_Tapa2: string;
  Tela_Tapa3: string;
  Tela_Banda1: string;
  Tela_Banda2: string;
  Tela_Banda3: string;
  Tapa_Tela1: string;
  Tapa_Tela2: string;
  Tapa_Tela3: string;
  t_spedido_detalle_orden: string;
  t_sposicion_detalle_orden: string;
  t_scliente_detalle_orden: string;
  Etiqueta_CodigoAntiguo: string;
  Garantia: string;
  PesoLb: string;
  PesoKg: string;
  Estrategia: string;
  IdSector: string;
  Sector: string;
  EtiquetaG: string;
}

export interface EtiquetaPistoleadaItem {
  timestamp: string;
  codigoQR: string;
  etiqueta_material: string;
  clase: string;
  dimensiones: {
    largo: string;
    ancho: string;
    alto: string;
  };
  success: boolean;
  message: string;
  etiquetaCompleta: EtiquetaPlastificado;
  impresionExitosa: boolean;
  logGuardado: boolean;
}

//////////////////////Elementos del Componente de Monitoreo//////////////////////

export interface TipoEvento {
  codigo_tipo_evento: string;
  nombre_evento: string;
  estado: string;
}

export interface Referencia {
  codigo_referencia: string;
  codigo_componente: string;
  fecha_inicio_referencia: Date | string;
  fecha_fin_referencia: Date | string;
  estado: string;
}

export interface Limites {
  codigo_limite: string;
  codigo_componente: string;
  corriente_limite_sup: number;
  corriente_limite_inf: number;
  desbalance_limite_sup: number;
  desbalance_limite_inf: number;
  sigma_limite: number;
  factor_carga_limite_sup: number;
  factor_carga_limite_inf: number;
  estado: string;
}

export interface Historial {
  codigo_historial: string;
  codigo_componente: string;
  codigo_tipo_evento: string;
  fecha_evento: Date | string;
  descripcion_evento: string;
  params: Text;
  estado: string;
}

export interface Equipo {
  codigo_equipo: string; 
  codigo_area: string;
  nombre_equipo: string;
  estado: string;
}

export interface Componente {
  codigo_componente: string;
  codigo_equipo: string;
  nombre_componente: string;
  estado: string;
}

export interface Area {
  codigo_area: string;
  nombre_area: string;
  estado: string;
}

