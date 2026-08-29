import { useQuery } from "@tanstack/react-query";
import { listarReglas } from "../shared/backend";
import type { AmbitoRegla, Regla, TipoRegla } from "../shared/types";
import { mensajeError } from "../shared/format";
import { PATH, reglaEditar } from "../app/route-paths";
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

export const AMBITO_LABEL: Record<AmbitoRegla, string> = {
  ALMACEN: "Almacén",
  ZONA: "Zona",
  PASILLO: "Pasillo",
  RACK: "Rack",
  SECCION: "Sección",
  UBICACION: "Ubicación",
};

/** El mismo ámbito con artículo, para que la regla se lea como una frase. */
const AMBITO_CON_ARTICULO: Record<AmbitoRegla, string> = {
  ALMACEN: "el almacén",
  ZONA: "la zona",
  PASILLO: "el pasillo",
  RACK: "el rack",
  SECCION: "la sección",
  UBICACION: "la ubicación",
};

export const TIPO_LABEL: Record<TipoRegla, string> = {
  PESO_MAXIMO: "Peso máximo",
  CANTIDAD_MAXIMA: "Cantidad máxima",
  VOLUMEN_MAXIMO: "Volumen máximo",
  PRODUCTOS_DISTINTOS_MAXIMO: "Productos distintos máximo",
  CATEGORIA_PROHIBIDA: "Categoría prohibida",
  CATEGORIA_EXCLUSIVA: "Categoría exclusiva",
  PRODUCTO_PROHIBIDO: "Producto prohibido",
  REQUIERE_LOTE: "Exige lote",
  PROHIBIR_VENCIDO: "Prohíbe vencidos",
};

export const UNIDAD_TIPO: Partial<Record<TipoRegla, string>> = {
  PESO_MAXIMO: "kg",
  CANTIDAD_MAXIMA: "unidades",
  VOLUMEN_MAXIMO: "unidades de volumen",
  PRODUCTOS_DISTINTOS_MAXIMO: "productos",
};

/**
 * Lee una regla como una frase, que es como la piensa quien la escribe:
 * "En el rack RACK-A1, el peso total no puede pasar de 800 kg."
 */
export function frase(regla: Regla): string {
  const articulo = AMBITO_CON_ARTICULO[regla.ambito];
  const donde = regla.ambito_etiqueta
    ? `En ${articulo} ${regla.ambito_etiqueta}`
    : `En cualquier ${AMBITO_LABEL[regla.ambito].toLowerCase()}`;
  const unidad = UNIDAD_TIPO[regla.tipo] ?? "";
  switch (regla.tipo) {
    case "PESO_MAXIMO":
    case "CANTIDAD_MAXIMA":
    case "VOLUMEN_MAXIMO":
      return `${donde}, no se puede pasar de ${regla.valor_numerico} ${unidad}.`;
    case "PRODUCTOS_DISTINTOS_MAXIMO":
      return `${donde}, no puede haber más de ${regla.valor_numerico} ${unidad} distintos.`;
    case "CATEGORIA_PROHIBIDA":
      return `${donde}, no puede entrar la categoría ${regla.referencia_etiqueta ?? "—"}.`;
    case "CATEGORIA_EXCLUSIVA":
      return `${donde}, solo puede entrar la categoría ${regla.referencia_etiqueta ?? "—"}.`;
    case "PRODUCTO_PROHIBIDO":
      return `${donde}, no puede entrar el producto ${regla.referencia_etiqueta ?? "—"}.`;
    case "REQUIERE_LOTE":
      return `${donde}, nada entra sin lote.`;
    case "PROHIBIR_VENCIDO":
      return `${donde}, no entra mercancía vencida.`;
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
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["reglas"], queryFn: listarReglas });

  const columnas: TableColumn<Regla>[] = [
    { key: "codigo", header: "Código", code: true, render: (r) => r.codigo },
    {
      key: "regla",
      header: "Qué dice",
      render: (r) => (
        <span className="reglas__frase">
          <span className="reglas__nombre">{r.nombre}</span>
          <span className="reglas__detalle">{frase(r)}</span>
        </span>
      ),
    },
    {
      key: "ambito",
      header: "Alcance",
      render: (r) => (
        <>
          {AMBITO_LABEL[r.ambito]}
          {r.ambito_etiqueta ? ` · ${r.ambito_etiqueta}` : " · todas"}
        </>
      ),
    },
    {
      key: "severidad",
      header: "Si se incumple",
      render: (r) => (
        <Badge tone={r.severidad === "BLOQUEA" ? "danger" : "warning"}>
          {r.severidad === "BLOQUEA" ? "No deja pasar" : "Solo avisa"}
        </Badge>
      ),
    },
    {
      key: "activa",
      header: "Estado",
      render: (r) => (
        <Badge tone={r.activa ? "success" : "neutral"}>{r.activa ? "Activa" : "Apagada"}</Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Reglas de negocio"
        description="Restricciones propias de tu operación: topes de peso, límites por pasillo, categorías que no pueden convivir. Se comprueban al aprobar cada movimiento."
        actions={
          <ButtonLink variant="primary" icon="agregar" href={PATH.reglaNueva}>
            Nueva regla
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title="No se pudieron cargar las reglas">
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <Card>
        <Card.Body flush>
          <Table
            columns={columnas}
            rows={query.data ?? []}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(reglaEditar(r.id))}
            loading={query.isLoading}
            emptyTitle="Todavía no hay reglas"
            emptyDescription="Sin reglas, Rustock solo comprueba la capacidad de la ubicación y las restricciones de caja. Una regla añade los límites propios de tu almacén."
            emptyAction={
              <ButtonLink variant="primary" size="sm" icon="agregar" href={PATH.reglaNueva}>
                Escribir la primera
              </ButtonLink>
            }
          />
        </Card.Body>
      </Card>

      <Card title="Cómo se aplican">
        <Card.Body>
          <Text as="p" size="sm" color="muted">
            Una regla del nivel superior alcanza a todo lo que cuelga de él: escrita en una zona,
            protege sus racks y sus ubicaciones sin repetirla. Se evalúa el estado{" "}
            <strong>resultante</strong>, no el actual — la pregunta no es si el rack está por debajo
            del límite, sino si seguiría estándolo después de meter la mercancía.
          </Text>
          <Text as="p" size="sm" color="muted" className="mt-2">
            Una regla que solo avisa deja pasar el movimiento y lo registra. Sirve para estrenar una
            regla sin frenar la operación mientras se comprueba que está bien puesta.
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}
