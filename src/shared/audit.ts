/** Tipos espejo del backend de auditoría (SPEC §4.5, §13, §16). */

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
