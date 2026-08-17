import { Badge, Icon, type IconName } from "../../shared/ui";

interface Kpi {
  valor: string;
  etiqueta: string;
}

const KPIS_MOCK: Kpi[] = [
  { valor: "4", etiqueta: "SKUs activos" },
  { valor: "13,465", etiqueta: "unidades" },
  { valor: "4", etiqueta: "alertas" },
  { valor: "98.2%", etiqueta: "precisión" },
];

interface FilaMock {
  numero: string;
  icono: IconName;
  tipo: string;
  cantidad: string;
  estado: string;
  estadoTono: "success" | "warning";
}

const MOVIMIENTOS_MOCK: FilaMock[] = [
  {
    numero: "MOV-2026-000001",
    icono: "entrada",
    tipo: "Entrada · Compra",
    cantidad: "+480",
    estado: "Aprobado",
    estadoTono: "success",
  },
  {
    numero: "MOV-2026-000002",
    icono: "salida",
    tipo: "Salida · Cliente",
    cantidad: "-12",
    estado: "Aprobado",
    estadoTono: "success",
  },
  {
    numero: "MOV-2026-000003",
    icono: "traslado",
    tipo: "Traslado · Interno",
    cantidad: "8",
    estado: "Aprobado",
    estadoTono: "success",
  },
  {
    numero: "MOV-2026-000004",
    icono: "ajuste",
    tipo: "Ajuste · Sobrante",
    cantidad: "+5",
    estado: "Pendiente",
    estadoTono: "warning",
  },
];

/**
 * Mockup — maqueta estática de la interfaz del producto (solo presentación visual,
 * no representa datos reales ni enlaza a rutas).
 */
export function Mockup() {
  return (
    <div className="landing__mock">
      <div className="landing__mock-bar">
        <span className="landing__mock-bar-dots" aria-hidden="true">
          <span className="landing__mock-dot landing__mock-dot--rust" />
          <span className="landing__mock-dot" />
          <span className="landing__mock-dot" />
        </span>
        <span className="landing__mock-bar-title">rustock · inventario</span>
        <span className="landing__mock-search">
          <Icon name="buscar" size={12} aria-hidden="true" />
          Buscar
        </span>
      </div>

      <div className="landing__mock-kpis">
        {KPIS_MOCK.map((kpi) => (
          <div key={kpi.etiqueta} className="landing__mock-kpi">
            <span className="landing__mock-kpi-value">{kpi.valor}</span>
            <span className="landing__mock-kpi-label">{kpi.etiqueta}</span>
          </div>
        ))}
      </div>

      <div className="landing__mock-table">
        <div className="landing__mock-row landing__mock-row--head" aria-hidden="true">
          <span>Movimiento</span>
          <span className="landing__mock-tipo">Tipo</span>
          <span className="landing__mock-cantidad">Cantidad</span>
          <span>Estado</span>
        </div>
        {MOVIMIENTOS_MOCK.map((fila) => (
          <div key={fila.numero} className="landing__mock-row">
            <span className="landing__mock-numero">{fila.numero}</span>
            <span className="landing__mock-tipo">
              <Icon
                name={fila.icono}
                size={14}
                className="landing__mock-tipo-icon"
                aria-hidden="true"
              />
              {fila.tipo}
            </span>
            <span className="landing__mock-cantidad">{fila.cantidad}</span>
            <span>
              <Badge tone={fila.estadoTono}>{fila.estado}</Badge>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
