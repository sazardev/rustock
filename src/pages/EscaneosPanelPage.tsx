import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarEventosEscaneo, metricasEscaneo } from "../shared/backend";
import type { ResultadoEscaneoTipo } from "../shared/types";
import { formatearFecha, mensajeError } from "../shared/format";
import { useT } from "../shared/i18n";
import {
  Badge,
  Card,
  DetailList,
  ErrorPanel,
  Field,
  PageHeader,
  Select,
  Table,
  Text,
  type TableColumn,
} from "../shared/ui";

const TONO: Record<ResultadoEscaneoTipo, "success" | "warning" | "danger"> = {
  RESUELTO: "success",
  NO_ENCONTRADO: "warning",
  DENEGADO: "danger",
};

/**
 * Panel de escaneos (SPEC §14.3.4).
 *
 * Es auditoría, no operación: exige `escaneo:ver`, que solo tienen GERENTE y
 * ADMIN. Responde tres preguntas que un jefe de almacén se hace de verdad:
 * ¿qué etiquetas hay que reimprimir?, ¿quién está intentando hacer cosas que
 * su rol no permite?, y ¿a qué horas se opera realmente?
 *
 * Todo el cálculo lo hace Rust: esta pantalla no deriva ni una métrica.
 */
export function EscaneosPanelPage() {
  const t = useT();
  const [dias, setDias] = useState(30);

  const metricas = useQuery({
    queryKey: ["escaneo", "metricas", dias],
    queryFn: () => metricasEscaneo(dias),
  });
  const eventos = useQuery({
    queryKey: ["escaneo", "eventos"],
    queryFn: () => listarEventosEscaneo(100),
  });

  const m = metricas.data;

  const columnas: TableColumn<NonNullable<typeof eventos.data>[number]>[] = [
    {
      key: "created_at",
      header: t.panelEscaneos.cuando,
      render: (e) => formatearFecha(e.created_at),
    },
    { key: "codigo", header: t.campos.codigo, code: true, render: (e) => e.codigo },
    {
      key: "resultado",
      header: t.panelEscaneos.resultado,
      render: (e) => (
        <Badge tone={TONO[e.resultado]}>{t.panelEscaneos.resultados[e.resultado]}</Badge>
      ),
    },
    {
      key: "entidad",
      header: t.panelEscaneos.resolvioA,
      render: (e) => (e.entidad_etiqueta ? `${e.tipo_entidad} · ${e.entidad_etiqueta}` : "—"),
    },
    {
      key: "origen",
      header: t.panelEscaneos.origen,
      render: (e) =>
        e.origen === "CAMARA" ? t.panelEscaneos.origenes.CAMARA : t.panelEscaneos.origenes.TECLADO,
    },
    {
      key: "usuario",
      header: t.panelEscaneos.quien,
      render: (e) => `${e.usuario_nombre ?? e.usuario_id} (${e.rol_codigo})`,
    },
  ];

  return (
    <>
      <PageHeader title={t.panelEscaneos.titulo} description={t.panelEscaneos.descripcion} />

      {metricas.error ? (
        <ErrorPanel title={t.panelEscaneos.noSePudoCargar}>
          {mensajeError(metricas.error)}
        </ErrorPanel>
      ) : null}

      <Card
        title={t.panelEscaneos.resumen}
        actions={
          <Field label="" htmlFor="dias" className="panel-escaneos__periodo">
            <Select
              id="dias"
              value={String(dias)}
              onChange={(e) => setDias(Number(e.target.value))}
            >
              <option value="1">{t.panelEscaneos.ultimas24}</option>
              <option value="7">{t.panelEscaneos.ultimos7}</option>
              <option value="30">{t.panelEscaneos.ultimos30}</option>
              <option value="90">{t.panelEscaneos.ultimos90}</option>
            </Select>
          </Field>
        }
      >
        <Card.Body>
          {m ? (
            <DetailList
              className="detail-list--stats"
              items={[
                { label: t.panelEscaneos.lecturas, value: String(m.total) },
                { label: t.panelEscaneos.acierto, value: `${m.acierto} %` },
                { label: t.panelEscaneos.sinCoincidencia, value: String(m.no_encontrados) },
                { label: t.panelEscaneos.denegadas, value: String(m.denegados) },
                { label: t.panelEscaneos.porCamara, value: String(m.por_camara) },
                { label: t.panelEscaneos.porLector, value: String(m.por_teclado) },
                { label: t.panelEscaneos.tiempoMedio, value: `${m.duracion_media_ms} ms` },
              ]}
            />
          ) : (
            <Text as="p" size="sm" color="muted">
              {t.comun.cargando}
            </Text>
          )}
        </Card.Body>
      </Card>

      <Card title={t.panelEscaneos.etiquetasARevisar}>
        <Card.Body>
          {m && m.codigos_problematicos.length > 0 ? (
            <ul className="panel-escaneos__lista">
              {m.codigos_problematicos.map((c) => (
                <li key={c.codigo} className="panel-escaneos__fila">
                  <span className="panel-escaneos__codigo">{c.codigo}</span>
                  <span className="panel-escaneos__dato">
                    {t.panelEscaneos.intentosPersonas({
                      intentos: c.intentos,
                      personas: c.personas,
                    })}
                  </span>
                  <span className="panel-escaneos__meta">{formatearFecha(c.ultimo_intento)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Text as="p" size="sm" color="muted">
              {t.panelEscaneos.sinProblematicos}
            </Text>
          )}
        </Card.Body>
      </Card>

      <Card title={t.panelEscaneos.intentosFueraDeRol}>
        <Card.Body>
          {m && m.denegados_por_usuario.length > 0 ? (
            <ul className="panel-escaneos__lista">
              {m.denegados_por_usuario.map((d) => (
                <li key={d.usuario_id} className="panel-escaneos__fila">
                  <span className="panel-escaneos__codigo">{d.usuario_nombre ?? d.usuario_id}</span>
                  <span className="panel-escaneos__dato">
                    <Badge tone="danger">{d.rol_codigo}</Badge>{" "}
                    {t.panelEscaneos.intentos({ total: d.intentos })}
                  </span>
                  <span className="panel-escaneos__meta">{formatearFecha(d.ultimo_intento)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Text as="p" size="sm" color="muted">
              {t.panelEscaneos.sinDenegados}
            </Text>
          )}
        </Card.Body>
      </Card>

      <Card title={t.panelEscaneos.actividadPorPersona}>
        <Card.Body>
          {m && m.por_usuario.length > 0 ? (
            <ul className="panel-escaneos__lista">
              {m.por_usuario.map((u) => (
                <li key={u.usuario_id} className="panel-escaneos__fila">
                  <span className="panel-escaneos__codigo">{u.usuario_nombre ?? u.usuario_id}</span>
                  <span className="panel-escaneos__dato">
                    {t.panelEscaneos.lecturasAcierto({ total: u.total, acierto: u.acierto })}
                  </span>
                  <span className="panel-escaneos__meta">{u.rol_codigo}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Text as="p" size="sm" color="muted">
              {t.panelEscaneos.sinLecturas}
            </Text>
          )}
        </Card.Body>
      </Card>

      <Card title={t.panelEscaneos.aQueHoras}>
        <Card.Body>
          {m ? (
            <div className="chart" role="img" aria-label={t.panelEscaneos.lecturasPorHora}>
              {m.por_hora.map((h) => {
                const maximo = Math.max(...m.por_hora.map((x) => x.total), 1);
                return (
                  <div key={h.hora} className="chart__col">
                    <div
                      className={`chart__bar${h.total === 0 ? " chart__bar--muted" : ""}`}
                      style={{ height: `${Math.round((h.total / maximo) * 100)}%` }}
                      title={t.panelEscaneos.horaLecturas({ hora: h.hora, total: h.total })}
                    />
                    <span className="chart__label">{h.hora}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <Card title={t.panelEscaneos.ultimasLecturas}>
        <Card.Body flush>
          <Table
            columns={columnas}
            rows={eventos.data ?? []}
            rowKey={(e) => e.id}
            loading={eventos.isLoading}
            emptyTitle={t.panelEscaneos.sinLecturasTodavia}
            emptyDescription={t.panelEscaneos.sinLecturasDesc}
          />
        </Card.Body>
      </Card>
    </>
  );
}
