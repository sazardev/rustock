import { ButtonLink, Card, PageHeader } from "../shared/ui";
import { PATH } from "../app/route-paths";
import { useT, type Diccionario } from "../shared/i18n";

interface Reporte {
  id: string;
  nombre: string;
  descripcion: string;
  href: string;
}

/** El catálogo de reportes en el idioma activo. */
function reportesDe(t: Diccionario): Reporte[] {
  return [
    {
      id: "stock",
      nombre: t.reportes.stock.titulo,
      descripcion: t.reportes.fichas.stockDesc,
      href: PATH.reporteStock,
    },
    {
      id: "movimientos",
      nombre: t.reportes.movimientos.titulo,
      descripcion: t.reportes.fichas.movimientosDesc,
      href: PATH.reporteMovimientos,
    },
    {
      id: "vencimientos",
      nombre: t.reportes.vencimientos.titulo,
      descripcion: t.reportes.fichas.vencimientosDesc,
      href: PATH.reporteVencimientos,
    },
    {
      id: "kardex",
      nombre: t.reportes.kardex.titulo,
      descripcion: t.reportes.fichas.kardexDesc,
      href: PATH.reporteKardex,
    },
    {
      id: "precision",
      nombre: t.reportes.precision.titulo,
      descripcion: t.reportes.fichas.precisionDesc,
      href: PATH.reportePrecision,
    },
    {
      id: "auditoria",
      nombre: t.reportes.auditoria.titulo,
      descripcion: t.reportes.fichas.auditoriaDesc,
      href: PATH.reporteAuditoria,
    },
    {
      id: "entradas",
      nombre: t.reportes.entradas.titulo,
      descripcion: t.reportes.fichas.entradasDesc,
      href: PATH.reporteEntradas,
    },
    {
      id: "salidas",
      nombre: t.reportes.salidas.titulo,
      descripcion: t.reportes.fichas.salidasDesc,
      href: PATH.reporteSalidas,
    },
    {
      id: "mermas",
      nombre: t.reportes.mermas.titulo,
      descripcion: t.reportes.fichas.mermasDesc,
      href: PATH.reporteMermasAjustes,
    },
    {
      id: "usuarios",
      nombre: t.reportes.usuarios.titulo,
      descripcion: t.reportes.fichas.usuariosDesc,
      href: PATH.reporteUsuarios,
    },
  ];
}

export function ReportesPage() {
  const t = useT();

  return (
    <>
      <PageHeader title={t.reportes.titulo} description={t.reportes.intro} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportesDe(t).map((reporte) => (
          <Card key={reporte.id} title={reporte.nombre}>
            <Card.Body>
              <p className="mb-4 text-sm text-gray-500">{reporte.descripcion}</p>
              <ButtonLink variant="secondary" size="sm" icon="reportes" href={reporte.href}>
                {t.reportes.abrirReporte}
              </ButtonLink>
            </Card.Body>
          </Card>
        ))}
      </div>
    </>
  );
}
