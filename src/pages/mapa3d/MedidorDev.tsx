import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

interface InfoDev {
  calls: number;
  triangles: number;
}

/** Solo desarrollo / mediciones: deja en consola los draw calls y triangulos
 * del render al cargar y expone en `window`:
 * - `rustock3dInfo()`: draw calls y triangulos del ultimo render.
 * - `rustock3dRenders()`: milisegundos de CPU de cada `gl.render` desde la
 *   ultima llamada (el costo que paga el hilo principal, sin la GPU). */
export function MedidorDev() {
  const gl = useThree((s) => s.gl);
  const cuadros = useRef(0);
  useEffect(() => {
    const w = window as unknown as {
      rustock3dInfo?: () => InfoDev;
      rustock3dRenders?: () => number[];
    };
    const original = gl.render.bind(gl);
    let tiempos: number[] = [];
    gl.render = (escena, camara) => {
      const t0 = performance.now();
      original(escena, camara);
      tiempos.push(performance.now() - t0);
    };
    w.rustock3dInfo = () => ({
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    });
    w.rustock3dRenders = () => {
      const t = tiempos;
      tiempos = [];
      return t;
    };
    return () => {
      gl.render = original;
      delete w.rustock3dInfo;
      delete w.rustock3dRenders;
    };
  }, [gl]);
  useFrame(() => {
    cuadros.current += 1;
    if (cuadros.current === 4) {
      console.debug(
        `[rustock3d] draw calls: ${gl.info.render.calls}, triangulos: ${gl.info.render.triangles}`,
      );
    }
  });
  return null;
}
