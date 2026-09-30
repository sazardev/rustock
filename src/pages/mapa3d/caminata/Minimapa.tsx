import { useEffect, useMemo, useRef } from "react";
import { resolverColorCss, type NodoMapa } from "../../mapa-almacen-datos";
import { useT } from "../../../shared/i18n";
import type { PosicionXY } from "../tipos";
import { dibujarMinimapa, type ColoresMinimapa } from "./dibujarMinimapa";
import { geometriaMinimapa } from "./geometriaMinimapa";
import type { TelemetriaCaminata } from "./tiposCaminata";

/** Lado en px: debe coincidir con `.caminata__minimapa` en mapa-3d.css. */
const LADO_CSS = 200;

function coloresDeTokens(): ColoresMinimapa {
  return {
    fondo: resolverColorCss("--color-surface"),
    zona: resolverColorCss("--color-gray-300"),
    zonaRelleno: resolverColorCss("--color-surface-sunken"),
    pasillo: resolverColorCss("--color-warning-bg"),
    pasilloBorde: resolverColorCss("--color-warning-500"),
    rack: resolverColorCss("--color-blue-400"),
    jugador: resolverColorCss("--color-ink-900"),
    contorno: resolverColorCss("--color-surface"),
  };
}

/** Minimapa 2D: racks, pasillos, tu posición y rumbo. Redibuja por fotograma
 * leyendo la telemetría (sin pasar por el estado de React). */
export function Minimapa(p: {
  nodos: NodoMapa[];
  posicionBase: Map<string, PosicionXY>;
  telemetria: TelemetriaCaminata;
}) {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const geometria = useMemo(
    () => geometriaMinimapa(p.nodos, p.posicionBase),
    [p.nodos, p.posicionBase],
  );
  const { telemetria } = p;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = LADO_CSS * dpr;
    canvas.height = LADO_CSS * dpr;
    ctx.scale(dpr, dpr);
    const colores = coloresDeTokens();
    let cuadro = 0;
    const pintar = () => {
      dibujarMinimapa(
        ctx,
        LADO_CSS,
        geometria,
        { x: telemetria.xCm, z: telemetria.zCm, yaw: telemetria.yaw },
        colores,
      );
      cuadro = requestAnimationFrame(pintar);
    };
    pintar();
    return () => cancelAnimationFrame(cuadro);
  }, [geometria, telemetria]);

  return (
    <canvas
      ref={ref}
      className="caminata__minimapa"
      role="img"
      aria-label={t.mapa3d.minimapaAria}
    />
  );
}
