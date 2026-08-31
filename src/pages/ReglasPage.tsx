import { useQuery } from "@tanstack/react-query";
import { listarReglas } from "../shared/backend";
import type { Regla } from "../shared/types";
import { mensajeError } from "../shared/format";
import { PATH, reglaEditar } from "../app/route-paths";
import { usePuede } from "../shared/session";
import { useT, type Diccionario } from "../shared/i18n";
import { useNavigate } from "react-router";
import {
  Badge,
  ButtonLink,
  Card,
  ErrorPanel,
  PageHeader,
  Table,
  Text,
  type TableColumn,
} from "../shared/ui";

/**
 * Lee una regla como una frase, que es como la piensa quien la escribe:
 * "En el rack RACK-A1, el peso total no puede pasar de 800 kg."
 */
export function frase(regla: Regla, t: Diccionario): string {
  const articulo = t.reglas.ambitosConArticulo[regla.ambito];
  const donde = regla.ambito_etiqueta
    ? t.reglas.frases.en({ ambito: articulo, elemento: regla.ambito_etiqueta })
    : t.reglas.frases.enCualquiera({ ambito: t.reglas.ambitos[regla.ambito].toLowerCase() });
  const unidad = t.reglas.unidades[regla.tipo as keyof typeof t.reglas.unidades] ?? "";
  switch (regla.tipo) {
    case "PESO_MAXIMO":
    case "CANTIDAD_MAXIMA":
    case "VOLUMEN_MAXIMO":
      return t.reglas.frases.tope({ donde, valor: regla.valor_numerico ?? 0, unidad });
    case "PRODUCTOS_DISTINTOS_MAXIMO":
      return t.reglas.frases.distintos({ donde, valor: regla.valor_numerico ?? 0, unidad });
    case "CATEGORIA_PROHIBIDA":
      return t.reglas.frases.categoriaProhibida({
        donde,
        ref: regla.referencia_etiqueta ?? "—",
      });
    case "CATEGORIA_EXCLUSIVA":
      return t.reglas.frases.categoriaExclusiva({
        donde,
        ref: regla.referencia_etiqueta ?? "—",
      });
    case "PRODUCTO_PROHIBIDO":
      return t.reglas.frases.productoProhibido({ donde, ref: regla.referencia_etiqueta ?? "—" });
    case "REQUIERE_LOTE":
      return t.reglas.frases.requiereLote({ donde });
    case "PROHIBIR_VENCIDO":
      return t.reglas.frases.prohibirVencido({ donde });
  }
}

/**
 * Reglas de negocio (SPEC §16).
 *
 * Cada cliente tiene restricciones que no caben en el modelo general: un rack
 * que no aguanta 800 kg, un pasillo donde no entra química. Aquí se escriben
 * sin tocar código, y el sistema las hace cumplir al aprobar cada movimiento.
 */
export function ReglasPage() {
  const t = useT();
  const puedeCrear = usePuede("regla", "crear");
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["reglas"], queryFn: listarReglas });

  const columnas: TableColumn<Regla>[] = [
    { key: "codigo", header: t.campos.codigo, code: true, render: (r) => r.codigo },
    {
      key: "regla",
      header: t.reglas.queDice,
      render: (r) => (
        <span className="reglas__frase">
          <span className="reglas__nombre">{r.nombre}</span>
          <span className="reglas__detalle">{frase(r, t)}</span>
        </span>
      ),
    },
    {
      key: "ambito",
      header: t.reglas.alcance,
      render: (r) => (
        <>
          {t.reglas.ambitos[r.ambito]}
          {r.ambito_etiqueta ? ` · ${r.ambito_etiqueta}` : ` · ${t.reglas.todas}`}
        </>
      ),
    },
    {
      key: "severidad",
      header: t.reglas.siSeIncumple,
      render: (r) => (
        <Badge tone={r.severidad === "BLOQUEA" ? "danger" : "warning"}>
          {r.severidad === "BLOQUEA" ? t.reglas.noDejaPasar : t.reglas.soloAvisa}
        </Badge>
      ),
    },
    {
      key: "activa",
      header: t.comun.estado,
      render: (r) => (
        <Badge tone={r.activa ? "success" : "neutral"}>
          {r.activa ? t.reglas.activa : t.reglas.apagada}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.reglas.titulo}
        description={t.reglas.descripcion}
        actions={
          <ButtonLink variant="primary" icon="agregar" href={PATH.reglaNueva}>
            {t.reglas.nueva}
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title={t.reglas.noSePudoCargar}>{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <Card>
        <Card.Body flush>
          <Table
            columns={columnas}
            rows={query.data ?? []}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(reglaEditar(r.id))}
            loading={query.isLoading}
            emptyTitle={t.reglas.sinReglas}
            emptyDescription={t.reglas.sinReglasDesc}
            emptyAction={
              puedeCrear ? (
                <ButtonLink variant="primary" size="sm" icon="agregar" href={PATH.reglaNueva}>
                  {t.reglas.escribirPrimera}
                </ButtonLink>
              ) : undefined
            }
          />
        </Card.Body>
      </Card>

      <Card title={t.reglas.comoSeAplican}>
        <Card.Body>
          <Text as="p" size="sm" color="muted">
            {t.reglas.comoSeAplicanUno}
          </Text>
          <Text as="p" size="sm" color="muted" className="mt-2">
            {t.reglas.comoSeAplicanDos}
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}
