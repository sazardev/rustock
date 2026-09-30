/** Punto de entrada del motor: evalua un candidato contra el indice. */
import { primerCuerpoEnChoque } from "./colisiones";
import { evaluarContencion } from "./contencion";
import { evaluarHolgura } from "./holgura";
import type { IndiceEspacial } from "./indiceEspacial";
import type { Candidato, OpcionesColocacion, Resultado } from "./tipos";

/** Tri-estado: bloqueado (choque o fuera de zona) > advertencia (pasillo
 * estrecho) > libre. */
export function evaluarColocacion(
  indice: IndiceEspacial,
  c: Candidato,
  o: OpcionesColocacion = {},
): Resultado {
  const choque = primerCuerpoEnChoque(indice, c, o.ignorar);
  if (choque) {
    return {
      estado: "bloqueado",
      motivo: `choca con ${choque.codigo || choque.id}`,
      conflictoId: choque.id,
    };
  }
  const contencion = evaluarContencion(indice, c);
  if (contencion.estado !== "libre") {
    return contencion;
  }
  return evaluarHolgura(indice, c, o.ignorar, o.holguraCm, o.unidad);
}
