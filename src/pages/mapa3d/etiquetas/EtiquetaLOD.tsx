import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

export interface EtiquetaCandidata {
  id: string;
  texto: string;
  detalle?: string;
  /** Punto de anclaje en la escena (metros). */
  x: number;
  y: number;
  z: number;
  /** Seleccionado/resaltado: siempre visible, sin fundido. */
  forzada: boolean;
}

/** Fraccion de la distancia maxima hasta la que la etiqueta esta opaca. */
const FRACCION_OPACA = 0.45;

const punto = new Vector3();

function crearEtiqueta(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "mapa-almacen-3d__etiqueta mapa3d-full__etiqueta-lod";
  el.append(document.createElement("span"), document.createElement("span"));
  el.children[1].className = "mapa-almacen-3d__sku";
  el.style.display = "none";
  return el;
}

/** Etiquetas de la escena con nivel de detalle: una capa DOM con un grupo
 * fijo de elementos que se reasignan cada fotograma a las etiquetas mas
 * cercanas a la camara (con fundido por distancia) y a las forzadas, hasta
 * `maximo`. No crea ni destruye nodos React al orbitar. */
export function EtiquetaLOD({
  candidatas,
  activas,
  maximo,
  distanciaM,
}: {
  candidatas: EtiquetaCandidata[];
  activas: boolean;
  /** Tope de etiquetas simultaneas en pantalla (tamano del grupo de elementos). */
  maximo: number;
  /** Distancia (m) a la que la etiqueta se apaga del todo. */
  distanciaM: number;
}) {
  const { gl, camera, invalidate } = useThree();
  const pool = useRef<HTMLDivElement[]>([]);
  const capa = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) {
      return;
    }
    const div = document.createElement("div");
    div.className = "mapa3d-full__etiquetas";
    const elementos = Array.from({ length: maximo }, crearEtiqueta);
    div.append(...elementos);
    host.append(div);
    pool.current = elementos;
    capa.current = div;
    invalidate();
    return () => {
      div.remove();
      pool.current = [];
      capa.current = null;
    };
  }, [gl, invalidate, maximo]);

  useEffect(() => {
    invalidate();
  }, [candidatas, activas, distanciaM, invalidate]);

  useFrame(() => {
    const elementos = pool.current;
    if (elementos.length === 0) {
      return;
    }
    if (!activas) {
      for (const el of elementos) {
        el.style.display = "none";
      }
      return;
    }
    const lejos = distanciaM;
    const cerca = distanciaM * FRACCION_OPACA;
    const w = gl.domElement.clientWidth;
    const h = gl.domElement.clientHeight;
    const vistas: { c: EtiquetaCandidata; d: number }[] = [];
    for (const c of candidatas) {
      const d = camera.position.distanceTo(punto.set(c.x, c.y, c.z));
      if (c.forzada || d < lejos) {
        vistas.push({ c, d: c.forzada ? -1 : d });
      }
    }
    vistas.sort((a, b) => a.d - b.d);
    let usadas = 0;
    for (const { c, d } of vistas) {
      if (usadas >= elementos.length) {
        break;
      }
      punto.set(c.x, c.y, c.z).project(camera);
      if (punto.z > 1 || Math.abs(punto.x) > 1.05 || Math.abs(punto.y) > 1.05) {
        continue;
      }
      const el = elementos[usadas++];
      if (el.dataset.id !== c.id || el.dataset.texto !== c.texto + (c.detalle ?? "")) {
        el.dataset.id = c.id;
        el.dataset.texto = c.texto + (c.detalle ?? "");
        el.children[0].textContent = c.texto;
        el.children[1].textContent = c.detalle ?? "";
      }
      const opacidad = d < 0 ? 1 : Math.min(1, (lejos - d) / (lejos - cerca));
      el.style.display = "flex";
      el.style.opacity = String(opacidad);
      el.style.transform = `translate(-50%, -100%) translate(${((punto.x + 1) / 2) * w}px, ${((1 - punto.y) / 2) * h}px)`;
    }
    for (let i = usadas; i < elementos.length; i++) {
      elementos[i].style.display = "none";
    }
  });

  return null;
}
