import type { SubTipoMovimiento } from "../../shared/types";

export interface FormValues {
  sub_tipo: SubTipoMovimiento | "";
  proveedor_id: string;
  cliente_id: string;
  documento_referencia: string;
  fecha_movimiento: string;
  motivo: string;
  notas: string;
  lineas: Array<{
    producto_id: string;
    lote_id: string;
    cantidad: string;
    origen_ubicacion_id: string;
    destino_ubicacion_id: string;
  }>;
}

export const LINEA_VACIA: FormValues["lineas"][number] = {
  producto_id: "",
  lote_id: "",
  cantidad: "",
  origen_ubicacion_id: "",
  destino_ubicacion_id: "",
};

export interface TrasladoValues {
  producto_id: string;
  lote_id: string;
  cantidad: string;
  origen_ubicacion_id: string;
  destino_ubicacion_id: string;
  documento_referencia: string;
  notas: string;
}
