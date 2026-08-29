import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarEventosEscaneo, metricasEscaneo } from "../shared/backend";
import type { ResultadoEscaneoTipo } from "../shared/types";
import { formatearFecha, mensajeError } from "../shared/format";
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

const ETIQUETA_RESULTADO: Record<ResultadoEscaneoTipo, string> = {
  RESUELTO: "Resuelto",
  NO_ENCONTRADO: "Sin coincidencia",
  DENEGADO: "Denegado",
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
      header: "Cuándo",
      render: (e) => formatearFecha(e.created_at),
    },
    { key: "codigo", header: "Código", code: true, render: (e) => e.codigo },
    {
      key: "resultado",
      header: "Resultado",
      render: (e) => <Badge tone={TONO[e.resultado]}>{ETIQUETA_RESULTADO[e.resultado]}</Badge>,
    },
    {
      key: "entidad",
      header: "Resolvió a",
      render: (e) => (e.entidad_etiqueta ? `${e.tipo_entidad} · ${e.entidad_etiqueta}` : "—"),
    },
    {
      key: "origen",
      header: "Origen",
      render: (e) => (e.origen === "CAMARA" ? "Cámara" : "Lector"),
    },
    {
      key: "usuario",
      header: "Quién",
      render: (e) => `${e.usuario_nombre ?? e.usuario_id} (${e.rol_codigo})`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Panel de escaneos"
        description="Quién escaneó qué, cuándo y con qué resultado. Los fallos importan tanto como los aciertos: un código que nadie resuelve es una etiqueta rota, y una racha de denegados es alguien operando fuera de su rol."
      />

      {metricas.error ? (
        <ErrorPanel title="No se pudo cargar el panel">{mensajeError(metricas.error)}</ErrorPanel>
      ) : null}

      <Card
        title="Resumen"
        actions={
          <Field label="" htmlFor="dias" className="panel-escaneos__periodo">
            <Select
              id="dias"
              value={String(dias)}
              onChange={(e) => setDias(Number(e.target.value))}
            >
              <option value="1">Últimas 24 horas</option>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </Select>
          </Field>
        }
      >
        <Card.Body>
          {m ? (
            <DetailList
              className="detail-list--stats"
              items={[
                { label: "Lecturas", value: String(m.total) },
                { label: "Acierto", value: `${m.acierto} %` },
                { label: "Sin coincidencia", value: String(m.no_encontrados) },
                { label: "Denegadas", value: String(m.denegados) },
                { label: "Por cámara", value: String(m.por_camara) },
                { label: "Por lector", value: String(m.por_teclado) },
                { label: "Tiempo medio", value: `${m.duracion_media_ms} ms` },
              ]}
            />
          ) : (
            <Text as="p" size="sm" color="muted">
              Cargando…
            </Text>
          )}
        </Card.Body>
      </Card>

      <Card title="Etiquetas a revisar">
        <Card.Body>
          {m && m.codigos_problematicos.length > 0 ? (
            <ul className="panel-escaneos__lista">
              {m.codigos_problematicos.map((c) => (
                <li key={c.codigo} className="panel-escaneos__fila">
                  <span className="panel-escaneos__codigo">{c.codigo}</span>
                  <span className="panel-escaneos__dato">
                    {c.intentos} intentos ·{" "}
                    {c.personas === 1 ? "1 persona" : `${c.personas} personas`}
                  </span>
                  <span className="panel-escaneos__meta">{formatearFecha(c.ultimo_intento)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Text as="p" size="sm" color="muted">
              Ningún código ha fallado más de una vez. Un fallo suelto es un tropiezo; lo que señala
              una etiqueta rota es que falle una y otra vez.
            </Text>
          )}
        </Card.Body>
      </Card>

      <Card title="Intentos fuera de rol">
        <Card.Body>
          {m && m.denegados_por_usuario.length > 0 ? (
            <ul className="panel-escaneos__lista">
              {m.denegados_por_usuario.map((d) => (
                <li key={d.usuario_id} className="panel-escaneos__fila">
                  <span className="panel-escaneos__codigo">{d.usuario_nombre ?? d.usuario_id}</span>
                  <span className="panel-escaneos__dato">
                    <Badge tone="danger">{d.rol_codigo}</Badge> {d.intentos} intentos
                  </span>
                  <span className="panel-escaneos__meta">{formatearFecha(d.ultimo_intento)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Text as="p" size="sm" color="muted">
              Nadie ha intentado escanear sin permiso en este periodo.
            </Text>
          )}
        </Card.Body>
      </Card>

      <Card title="Actividad por persona">
        <Card.Body>
          {m && m.por_usuario.length > 0 ? (
            <ul className="panel-escaneos__lista">
              {m.por_usuario.map((u) => (
                <li key={u.usuario_id} className="panel-escaneos__fila">
                  <span className="panel-escaneos__codigo">{u.usuario_nombre ?? u.usuario_id}</span>
                  <span className="panel-escaneos__dato">
                    {u.total} lecturas · {u.acierto} % de acierto
                  </span>
                  <span className="panel-escaneos__meta">{u.rol_codigo}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Text as="p" size="sm" color="muted">
              Sin lecturas en este periodo.
            </Text>
          )}
        </Card.Body>
      </Card>

      <Card title="A qué horas se escanea">
        <Card.Body>
          {m ? (
            <div className="chart" role="img" aria-label="Lecturas por hora del día">
              {m.por_hora.map((h) => {
                const maximo = Math.max(...m.por_hora.map((x) => x.total), 1);
                return (
                  <div key={h.hora} className="chart__col">
                    <div
                      className={`chart__bar${h.total === 0 ? " chart__bar--muted" : ""}`}
                      style={{ height: `${Math.round((h.total / maximo) * 100)}%` }}
                      title={`${h.hora}:00 — ${h.total} lecturas`}
                    />
                    <span className="chart__label">{h.hora}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <Card title="Últimas lecturas">
        <Card.Body flush>
          <Table
            columns={columnas}
            rows={eventos.data ?? []}
            rowKey={(e) => e.id}
            loading={eventos.isLoading}
            emptyTitle="Todavía no hay lecturas"
            emptyDescription="Cuando alguien use el escáner, cada lectura quedará registrada aquí."
          />
        </Card.Body>
      </Card>
    </>
  );
}
