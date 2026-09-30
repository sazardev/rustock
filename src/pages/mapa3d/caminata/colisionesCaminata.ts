/** Colisión del caminante (pura, sin React ni three): un círculo contra los
 * rectángulos de racks y de ubicaciones de piso altas, con deslizamiento. */
import type { NodoMapa } from "../../mapa-almacen-datos";
import { alturaNodoCm } from "../../mapa/alturas";
import { crearIndice, type IndiceEspacial } from "../../mapa/motor/indiceEspacial";
import type { CuerpoMapa, RectMapa } from "../../mapa/motor/tipos";
import type { PosicionXY } from "../tipos";
import { tamRealDe } from "../utils";
import { ALTURA_OBSTACULO_CM, MARGEN_LIMITE_CM, SUBPASO_MAX_CM } from "./constantesCaminata";

export interface Punto {
  x: number;
  z: number;
}

export interface EscenarioColision {
  indice: IndiceEspacial;
  /** Área por la que se puede caminar (cm). */
  limites: RectMapa;
}

/** Un nodo bloquea el paso si es un rack o una ubicación de piso alta. */
export function bloqueaPaso(n: NodoMapa): boolean {
  return n.tipo === "rack" || (n.tipo === "ubicacion" && alturaNodoCm(n) > ALTURA_OBSTACULO_CM);
}

export function construirEscenario(
  nodos: readonly NodoMapa[],
  posicionBase: ReadonlyMap<string, PosicionXY>,
): EscenarioColision {
  const cuerpos: CuerpoMapa[] = [];
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const n of nodos) {
    const p = posicionBase.get(n.id);
    if (!p) {
      continue;
    }
    const tam = tamRealDe(n);
    x0 = Math.min(x0, p.x);
    z0 = Math.min(z0, p.y);
    x1 = Math.max(x1, p.x + tam.ancho);
    z1 = Math.max(z1, p.y + tam.profundo);
    if (bloqueaPaso(n)) {
      cuerpos.push({
        id: n.id,
        codigo: n.codigo,
        tipo: n.tipo,
        x: p.x,
        y: p.y,
        ancho: tam.ancho,
        profundo: tam.profundo,
        zonaId: n.zona_id,
      });
    }
  }
  if (!Number.isFinite(x0)) {
    x0 = 0;
    z0 = 0;
    x1 = 2000;
    z1 = 2000;
  }
  const limites = {
    x: x0 - MARGEN_LIMITE_CM,
    y: z0 - MARGEN_LIMITE_CM,
    ancho: x1 - x0 + 2 * MARGEN_LIMITE_CM,
    profundo: z1 - z0 + 2 * MARGEN_LIMITE_CM,
  };
  return { indice: crearIndice(cuerpos), limites };
}

/** Expulsa el círculo de un rectángulo por el camino más corto. */
function expulsar(p: Punto, radio: number, r: RectMapa): boolean {
  const cx = Math.min(Math.max(p.x, r.x), r.x + r.ancho);
  const cz = Math.min(Math.max(p.z, r.y), r.y + r.profundo);
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d = Math.hypot(dx, dz);
  if (d >= radio) {
    return false;
  }
  if (d > 1e-9) {
    const k = (radio - d + 1e-6) / d;
    p.x += dx * k;
    p.z += dz * k;
    return true;
  }
  // El centro está dentro del rectángulo: salir por el lado más cercano.
  const izq = p.x - r.x;
  const der = r.x + r.ancho - p.x;
  const arr = p.z - r.y;
  const aba = r.y + r.profundo - p.z;
  const m = Math.min(izq, der, arr, aba);
  if (m === izq) {
    p.x = r.x - radio - 1e-6;
  } else if (m === der) {
    p.x = r.x + r.ancho + radio + 1e-6;
  } else if (m === arr) {
    p.z = r.y - radio - 1e-6;
  } else {
    p.z = r.y + r.profundo + radio + 1e-6;
  }
  return true;
}

function dentroDeLimites(p: Punto, radio: number, l: RectMapa): void {
  p.x = Math.min(Math.max(p.x, l.x + radio), l.x + l.ancho - radio);
  p.z = Math.min(Math.max(p.z, l.y + radio), l.y + l.profundo - radio);
}

/** Corrige la posición hasta que el círculo no toque ningún obstáculo ni salga
 * del área. Varias pasadas: empujar fuera de uno puede meter en otro. */
export function resolverPosicion(p: Punto, radio: number, esc: EscenarioColision): boolean {
  let tocado = false;
  for (let pasada = 0; pasada < 4; pasada++) {
    let cambio = false;
    const consulta = { x: p.x - radio, y: p.z - radio, ancho: 2 * radio, profundo: 2 * radio };
    for (const c of esc.indice.consultar(consulta, 1)) {
      cambio = expulsar(p, radio, c) || cambio;
    }
    dentroDeLimites(p, radio, esc.limites);
    tocado ||= cambio;
    if (!cambio) {
      break;
    }
  }
  return tocado;
}

/** El círculo no toca ningún obstáculo y está dentro del área. */
function esValida(p: Punto, radio: number, esc: EscenarioColision): boolean {
  const l = esc.limites;
  if (p.x < l.x + radio - 1e-6 || p.x > l.x + l.ancho - radio + 1e-6) {
    return false;
  }
  if (p.z < l.y + radio - 1e-6 || p.z > l.y + l.profundo - radio + 1e-6) {
    return false;
  }
  const consulta = { x: p.x - radio, y: p.z - radio, ancho: 2 * radio, profundo: 2 * radio };
  return esc.indice.consultar(consulta, 1).every((c) => {
    const cx = Math.min(Math.max(p.x, c.x), c.x + c.ancho);
    const cz = Math.min(Math.max(p.z, c.y), c.y + c.profundo);
    return Math.hypot(p.x - cx, p.z - cz) >= radio - 1e-6;
  });
}

/** Un subpaso: empuja fuera de los obstáculos (deslizamiento). Si aun así
 * queda en un hueco más estrecho que el cuerpo, prueba cada eje por separado
 * y, como último recurso, no se mueve: jamás se entra en un obstáculo. */
function subpaso(p: Punto, dx: number, dz: number, radio: number, esc: EscenarioColision): boolean {
  const previo = { x: p.x, z: p.z };
  p.x += dx;
  p.z += dz;
  const tocado = resolverPosicion(p, radio, esc);
  if (esValida(p, radio, esc)) {
    return tocado;
  }
  for (const [ex, ez] of [
    [dx, 0],
    [0, dz],
  ]) {
    p.x = previo.x + ex;
    p.z = previo.z + ez;
    resolverPosicion(p, radio, esc);
    if (esValida(p, radio, esc)) {
      return true;
    }
  }
  p.x = previo.x;
  p.z = previo.z;
  return true;
}

/** Mueve `p` (se modifica) el desplazamiento dado en subpasos cortos, de modo
 * que contra una pared el movimiento se convierte en deslizamiento. Devuelve
 * true si algo bloqueó el avance. */
export function moverConColision(
  p: Punto,
  dx: number,
  dz: number,
  radio: number,
  esc: EscenarioColision,
): boolean {
  const largo = Math.hypot(dx, dz);
  if (largo === 0) {
    return false;
  }
  const pasos = Math.max(1, Math.ceil(largo / SUBPASO_MAX_CM));
  let bloqueado = false;
  for (let i = 0; i < pasos; i++) {
    bloqueado = subpaso(p, dx / pasos, dz / pasos, radio, esc) || bloqueado;
  }
  return bloqueado;
}
