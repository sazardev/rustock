import { resolverColorCss } from "../../mapa-almacen-datos";
import type { RectMapa } from "../../mapa/motor/tipos";
import { M_POR_UNIDAD } from "../../mapa/unidades";
import { ALTO_MURO_M, GROSOR_MURO_M } from "./constantesCaminata";

/** Muro bajo alrededor del area caminable: el pasillo no termina en un vacio
 * liso y da referencia de escala. Cuatro cajas, sin sombras ni colision. */
export function ParedesPerimetro({ limites }: { limites: RectMapa }) {
  const x0 = limites.x * M_POR_UNIDAD;
  const z0 = limites.y * M_POR_UNIDAD;
  const ancho = limites.ancho * M_POR_UNIDAD;
  const fondo = limites.profundo * M_POR_UNIDAD;
  const y = ALTO_MURO_M / 2;
  const g = GROSOR_MURO_M;
  const tramos: { pos: [number, number, number]; tam: [number, number, number] }[] = [
    { pos: [x0 + ancho / 2, y, z0 - g / 2], tam: [ancho + 2 * g, ALTO_MURO_M, g] },
    { pos: [x0 + ancho / 2, y, z0 + fondo + g / 2], tam: [ancho + 2 * g, ALTO_MURO_M, g] },
    { pos: [x0 - g / 2, y, z0 + fondo / 2], tam: [g, ALTO_MURO_M, fondo] },
    { pos: [x0 + ancho + g / 2, y, z0 + fondo / 2], tam: [g, ALTO_MURO_M, fondo] },
  ];
  const color = resolverColorCss("--color-gray-300");
  return (
    <>
      {tramos.map((t, i) => (
        <mesh key={i} position={t.pos}>
          <boxGeometry args={t.tam} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}
