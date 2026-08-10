import { createBrowserRouter } from "react-router";
import { AppLayout } from "./AppLayout";
import { AlertasPage } from "../pages/AlertasPage";
import { ConfiguracionPage } from "../pages/ConfiguracionPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ErrorPage } from "../pages/ErrorPage";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { GaleriaPage } from "../pages/GaleriaPage";
import { HistorialPage } from "../pages/HistorialPage";
import { InventarioPage } from "../pages/InventarioPage";
import { MovimientosPage } from "../pages/MovimientosPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ReportesPage } from "../pages/ReportesPage";
import { CATALOGOS, CatalogDetailRoute, CatalogListRoute } from "../pages/catalogs";
import { PATH } from "./route-paths";

const CATALOG_KEYS = Object.keys(CATALOGOS);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "movimientos", element: <MovimientosPage /> },
      { path: "movimientos/nuevo", element: <MovimientosPage /> },
      { path: "inventario", element: <InventarioPage /> },
      { path: "inventario/nuevo", element: <InventarioPage /> },
      { path: "alertas", element: <AlertasPage /> },
      { path: "reportes", element: <ReportesPage /> },
      { path: "historial", element: <HistorialPage /> },
      { path: "usuarios", element: <AlertasPage /> },
      { path: "configuracion", element: <ConfiguracionPage /> },
      { path: PATH.galeria.replace("/", ""), element: <GaleriaPage /> },
      ...CATALOG_KEYS.map((key) => ({
        path: key,
        element: <CatalogListRoute catalog={key} />,
      })),
      ...CATALOG_KEYS.map((key) => ({
        path: `${key}/:id`,
        element: <CatalogDetailRoute catalog={key} />,
      })),
      { path: "acceso-no-permitido", element: <ForbiddenPage /> },
      { path: "no-encontrado", element: <NotFoundPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
