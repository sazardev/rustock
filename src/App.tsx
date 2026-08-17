import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { useSession } from "./shared/session";
import { useTema } from "./shared/tema";
import { ToastProvider } from "./shared/ui";
import { router } from "./app/router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Al volver a una pantalla (listado, detalle, refs) los datos se
      // re-fetchan siempre, aunque la query esté "fresca": garantiza que las
      // mutaciones hechas en otra página (crear/editar/anular) se reflejen de
      // inmediato. La caché sigue evitando re-fetchs dentro de la misma vista.
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Resuelve la sesión una sola vez al arrancar la app (SPEC §4.1). Vivía en
 * AppLayout, pero la raíz ahora es pública (landing): sin esta llamada el
 * store queda en `cargando: true` y ninguna página pública renderiza.
 */
function SesionBootstrap() {
  const refrescar = useSession((s) => s.refrescar);
  const usuario = useSession((s) => s.usuario);
  useEffect(() => {
    void refrescar();
  }, [refrescar]);
  useEffect(() => {
    if (!usuario) {
      // Sin sesión (login, landing, 403): pintar con el tema global de la
      // empresa que eligió el ADMIN (DESIGN §3.1). Con sesión, el tema
      // personal lo aplica AppLayout vía preferencias.
      void useTema.getState().refrescarGlobal();
    }
  }, [usuario]);
  return <RouterProvider router={router} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SesionBootstrap />
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
