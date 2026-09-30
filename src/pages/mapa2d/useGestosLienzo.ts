/** Gestos con puntero sobre el lienzo: pan, arrastre, redimensionado y trazo. */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { LADO_MINIMO } from "../mapa/reglas";
import {
  ajustarAVecinos,
  candidatoDe,
  evaluarColocacion,
  snap,
  type Guia,
  type RectMapa,
} from "../mapa/motor";
import type { NodoMapa } from "./nodo-tipos";
import { rectEntrePuntos, redimensionar, sinClave } from "./geometria-lienzo";
import {
  UMBRAL_CLIC_PX,
  type Esquina,
  type HerramientaDibujo,
  type ParamsGestos,
  type SesionArrastre,
} from "./tipos";

export function useGestosLienzo(p: ParamsGestos) {
  const { nodoPorId, posicionBase, construir, herramienta, rejilla, indice, opciones } = p;
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({});
  const [tamOverride, setTamOverride] = useState<Record<string, RectMapa>>({});
  const [dibujo, setDibujo] = useState<RectMapa | null>(null);
  const [guias, setGuias] = useState<Guia[]>([]);
  const arrastre = useRef<SesionArrastre | null>(null);

  /** Rectángulo efectivo del nodo: posición (base o override) + tamaño
   * (entidad o override de resize en curso). */
  const rectDe = (n: NodoMapa): RectMapa => {
    const pos = posOverride[n.id] ?? posicionBase.get(n.id) ?? { x: 0, y: 0 };
    const t = tamOverride[n.id];
    return {
      x: pos.x,
      y: pos.y,
      ancho: t?.ancho ?? n.ancho,
      profundo: t?.profundo ?? n.profundidad,
    };
  };

  const snapSi = (valor: number, alt: boolean) =>
    construir && rejilla && !alt ? snap(valor) : valor;

  const cancelarGesto = useCallback(() => {
    if (arrastre.current) {
      // Gesto en curso: lo provisional se descarta (un pinch, Esc).
      setPosOverride({});
      setTamOverride({});
    }
    setDibujo(null);
    setGuias([]);
    arrastre.current = null;
  }, []);

  const revertir = (id: string) => {
    setPosOverride((prev) => sinClave(prev, id));
    setTamOverride((prev) => sinClave(prev, id));
  };

  // La fuente de verdad es el servidor: cuando llegan datos frescos y no hay
  // un gesto en curso, las posiciones provisionales sobran. Sin esto, un
  // movimiento que el backend rechaza dejaba el nodo dibujado donde no está.
  useEffect(() => {
    if (arrastre.current) {
      return;
    }
    setPosOverride({});
    setTamOverride({});
  }, [p.nodos]);

  const herramientaDibujando = construir && herramienta !== "seleccionar";

  const iniciarDibujo = (e: PointerEvent, capturador: Element) => {
    capturador.setPointerCapture(e.pointerId);
    const punto = p.aSvg(e.clientX, e.clientY);
    arrastre.current = {
      kind: "dibujo",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      x0: snapSi(punto.x, e.altKey),
      y0: snapSi(punto.y, e.altKey),
      movidoPx: 0,
      alt: e.altKey,
    };
  };

  const onFondoPointerDown = (e: PointerEvent<SVGRectElement>) => {
    if (herramientaDibujando) {
      iniciarDibujo(e, e.target as Element);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    arrastre.current = {
      kind: "pan",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: p.viewBox.x,
      startY: p.viewBox.y,
      movidoPx: 0,
    };
  };

  const onNodoPointerDown = (e: PointerEvent<SVGGElement>, nodo: NodoMapa) => {
    if (herramientaDibujando) {
      // Dibujando con una herramienta: el gesto sobre un nodo inicia el trazo
      // igual que sobre el fondo (estilo Sims: se construye encima de todo).
      iniciarDibujo(e, e.currentTarget);
      return;
    }
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    arrastre.current = {
      kind: "nodo",
      pointerId: e.pointerId,
      nodoId: nodo.id,
      tipo: nodo.tipo,
      posZ: nodo.pos_z,
      altura: nodo.altura,
      startClientX: e.clientX,
      startClientY: e.clientY,
      inicio: rectDe(nodo),
      movidoPx: 0,
      alt: e.altKey,
      fijo: p.bloqueado(nodo.tipo),
    };
  };

  const onTiradorPointerDown = (
    e: PointerEvent<SVGRectElement>,
    nodo: NodoMapa,
    esquina: Esquina,
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    arrastre.current = {
      kind: "resize",
      pointerId: e.pointerId,
      nodoId: nodo.id,
      tipo: nodo.tipo,
      esquina,
      posZ: nodo.pos_z,
      altura: nodo.altura,
      startClientX: e.clientX,
      startClientY: e.clientY,
      inicio: rectDe(nodo),
      movidoPx: 0,
      alt: e.altKey,
      fijo: false,
    };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const est = arrastre.current;
    if (!est || est.pointerId !== e.pointerId) {
      return;
    }
    const s = p.escala();
    const dxPx = e.clientX - est.startClientX;
    const dyPx = e.clientY - est.startClientY;
    est.movidoPx = Math.max(est.movidoPx, Math.hypot(dxPx, dyPx));

    if (est.kind === "pan") {
      p.setViewBox((v) => ({ ...v, x: est.startX - dxPx * s, y: est.startY - dyPx * s }));
      return;
    }
    if (est.kind === "dibujo") {
      const crudo = p.aSvg(e.clientX, e.clientY);
      const alt = e.altKey || est.alt;
      const x1 = est.x0 + snapSi(crudo.x - est.x0, alt);
      const y1 = est.y0 + snapSi(crudo.y - est.y0, alt);
      setDibujo(rectEntrePuntos(est.x0, est.y0, x1, y1));
      return;
    }

    if (est.fijo) {
      return;
    }
    const dx = dxPx * s;
    const dy = dyPx * s;
    const alt = e.altKey || est.alt;
    if (est.kind === "nodo") {
      // Snap RELATIVO al punto de partida: soltar donde estaba vuelve al
      // punto EXACTO aunque no esté alineado a la rejilla (posiciones como
      // 364, de columnas de 172, serían inalcanzables con snap absoluto).
      let x = est.inicio.x + snapSi(dx, alt);
      let y = est.inicio.y + snapSi(dy, alt);
      if (construir && !alt) {
        // Además de la rejilla: pegarse a bordes/centros de los vecinos.
        const aj = ajustarAVecinos(
          indice,
          { x, y, ancho: est.inicio.ancho, profundo: est.inicio.profundo },
          est.nodoId,
        );
        x = aj.x;
        y = aj.y;
        setGuias(aj.guias);
      } else {
        setGuias([]);
      }
      setPosOverride((prev) => ({ ...prev, [est.nodoId]: { x, y } }));
      return;
    }
    const nuevo = redimensionar(est.inicio, est.esquina, dx, dy, (v) => snapSi(v, alt));
    setPosOverride((prev) => ({ ...prev, [est.nodoId]: { x: nuevo.x, y: nuevo.y } }));
    setTamOverride((prev) => ({ ...prev, [est.nodoId]: nuevo }));
  };

  const terminarDibujo = () => {
    const r = dibujo;
    setDibujo(null);
    if (r && r.ancho >= LADO_MINIMO && r.profundo >= LADO_MINIMO) {
      const rect = {
        x: Math.round(r.x),
        y: Math.round(r.y),
        ancho: Math.round(r.ancho),
        profundo: Math.round(r.profundo),
      };
      const res = evaluarColocacion(
        indice,
        candidatoDe({ id: "__dibujo__", tipo: herramienta as HerramientaDibujo }, rect),
        opciones,
      );
      if (res.estado === "bloqueado") {
        p.avisar(`No se puede crear aquí: ${res.motivo}.`);
        return;
      }
      if (res.estado === "advertencia" && res.motivo) {
        p.advertir(res.motivo);
      }
      p.onCrear(herramienta as HerramientaDibujo, rect);
    }
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const est = arrastre.current;
    if (!est || est.pointerId !== e.pointerId) {
      return;
    }
    arrastre.current = null;
    setGuias([]);
    if (est.kind === "dibujo") {
      terminarDibujo();
      return;
    }
    const nodo = "nodoId" in est ? nodoPorId.get(est.nodoId) : undefined;
    if (est.kind === "pan" || !nodo) {
      return;
    }
    if (est.movidoPx < UMBRAL_CLIC_PX) {
      // Clic simple: seleccionar (el doble clic abre la ficha).
      p.onSeleccionar(p.seleccionId === nodo.id ? null : nodo.id);
      revertir(nodo.id);
      return;
    }
    if (est.fijo) {
      return;
    }
    const r = rectDe(nodo);
    // Se evalúa siempre: el modo Build solo añade herramientas de dibujo, la
    // validez de mover un nodo no depende de él.
    const res = evaluarColocacion(indice, candidatoDe(nodo, r), opciones);
    if (res.estado === "bloqueado") {
      revertir(nodo.id);
      p.avisar(`Movimiento bloqueado: ${res.motivo}.`);
      return;
    }
    if (res.estado === "advertencia" && res.motivo) {
      p.advertir(res.motivo);
    }
    p.onMover(
      est.tipo,
      nodo.id,
      Math.round(r.x),
      Math.round(r.y),
      nodo.pos_z,
      nodo.altura,
      Math.round(r.ancho),
      Math.round(r.profundo),
    );
  };

  return {
    arrastre,
    dibujo,
    guias,
    rectDe,
    cancelarGesto,
    onFondoPointerDown,
    onNodoPointerDown,
    onTiradorPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
