import { lazy, type ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import { AppLayout } from "./AppLayout";
import { BootstrapAdminPage } from "../pages/BootstrapAdminPage";
import { ErrorPage } from "../pages/ErrorPage";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { AYUDA_GRUPOS } from "../pages/ayuda/ayuda-data";
import { MANUAL_PARTES } from "../pages/manual/manual-data";
import {
  CATALOGOS,
  CatalogDetailRoute,
  CatalogEliminarRoute,
  CatalogListRoute,
} from "../pages/catalogs";
import {
  CONFIG_ENTRADAS,
  CONFIG_MERMAS_AJUSTES,
  CONFIG_SALIDAS,
  ReporteMovimientosTipoPage,
} from "../pages/ReporteMovimientosTipoPage";
import { PATH } from "./route-paths";

/**
 * Code-splitting por ruta (STACK §8.2): las páginas del shell se cargan de
 * forma diferida (lazy) para que el usuario solo descargue el código de la
 * pantalla que ve. El `AppLayout` envuelve el `<Outlet/>` en un `<Suspense>`
 * con un esqueleto de carga. Las páginas críticas de primer pintado (landing,
 * login, bootstrap, errores) y el sistema de catálogos (que alimenta rutas)
 * se mantienen como imports estáticos.
 */
function lazyPage(
  importFn: () => Promise<Record<string, unknown>>,
  nombre: string,
): ComponentType<any> {
  return lazy(async () => {
    const mod = await importFn();
    return { default: mod[nombre] as ComponentType<any> };
  });
}

const DashboardPage = lazyPage(() => import("../pages/DashboardPage"), "DashboardPage");
const MovimientosPage = lazyPage(() => import("../pages/MovimientosPage"), "MovimientosPage");
const MovimientoNuevoPage = lazyPage(
  () => import("../pages/MovimientoNuevoPage"),
  "MovimientoNuevoPage",
);
const MovimientoDetallePage = lazyPage(
  () => import("../pages/MovimientoDetallePage"),
  "MovimientoDetallePage",
);
const MovimientoEditarPage = lazyPage(
  () => import("../pages/MovimientoEditarPage"),
  "MovimientoEditarPage",
);
const MovimientoAprobarPage = lazyPage(
  () => import("../pages/MovimientoAprobarPage"),
  "MovimientoAprobarPage",
);
const MovimientoAnularPage = lazyPage(
  () => import("../pages/MovimientoAnularPage"),
  "MovimientoAnularPage",
);
const CapturaRecepcionPage = lazyPage(
  () => import("../pages/captura-rapida"),
  "CapturaRecepcionPage",
);
const CapturaDespachoPage = lazyPage(
  () => import("../pages/captura-rapida"),
  "CapturaDespachoPage",
);
const InventarioPage = lazyPage(() => import("../pages/InventarioPage"), "InventarioPage");
const InventarioNuevoPage = lazyPage(
  () => import("../pages/InventarioNuevoPage"),
  "InventarioNuevoPage",
);
const SesionInventarioDetallePage = lazyPage(
  () => import("../pages/SesionInventarioDetallePage"),
  "SesionInventarioDetallePage",
);
const SesionInventarioConteosPage = lazyPage(
  () => import("../pages/SesionInventarioConteosPage"),
  "SesionInventarioConteosPage",
);
const SesionInventarioCerrarPage = lazyPage(
  () => import("../pages/SesionInventarioCerrarPage"),
  "SesionInventarioCerrarPage",
);
const SesionInventarioEliminarPage = lazyPage(
  () => import("../pages/SesionInventarioEliminarPage"),
  "SesionInventarioEliminarPage",
);
const AlertasPage = lazyPage(() => import("../pages/AlertasPage"), "AlertasPage");
const ReportesPage = lazyPage(() => import("../pages/ReportesPage"), "ReportesPage");
const ReporteStockPage = lazyPage(() => import("../pages/ReporteStockPage"), "ReporteStockPage");
const ReporteMovimientosPage = lazyPage(
  () => import("../pages/ReporteMovimientosPage"),
  "ReporteMovimientosPage",
);
const ReporteVencimientosPage = lazyPage(
  () => import("../pages/ReporteVencimientosPage"),
  "ReporteVencimientosPage",
);
const ReporteKardexPage = lazyPage(() => import("../pages/ReporteKardexPage"), "ReporteKardexPage");
const ReportePrecisionPage = lazyPage(
  () => import("../pages/ReportePrecisionPage"),
  "ReportePrecisionPage",
);
const ReporteAuditoriaPage = lazyPage(
  () => import("../pages/ReporteAuditoriaPage"),
  "ReporteAuditoriaPage",
);
const ReporteUsuariosPage = lazyPage(
  () => import("../pages/ReporteUsuariosPage"),
  "ReporteUsuariosPage",
);
const HistorialPage = lazyPage(() => import("../pages/HistorialPage"), "HistorialPage");
const UsuariosPage = lazyPage(() => import("../pages/UsuariosPage"), "UsuariosPage");
const UsuarioFormPage = lazyPage(() => import("../pages/UsuarioFormPage"), "UsuarioFormPage");
const UsuarioDetallePage = lazyPage(
  () => import("../pages/UsuarioDetallePage"),
  "UsuarioDetallePage",
);
const UsuarioEliminarPage = lazyPage(
  () => import("../pages/UsuarioEliminarPage"),
  "UsuarioEliminarPage",
);
const UsuarioPasswordPage = lazyPage(
  () => import("../pages/UsuarioPasswordPage"),
  "UsuarioPasswordPage",
);
const PerfilPage = lazyPage(() => import("../pages/PerfilPage"), "PerfilPage");
const ConfiguracionPage = lazyPage(() => import("../pages/ConfiguracionPage"), "ConfiguracionPage");
const ArchivoVerPage = lazyPage(() => import("../pages/ArchivoVerPage"), "ArchivoVerPage");
const SucursalesPage = lazyPage(() => import("../pages/SucursalesPage"), "SucursalesPage");
const SucursalFormPage = lazyPage(() => import("../pages/SucursalFormPage"), "SucursalFormPage");
const SucursalDetallePage = lazyPage(
  () => import("../pages/SucursalDetallePage"),
  "SucursalDetallePage",
);
const SucursalEliminarPage = lazyPage(
  () => import("../pages/SucursalEliminarPage"),
  "SucursalEliminarPage",
);
const GaleriaPage = lazyPage(() => import("../pages/GaleriaPage"), "GaleriaPage");
const AlmacenFormPage = lazyPage(() => import("../pages/AlmacenFormPage"), "AlmacenFormPage");
const ProductoFormPage = lazyPage(() => import("../pages/ProductoFormPage"), "ProductoFormPage");
const UomFormPage = lazyPage(() => import("../pages/UomFormPage"), "UomFormPage");
const CategoriaFormPage = lazyPage(() => import("../pages/CategoriaFormPage"), "CategoriaFormPage");
const ContactoFormPage = lazyPage(() => import("../pages/ContactoFormPage"), "ContactoFormPage");
const UbicacionFormPage = lazyPage(() => import("../pages/UbicacionFormPage"), "UbicacionFormPage");
const ZonaFormPage = lazyPage(() => import("../pages/ZonaFormPage"), "ZonaFormPage");
const RackFormPage = lazyPage(() => import("../pages/RackFormPage"), "RackFormPage");
const PasilloFormPage = lazyPage(() => import("../pages/PasilloFormPage"), "PasilloFormPage");
const SeccionFormPage = lazyPage(() => import("../pages/SeccionFormPage"), "SeccionFormPage");
const CajaFormPage = lazyPage(() => import("../pages/CajaFormPage"), "CajaFormPage");
const LoteFormPage = lazyPage(() => import("../pages/LoteFormPage"), "LoteFormPage");
const ImportarPage = lazyPage(() => import("../pages/ImportarPage"), "ImportarPage");
const AlmacenMapaPage = lazyPage(() => import("../pages/AlmacenMapaPage"), "AlmacenMapaPage");
const AlmacenMapa3DPage = lazyPage(() => import("../pages/AlmacenMapa3DPage"), "AlmacenMapa3DPage");
const MapaAsistentePage = lazyPage(() => import("../pages/MapaAsistentePage"), "MapaAsistentePage");
const AyudaIndexPage = lazyPage(() => import("../pages/ayuda/AyudaPages"), "AyudaIndexPage");
const AyudaGlosarioPage = lazyPage(() => import("../pages/ayuda/AyudaPages"), "AyudaGlosarioPage");
const AyudaModulePage = lazyPage(() => import("../pages/ayuda/AyudaPages"), "AyudaModulePage");
const ManualIndexPage = lazyPage(() => import("../pages/manual/ManualPages"), "ManualIndexPage");
const ManualCapituloPage = lazyPage(
  () => import("../pages/manual/ManualPages"),
  "ManualCapituloPage",
);
const ManualGlosarioPage = lazyPage(
  () => import("../pages/manual/ManualPages"),
  "ManualGlosarioPage",
);
const ManualPrintPage = lazyPage(() => import("../pages/manual/ManualPages"), "ManualPrintPage");

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
    errorElement: <ErrorPage />,
    children: [
      // Raíz pública: landing sin sesión o redirección al dashboard con sesión.
      { index: true, element: <LandingPage /> },
      // Aplicación: el shell exige sesión (AppLayout redirige a /login).
      {
        element: <AppLayout />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "movimientos", element: <MovimientosPage /> },
          { path: "movimientos/nuevo", element: <MovimientoNuevoPage /> },
          { path: "movimientos/captura-recepcion", element: <CapturaRecepcionPage /> },
          { path: "movimientos/captura-despacho", element: <CapturaDespachoPage /> },
          { path: "movimientos/:id", element: <MovimientoDetallePage /> },
          { path: "movimientos/:id/editar", element: <MovimientoEditarPage /> },
          { path: "movimientos/:id/aprobar", element: <MovimientoAprobarPage /> },
          { path: "movimientos/:id/anular", element: <MovimientoAnularPage /> },
          { path: "inventario", element: <InventarioPage /> },
          { path: "inventario/nuevo", element: <InventarioNuevoPage /> },
          { path: "inventario/:id", element: <SesionInventarioDetallePage /> },
          { path: "inventario/:id/conteos", element: <SesionInventarioConteosPage /> },
          { path: "inventario/:id/cerrar", element: <SesionInventarioCerrarPage /> },
          { path: "inventario/:id/eliminar", element: <SesionInventarioEliminarPage /> },
          { path: "alertas", element: <AlertasPage /> },
          { path: "reportes", element: <ReportesPage /> },
          { path: "reportes/stock", element: <ReporteStockPage /> },
          { path: "reportes/movimientos", element: <ReporteMovimientosPage /> },
          { path: "reportes/vencimientos", element: <ReporteVencimientosPage /> },
          { path: "reportes/kardex", element: <ReporteKardexPage /> },
          { path: "reportes/kardex/:productoId", element: <ReporteKardexPage /> },
          { path: "reportes/precision", element: <ReportePrecisionPage /> },
          { path: "reportes/auditoria", element: <ReporteAuditoriaPage /> },
          {
            path: "reportes/entradas",
            element: <ReporteMovimientosTipoPage config={CONFIG_ENTRADAS} />,
          },
          {
            path: "reportes/salidas",
            element: <ReporteMovimientosTipoPage config={CONFIG_SALIDAS} />,
          },
          {
            path: "reportes/mermas-ajustes",
            element: <ReporteMovimientosTipoPage config={CONFIG_MERMAS_AJUSTES} />,
          },
          { path: "reportes/usuarios", element: <ReporteUsuariosPage /> },
          { path: "historial", element: <HistorialPage /> },
          { path: "ayuda", element: <AyudaIndexPage /> },
          { path: "ayuda/glosario", element: <AyudaGlosarioPage /> },
          ...AYUDA_GRUPOS.flatMap((g) => g.modulos).map((mod) => ({
            path: `ayuda/${mod.id}`,
            element: <AyudaModulePage id={mod.id} />,
          })),
          { path: "manual", element: <ManualIndexPage /> },
          { path: "manual/imprimir", element: <ManualPrintPage /> },
          { path: "manual/m08-glosario", element: <ManualGlosarioPage /> },
          ...MANUAL_PARTES.flatMap((parte) =>
            parte.capitulos
              .filter((cap) => cap.id !== "m08-glosario")
              .map((cap) => ({
                path: `manual/${cap.id}`,
                element: <ManualCapituloPage id={cap.id} />,
              })),
          ),
          { path: "usuarios", element: <UsuariosPage /> },
          { path: "usuarios/nuevo", element: <UsuarioFormPage /> },
          { path: "usuarios/:id", element: <UsuarioDetallePage /> },
          { path: "usuarios/:id/editar", element: <UsuarioFormPage /> },
          { path: "usuarios/:id/eliminar", element: <UsuarioEliminarPage /> },
          { path: "usuarios/:id/password", element: <UsuarioPasswordPage /> },
          { path: "perfil", element: <PerfilPage /> },
          { path: "configuracion", element: <ConfiguracionPage /> },
          { path: "configuracion/importar", element: <ImportarPage /> },
          { path: "configuracion/archivos/:id/ver", element: <ArchivoVerPage /> },
          { path: "sucursales", element: <SucursalesPage /> },
          { path: "sucursales/nuevo", element: <SucursalFormPage /> },
          { path: "sucursales/:id", element: <SucursalDetallePage /> },
          { path: "sucursales/:id/editar", element: <SucursalFormPage /> },
          { path: "sucursales/:id/eliminar", element: <SucursalEliminarPage /> },
          { path: PATH.galeria.replace("/", ""), element: <GaleriaPage /> },
          { path: "almacenes/nuevo", element: <AlmacenFormPage /> },
          { path: "almacenes/:id/editar", element: <AlmacenFormPage /> },
          { path: "almacenes/:id/eliminar", element: <CatalogEliminarRoute catalog="almacenes" /> },
          { path: "almacenes/:id/mapa", element: <AlmacenMapaPage /> },
          { path: "almacenes/:id/mapa/asistente", element: <MapaAsistentePage /> },
          { path: "almacenes/:id/mapa-3d", element: <AlmacenMapa3DPage /> },
          { path: "productos/nuevo", element: <ProductoFormPage /> },
          { path: "productos/:id/editar", element: <ProductoFormPage /> },
          { path: "productos/:id/eliminar", element: <CatalogEliminarRoute catalog="productos" /> },
          { path: "uoms/nuevo", element: <UomFormPage /> },
          { path: "uoms/:id/editar", element: <UomFormPage /> },
          { path: "uoms/:id/eliminar", element: <CatalogEliminarRoute catalog="uoms" /> },
          { path: "categorias/nuevo", element: <CategoriaFormPage /> },
          { path: "categorias/:id/editar", element: <CategoriaFormPage /> },
          {
            path: "categorias/:id/eliminar",
            element: <CatalogEliminarRoute catalog="categorias" />,
          },
          { path: "proveedores/nuevo", element: <ContactoFormPage tipo="proveedor" /> },
          { path: "proveedores/:id/editar", element: <ContactoFormPage tipo="proveedor" /> },
          {
            path: "proveedores/:id/eliminar",
            element: <CatalogEliminarRoute catalog="proveedores" />,
          },
          { path: "clientes/nuevo", element: <ContactoFormPage tipo="cliente" /> },
          { path: "clientes/:id/editar", element: <ContactoFormPage tipo="cliente" /> },
          { path: "clientes/:id/eliminar", element: <CatalogEliminarRoute catalog="clientes" /> },
          { path: "ubicaciones/nuevo", element: <UbicacionFormPage /> },
          { path: "ubicaciones/:id/editar", element: <UbicacionFormPage /> },
          {
            path: "ubicaciones/:id/eliminar",
            element: <CatalogEliminarRoute catalog="ubicaciones" />,
          },
          { path: "zonas/nuevo", element: <ZonaFormPage /> },
          { path: "zonas/:id/editar", element: <ZonaFormPage /> },
          { path: "zonas/:id/eliminar", element: <CatalogEliminarRoute catalog="zonas" /> },
          { path: "pasillos/nuevo", element: <PasilloFormPage /> },
          { path: "pasillos/:id/editar", element: <PasilloFormPage /> },
          { path: "pasillos/:id/eliminar", element: <CatalogEliminarRoute catalog="pasillos" /> },
          { path: "racks/nuevo", element: <RackFormPage /> },
          { path: "racks/:id/editar", element: <RackFormPage /> },
          { path: "racks/:id/eliminar", element: <CatalogEliminarRoute catalog="racks" /> },
          { path: "secciones/nuevo", element: <SeccionFormPage /> },
          { path: "secciones/:id/editar", element: <SeccionFormPage /> },
          { path: "secciones/:id/eliminar", element: <CatalogEliminarRoute catalog="secciones" /> },
          { path: "cajas/nuevo", element: <CajaFormPage /> },
          { path: "cajas/:id/editar", element: <CajaFormPage /> },
          { path: "cajas/:id/eliminar", element: <CatalogEliminarRoute catalog="cajas" /> },
          { path: "lotes/nuevo", element: <LoteFormPage /> },
          { path: "lotes/:id/editar", element: <LoteFormPage /> },
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
    ],
  },
]);
