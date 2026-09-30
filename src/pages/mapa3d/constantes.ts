import type { TipoNodo } from "../mapa-almacen-datos";

export const UMBRAL_CLIC_PX = 4;
/** Cámara inicial (metros de escena): el mismo encuadre isométrico de siempre
 * ahora que la escena está en metros reales (1 u = 1 cm = 0.01 m). */
export const CAMARA_INICIAL: [number, number, number] = [9, 9, 9];
/** Plano de recorte de la cámara (metros): cerca para ver un rack de cerca,
 * lejos para cubrir un almacén de cientos de metros. */
export const CAMARA_CERCA = 0.1;
export const CAMARA_LEJOS = 500;

/** Clave i18n (namespace `mapa3d`) del botón de visibilidad de cada tipo. */
export const ETIQUETA_TIPO = {
  zona: "zonas",
  pasillo: "pasillos",
  rack: "racks",
  ubicacion: "ubicaciones",
} as const satisfies Record<TipoNodo, string>;

export const TODOS_TIPOS: TipoNodo[] = ["zona", "pasillo", "rack", "ubicacion"];

export const TIPOS_VISIBLES_INICIAL: Record<TipoNodo, boolean> = {
  zona: true,
  pasillo: true,
  rack: true,
  ubicacion: true,
};
