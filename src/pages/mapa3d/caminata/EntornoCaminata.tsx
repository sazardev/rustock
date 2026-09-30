import { useMemo } from "react";
import { Color } from "three";
import { resolverColorCss, type NodoMapa } from "../../mapa-almacen-datos";
import { useTema } from "../../../shared/tema";
import { M_POR_UNIDAD } from "../../mapa/unidades";
import type { PosicionXY } from "../tipos";
import { construirEscenario } from "./colisionesCaminata";
import { CupulaCielo } from "./CupulaCielo";
import { NIEBLA_CERCA_M, NIEBLA_LEJOS_M, RADIO_CIELO_M } from "./constantesCaminata";
import { ParedesPerimetro } from "./ParedesPerimetro";

/** Ambiente de la primera persona: niebla de distancia, cielo con degradado
 * de color por vertice, piso que se extiende hasta el horizonte y muro bajo.
 * Todos los colores salen de tokens, asi que siguen al tema claro/oscuro. */
export function EntornoCaminata({
  nodos,
  posicionBase,
}: {
  nodos: NodoMapa[];
  posicionBase: Map<string, PosicionXY>;
}) {
  // Suscripcion al tema: al cambiarlo se vuelven a resolver los colores.
  const tema = useTema((s) => s.tema);
  const { horizonte, cenit, piso } = useMemo(() => {
    void tema;
    // Horizonte entre el piso y la superficie: la niebla funde ambos sin banda clara.
    const piso = resolverColorCss("--color-gray-200");
    const h = new Color(resolverColorCss("--color-surface-muted")).lerp(new Color(piso), 0.55);
    const c = h.clone().lerp(new Color(resolverColorCss("--color-gray-400")), 0.4);
    return { horizonte: h, cenit: c, piso };
  }, [tema]);
  const { limites } = useMemo(() => construirEscenario(nodos, posicionBase), [nodos, posicionBase]);
  const cx = (limites.x + limites.ancho / 2) * M_POR_UNIDAD;
  const cz = (limites.y + limites.profundo / 2) * M_POR_UNIDAD;

  return (
    <>
      <fog attach="fog" args={[horizonte, NIEBLA_CERCA_M, NIEBLA_LEJOS_M]} />
      <CupulaCielo horizonte={horizonte} cenit={cenit} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.02, cz]}>
        <circleGeometry args={[RADIO_CIELO_M, 48]} />
        <meshStandardMaterial color={piso} />
      </mesh>
      <ParedesPerimetro limites={limites} />
    </>
  );
}
