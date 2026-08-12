import { createBrowserRouter } from "react-router";
import { AppLayout } from "./AppLayout";
import { AlertasPage } from "../pages/AlertasPage";
import { AlmacenFormPage } from "../pages/AlmacenFormPage";
import { BootstrapAdminPage } from "../pages/BootstrapAdminPage";
import { ConfiguracionPage } from "../pages/ConfiguracionPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ErrorPage } from "../pages/ErrorPage";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { GaleriaPage } from "../pages/GaleriaPage";
import { HistorialPage } from "../pages/HistorialPage";
import { InventarioNuevoPage } from "../pages/InventarioNuevoPage";
import { InventarioPage } from "../pages/InventarioPage";
import { LoginPage } from "../pages/LoginPage";
import { MovimientoAnularPage } from "../pages/MovimientoAnularPage";
import { MovimientoAprobarPage } from "../pages/MovimientoAprobarPage";
import { MovimientoDetallePage } from "../pages/MovimientoDetallePage";
import { MovimientoNuevoPage } from "../pages/MovimientoNuevoPage";
import { MovimientosPage } from "../pages/MovimientosPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProductoFormPage } from "../pages/ProductoFormPage";
import { ReporteKardexPage } from "../pages/ReporteKardexPage";
import { ReporteVencimientosPage } from "../pages/ReporteVencimientosPage";
import { ReportesPage } from "../pages/ReportesPage";
import { SesionInventarioCerrarPage } from "../pages/SesionInventarioCerrarPage";
import { SesionInventarioConteosPage } from "../pages/SesionInventarioConteosPage";
import { SesionInventarioDetallePage } from "../pages/SesionInventarioDetallePage";
import {
  CATALOGOS,
  CatalogDetailRoute,
  CatalogEliminarRoute,
  CatalogListRoute,
} from "../pages/catalogs";
import { PATH } from "./route-paths";

const CATALOG_KEYS = Object.keys(CATALOGOS);

export const router = createBrowserRouter([
  { path: PATH.login, element: <LoginPage />, errorElement: <ErrorPage /> },
  {
    path: PATH.configurarAdministrador,
    element: <BootstrapAdminPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "movimientos", element: <MovimientosPage /> },
      { path: "movimientos/nuevo", element: <MovimientoNuevoPage /> },
      { path: "movimientos/:id", element: <MovimientoDetallePage /> },
      { path: "movimientos/:id/aprobar", element: <MovimientoAprobarPage /> },
      { path: "movimientos/:id/anular", element: <MovimientoAnularPage /> },
      { path: "inventario", element: <InventarioPage /> },
      { path: "inventario/nuevo", element: <InventarioNuevoPage /> },
      { path: "inventario/:id", element: <SesionInventarioDetallePage /> },
      { path: "inventario/:id/conteos", element: <SesionInventarioConteosPage /> },
      { path: "inventario/:id/cerrar", element: <SesionInventarioCerrarPage /> },
      { path: "alertas", element: <AlertasPage /> },
      { path: "reportes", element: <ReportesPage /> },
      { path: "reportes/vencimientos", element: <ReporteVencimientosPage /> },
      { path: "reportes/kardex", element: <ReporteKardexPage /> },
      { path: "reportes/kardex/:productoId", element: <ReporteKardexPage /> },
      { path: "historial", element: <HistorialPage /> },
      { path: "usuarios", element: <AlertasPage /> },
      { path: "configuracion", element: <ConfiguracionPage /> },
      { path: PATH.galeria.replace("/", ""), element: <GaleriaPage /> },
      { path: "almacenes/nuevo", element: <AlmacenFormPage /> },
      { path: "almacenes/:id/editar", element: <AlmacenFormPage /> },
      { path: "almacenes/:id/eliminar", element: <CatalogEliminarRoute catalog="almacenes" /> },
      { path: "productos/nuevo", element: <ProductoFormPage /> },
      { path: "productos/:id/editar", element: <ProductoFormPage /> },
      { path: "productos/:id/eliminar", element: <CatalogEliminarRoute catalog="productos" /> },
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
