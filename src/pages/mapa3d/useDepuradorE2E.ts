import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { M_POR_UNIDAD } from "../mapa/unidades";

/** Asistente de depuración: proyecta coordenadas del plano a pantalla para
 * pruebas E2E determinísticas (solo expone un proyector de coordenadas). */
export function useDepuradorE2E() {
  const { camera, gl } = useThree();
  useEffect(() => {
    console.debug("[rustock3d] asistente de depuración instalado");
    const w = window as unknown as {
      rustock3dDepur?: { proyectar: (x: number, y: number) => [number, number] };
    };
    w.rustock3dDepur = {
      proyectar: (xSvg: number, ySvg: number) => {
        const v = new Vector3(xSvg * M_POR_UNIDAD, 0, ySvg * M_POR_UNIDAD).project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        return [
          Math.round(rect.left + ((v.x + 1) / 2) * rect.width),
          Math.round(rect.top + ((1 - v.y) / 2) * rect.height),
        ];
      },
    };
  }, [camera, gl]);
}
