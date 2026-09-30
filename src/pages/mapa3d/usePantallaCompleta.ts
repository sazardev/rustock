import { useEffect, useState, type RefObject } from "react";

/** Pantalla completa del contenedor del editor (API Fullscreen). */
export function usePantallaCompleta(editorRef: RefObject<HTMLDivElement | null>) {
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () =>
      setPantallaCompleta(document.fullscreenElement === editorRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [editorRef]);

  const alternarPantallaCompleta = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      editorRef.current?.requestFullscreen();
    }
  };

  return { pantallaCompleta, alternarPantallaCompleta };
}
