import { Code, Icon, Text } from "../../shared/ui";

export function DemoTipografia() {
  return (
    <div className="flex flex-col gap-4">
      <Text as="p" size="2xl" weight="bold" color="strong">
        Título de sección grande
      </Text>
      <Text as="p" size="xl" weight="semibold" color="strong">
        Título de página
      </Text>
      <Text as="p" size="lg" weight="semibold" color="strong">
        Subtítulo de panel
      </Text>
      <Text as="p" size="base" color="default">
        Cuerpo principal. Lorem ipsum dolor sit amet consectetur adipiscing elit.
      </Text>
      <Text as="p" size="sm" color="muted">
        Cuerpo secundario y celdas de tabla.
      </Text>
      <Text as="p" size="xs" color="muted">
        Metadatos, labels y códigos de pie.
      </Text>
      <div className="flex flex-wrap items-center gap-6">
        <Code>SKU-1001</Code>
        <Code>ALM-003</Code>
        <Code>LOTE-2026-04</Code>
        <Code>128.50</Code>
      </div>
    </div>
  );
}

export function DemoIconos() {
  const names = [
    "dashboard",
    "movements",
    "entrada",
    "salida",
    "traslado",
    "ajuste",
    "inventario",
    "alerta",
    "stock",
    "producto",
    "caja",
    "lote",
    "almacen",
    "zona",
    "ubicacion",
    "proveedor",
    "cliente",
    "usuario",
    "rol",
    "categoria",
    "uom",
    "comentario",
    "historial",
    "buscar",
    "filtrar",
    "ordenar",
    "ver",
    "editar",
    "eliminar",
    "aprobar",
    "anular",
    "cerrar",
    "exportar",
    "agregar",
    "atras",
    "refrescar",
    "calendario",
    "nota",
    "codigoBarras",
    "configuracion",
    "reportes",
    "cerrarSesion",
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8">
      {names.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center border border-gray-200 bg-white">
            <Icon name={name} size={16} aria-hidden="true" />
          </span>
          <Code size="xs">{name}</Code>
        </div>
      ))}
    </div>
  );
}

export function DemoPaleta() {
  const swatches = [
    ["ink-900", "var(--color-ink-900)"],
    ["ink-700", "var(--color-ink-700)"],
    ["ink-400", "var(--color-ink-400)"],
    ["blue-500", "var(--color-blue-500)"],
    ["blue-600", "var(--color-blue-600)"],
    ["blue-700", "var(--color-blue-700)"],
    ["blue-800", "var(--color-blue-800)"],
    ["blue-900", "var(--color-blue-900)"],
    ["gray-100", "var(--color-gray-100)"],
    ["gray-300", "var(--color-gray-300)"],
    ["gray-500", "var(--color-gray-500)"],
    ["gray-700", "var(--color-gray-700)"],
    ["gray-900", "var(--color-gray-900)"],
    ["success-500", "var(--color-success-500)"],
    ["warning-500", "var(--color-warning-500)"],
    ["danger-500", "var(--color-danger-500)"],
    ["info-500", "var(--color-info-500)"],
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-3">
      {swatches.map(([name, value]) => (
        <div
          key={name}
          className="bg-white"
          style={{ border: "1px solid var(--color-gray-200)", borderRadius: "var(--radius-md)" }}
        >
          <div
            style={{
              height: "3rem",
              backgroundColor: value,
              borderRadius: "var(--radius-md) var(--radius-md) 0 0",
            }}
          />
          <div className="p-2">
            <Code size="xs">{name}</Code>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DemoSombras() {
  const levels = [
    ["shadow-xs", "var(--shadow-xs)"],
    ["shadow-sm", "var(--shadow-sm)"],
    ["shadow-md", "var(--shadow-md)"],
    ["shadow-lg", "var(--shadow-lg)"],
    ["shadow-glow-primary", "var(--shadow-glow-primary)"],
  ] as const;

  return (
    <div
      className="grid grid-cols-3 gap-6"
      style={{
        backgroundColor: "var(--color-gray-100)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
      }}
    >
      {levels.map(([name, value]) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <div
            className="w-full bg-white"
            style={{
              height: "4rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-gray-200)",
              boxShadow: value,
            }}
          />
          <Code size="xs">{name}</Code>
        </div>
      ))}
    </div>
  );
}
