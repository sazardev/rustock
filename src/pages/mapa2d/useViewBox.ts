/** Encuadre del lienzo: viewBox, zoom anclado al cursor, pan y encuadre total. */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { RectMapa } from "../mapa/motor";
import type { ViewBox } from "./tipos";
import { animarVista } from "./vista/animarVista";
import { anclarPunto, conAspecto, encuadrarRects, zoomAncladoEn } from "./vista/encuadre";

const VIEWBOX_INICIAL: ViewBox = { x: 0, y: 0, w: 1100, h: 620 };
/** Sensibilidad de la rueda: zoom continuo, sin saltos del 10 %. */
const K_RUEDA = 0.0015;
const K_RUEDA_PINZA = 0.01;
const PX_POR_LINEA = 16;

interface Punto {
  x: number;
  y: number;
}

export function useViewBox(
  svgRef: RefObject<SVGSVGElement | null>,
  resaltarId: string | null | undefined,
  posicionBase: Map<string, Punto>,
  contenido: RectMapa[],
) {
  const [viewBox, setViewBoxCrudo] = useState<ViewBox>(VIEWBOX_INICIAL);
  const [tam, setTam] = useState({ ancho: 0, alto: 0 });
  const viewBoxRef = useRef(viewBox);
  const cancelarAnimacion = useRef<() => void>(() => undefined);

  /** Cualquier cambio manual corta una animación de encuadre en curso. */
  const setViewBox = useCallback((fn: (v: ViewBox) => ViewBox) => {
    cancelarAnimacion.current();
    setViewBoxCrudo((v) => {
      const nuevo = fn(v);
      viewBoxRef.current = nuevo;
      return nuevo;
    });
  }, []);

  // El viewBox sigue la proporción real del elemento: sin franjas vacías y con
  // conversión cliente -> plano exacta.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const medir = () => {
      const r = svg.getBoundingClientRect();
      setTam({ ancho: r.width, alto: r.height });
      setViewBox((v) => conAspecto(v, r.width, r.height));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(svg);
    return () => obs.disconnect();
  }, [svgRef, setViewBox]);

  // Primer encuadre: todo el contenido a la vista (salvo llegada por deep link).
  const encuadreInicial = useRef(false);
  useEffect(() => {
    if (encuadreInicial.current || resaltarId || tam.ancho === 0) {
      return;
    }
    const destino = encuadrarRects(contenido, tam.ancho, tam.alto);
    if (destino) {
      encuadreInicial.current = true;
      setViewBox(() => destino);
    }
  }, [contenido, resaltarId, tam, setViewBox]);

  // Centra el lienzo sobre `?resaltar=<id>` una sola vez (MapaContextoCard).
  const centradoHecho = useRef(false);
  useEffect(() => {
    if (!resaltarId || centradoHecho.current) {
      return;
    }
    const pos = posicionBase.get(resaltarId);
    if (!pos) {
      return;
    }
    centradoHecho.current = true;
    setViewBox((v) => ({ ...v, x: pos.x - v.w / 2, y: pos.y - v.h / 2 }));
  }, [resaltarId, posicionBase, setViewBox]);

  /** Unidades de SVG por píxel de pantalla (lectura fresca para gestos). */
  const escala = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    return !rect || rect.width === 0 ? 1 : viewBox.w / rect.width;
  };

  /** Punto del plano bajo una coordenada de cliente. */
  const aSvg = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const s = escala();
    return {
      x: viewBox.x + (clientX - (rect?.left ?? 0)) * s,
      y: viewBox.y + (clientY - (rect?.top ?? 0)) * s,
    };
  };

  /** Zoom anclado a una coordenada de cliente (rueda, botones, teclado). */
  const zoomEnCliente = useCallback(
    (factor: number, cx: number, cy: number) => {
      setViewBox((v) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) {
          return v;
        }
        const ancla = {
          x: v.x + ((cx - rect.left) * v.w) / rect.width,
          y: v.y + ((cy - rect.top) * v.h) / rect.height,
        };
        return zoomAncladoEn(v, factor, ancla, rect.width);
      });
    },
    [svgRef, setViewBox],
  );

  const zoomCentrado = useCallback(
    (factor: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        zoomEnCliente(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    },
    [svgRef, zoomEnCliente],
  );

  /** Un paso de pinza: zoom por `factor` y arrastre del punto medio. */
  const pinzaPaso = useCallback(
    (factor: number, previo: Punto, actual: Punto) => {
      setViewBox((v) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) {
          return v;
        }
        const ancla = {
          x: v.x + ((previo.x - rect.left) * v.w) / rect.width,
          y: v.y + ((previo.y - rect.top) * v.h) / rect.height,
        };
        const z = zoomAncladoEn(v, factor, ancla, rect.width);
        return anclarPunto(
          z,
          ancla,
          (actual.x - rect.left) / rect.width,
          (actual.y - rect.top) / rect.height,
        );
      });
    },
    [svgRef, setViewBox],
  );

  /** Desplaza la vista una distancia en píxeles de pantalla. */
  const panPx = useCallback(
    (dx: number, dy: number) => {
      setViewBox((v) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) {
          return v;
        }
        return { ...v, x: v.x + (dx * v.w) / rect.width, y: v.y + (dy * v.h) / rect.height };
      });
    },
    [svgRef, setViewBox],
  );

  const encuadrar = useCallback(() => {
    const destino = encuadrarRects(contenido, tam.ancho, tam.alto);
    if (!destino) {
      return;
    }
    cancelarAnimacion.current();
    cancelarAnimacion.current = animarVista(viewBoxRef.current, destino, (v) => {
      viewBoxRef.current = v;
      setViewBoxCrudo(v);
    });
  }, [contenido, tam]);

  // Rueda: listener nativo no pasivo (React registra `wheel` como pasivo y no
  // dejaría cancelar el desplazamiento de la página).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * PX_POR_LINEA : e.deltaY;
      const k = e.ctrlKey ? K_RUEDA_PINZA : K_RUEDA;
      zoomEnCliente(Math.exp(px * k), e.clientX, e.clientY);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svgRef, zoomEnCliente]);

  return {
    viewBox,
    setViewBox,
    escala,
    aSvg,
    /** Unidades por píxel, para dibujar (estable mientras no cambie zoom). */
    escalaRender: tam.ancho > 0 ? viewBox.w / tam.ancho : 1,
    zoomCentrado,
    pinzaPaso,
    panPx,
    encuadrar,
  };
}
