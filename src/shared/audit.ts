/** Tipos espejo del backend de auditoría y actividad (SPEC §4.5, §13, §16; Hito 25). */

export interface EventoAuditoria {
  id: number;
  usuario_id: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  antes: string | null;
  despues: string | null;
  timestamp: string;
  origen: string | null;
  comando: string | null;
  duracion_ms: number | null;
  exito: boolean;
  nivel: string;
  /** `COMANDO` (backend) o `VISTA` (navegación del frontend). */
  tipo_evento: string;
  ruta: string | null;
  modulo: string | null;
  proceso: string | null;
  metadatos: string | null;
  tenant: string | null;
  duracion_vista_ms: number | null;
  hora_local: number | null;
  dia_semana: number | null;
}

export interface ComandoMetrica {
  nombre: string;
  total: number;
  exitos: number;
  errores: number;
  duracion_promedio_ms: number | null;
}

export interface DiaMetrica {
  dia: string;
  total: number;
}

export interface MetricasHistorial {
  total: number;
  exitos: number;
  errores: number;
  tasa_exito: number;
  duracion_promedio_ms: number | null;
  por_comando: ComandoMetrica[];
  por_dia: DiaMetrica[];
}

// ============ Análisis profundo de actividad (Hito 25) ============

export interface ResumenActividad {
  total_eventos: number;
  total_vistas: number;
  total_operaciones: number;
  escrituras: number;
  lecturas: number;
  exitos: number;
  errores: number;
  tasa_exito: number;
  usuarios_activos: number;
  duracion_vista_promedio_ms: number | null;
}

export interface ModuloActividad {
  modulo: string;
  vistas: number;
  operaciones: number;
  duracion_vista_ms: number;
}

export interface DiaActividad {
  dia: string;
  vistas: number;
  operaciones: number;
}

export interface HoraActividad {
  hora: number;
  vistas: number;
  operaciones: number;
}

export interface DiaSemanaActividad {
  dia_semana: number;
  vistas: number;
  operaciones: number;
}

export interface UsuarioActividad {
  usuario_id: string | null;
  vistas: number;
  operaciones: number;
  duracion_vista_ms: number;
}

export interface ProcesoActividad {
  proceso: string;
  total: number;
}

export interface RutaActividad {
  ruta: string;
  modulo: string;
  vistas: number;
  duracion_vista_ms: number;
}

export interface InsightActividad {
  titulo: string;
  detalle: string;
  icono: string;
}

export interface MetricasActividad {
  desde: string | null;
  hasta: string | null;
  resumen: ResumenActividad;
  por_modulo: ModuloActividad[];
  por_dia: DiaActividad[];
  por_hora: HoraActividad[];
  por_dia_semana: DiaSemanaActividad[];
  por_usuario: UsuarioActividad[];
  por_proceso: ProcesoActividad[];
  top_rutas: RutaActividad[];
  insights: InsightActividad[];
}

/** Datos que envía el frontend al registrar una vista (tracking total). */
export interface RegistrarVista {
  ruta: string;
  modulo: string;
  proceso?: string;
  metadatos?: Record<string, unknown>;
  duracion_vista_ms?: number;
  hora_local?: number;
  dia_semana?: number;
  cliente_info?: Record<string, unknown>;
}
