import { useMemo, useState } from "react";
import { useT } from "../shared/i18n";
import { useQuery } from "@tanstack/react-query";
import { listarMovimientos, listarUsuarios } from "../shared/backend";
import { esPaginado, type TipoMovimiento } from "../shared/types";
import {
  ButtonLink,
  Card,
  ErrorPanel,
  ExportButtons,
  FilterBar,
  FilterField,
  Input,
  PageHeader,
  Select,
  Table,
  type TableColumn,
} from "../shared/ui";
import { PATH } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { nombreExportacion } from "../shared/exportar";

const TIPOS: TipoMovimiento[] = ["ENTRADA", "SALIDA", "TRASLADO", "AJUSTE", "CONSUMO"];

interface FilaUsuario {
  usuario_id: string;
  total: number;
  pct: number;
}

export function ReporteUsuariosPage() {
  const t = useT();
  const [tipo, setTipo] = useState<TipoMovimiento | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtros = useMemo(() => {
    const f: string[] = [];
    if (tipo) f.push(`tipo:eq:${tipo}`);
    if (desde) f.push(`fecha_movimiento:gte:${desde}T00:00:00`);
    if (hasta) f.push(`fecha_movimiento:lte:${hasta}T23:59:59`);
    return f.length ? f : undefined;
  }, [tipo, desde, hasta]);

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", "reporte-usuarios"],
    queryFn: () => listarUsuarios({ page_size: -1, sort: "nombre_usuario" }),
  });
  const usuarioPorId = useMemo(() => {
    const l = usuariosQuery.data && esPaginado(usuariosQuery.data) ? usuariosQuery.data.data : [];
    return new Map(l.map((u) => [u.id, u]));
  }, [usuariosQuery.data]);

  const query = useQuery({
    queryKey: ["reporte-usuarios", { filtros }],
    queryFn: () => listarMovimientos({ group_by: "created_by", filters: filtros }),
  });

  const filas = useMemo<FilaUsuario[]>(() => {
    const grupos = query.data && "groups" in query.data ? query.data.groups : [];
    const validos = grupos.filter((g) => typeof g.count === "number");
    const total = validos.reduce((acc, g) => acc + (g.count as number), 0);
    return validos.map((g) => ({
      usuario_id: String(g.key),
      total: g.count as number,
      pct: total > 0 ? ((g.count as number) / total) * 100 : 0,
    }));
  }, [query.data]);

  const filasExport = useMemo(
    () =>
      filas.map((f) => ({
        usuario: usuarioPorId.get(f.usuario_id)?.nombre_usuario ?? f.usuario_id,
        nombre_completo: usuarioPorId.get(f.usuario_id)?.nombre_completo ?? "",
        movimientos: f.total,
        porcentaje: `${f.pct.toFixed(1)}%`,
      })),
    [filas, usuarioPorId],
  );

  const columns: Array<TableColumn<FilaUsuario>> = [
    {
      key: "usuario_id",
      header: t.reportes.usuarios.usuario,
      render: (f) => usuarioPorId.get(f.usuario_id)?.nombre_usuario ?? f.usuario_id,
    },
    {
      key: "nombre",
      header: t.comun.nombre,
      render: (f) => usuarioPorId.get(f.usuario_id)?.nombre_completo ?? "—",
    },
    {
      key: "total",
      header: t.reportes.usuarios.movimientos,
      num: true,
      render: (f) => f.total.toLocaleString(),
    },
    {
      key: "pct",
      header: t.reportes.usuarios.pctDelTotal,
      num: true,
      render: (f) => `${f.pct.toFixed(1)}%`,
    },
  ];

  return (
    <>
      <PageHeader
        title={t.reportes.usuarios.titulo}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            {t.reportes.volver}
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title={t.reportes.usuarios.noSePudoCargar}>
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <FilterBar
        action={
          <ExportButtons
            nombre={nombreExportacion("desempeno-usuarios")}
            filas={filasExport}
            disabled={query.isLoading}
          />
        }
      >
        <FilterField>
          <Select
            aria-label={t.reportes.filtrarTipo}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovimiento | "")}
          >
            <option value="">{t.reportes.todosTipos}</option>
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {t.dominio.tipoMovimiento[tipo]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Input
            type="date"
            aria-label={t.reportes.desde}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </FilterField>
        <FilterField>
          <Input
            type="date"
            aria-label={t.reportes.hasta}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </FilterField>
      </FilterBar>

      <div className="mt-6">
        <Card title={t.reportes.usuarios.porUsuario}>
          <Table
            columns={columns}
            rows={filas}
            rowKey={(f) => f.usuario_id}
            loading={query.isLoading}
            emptyTitle={t.reportes.movimientos.sinMovimientos}
            emptyDescription={t.reportes.ajusteFiltros}
          />
        </Card>
      </div>
    </>
  );
}
