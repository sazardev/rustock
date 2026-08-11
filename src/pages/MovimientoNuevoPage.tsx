import { useState } from "react";
import type { TipoMovimiento } from "../shared/types";
import { Button, Card, Icon, PageHeader } from "../shared/ui";
import { MovimientoGenericoForm, TIPOS, TrasladoForm } from "./movimiento-form";

export function MovimientoNuevoPage() {
  const [tipo, setTipo] = useState<TipoMovimiento>("ENTRADA");

  return (
    <>
      <PageHeader
        title="Nuevo movimiento"
        description="Registra una entrada, salida, traslado o ajuste de inventario."
      />

      <Card title="Tipo de movimiento" className="mb-6">
        <Card.Body>
          <div className="flex gap-2">
            {TIPOS.map((t) => (
              <Button
                key={t.value}
                type="button"
                variant={tipo === t.value ? "primary" : "secondary"}
                onClick={() => setTipo(t.value)}
              >
                <Icon name={t.value === "TRASLADO" ? "traslado" : "movements"} aria-hidden="true" />
                {t.label}
              </Button>
            ))}
          </div>
        </Card.Body>
      </Card>

      {tipo === "TRASLADO" ? <TrasladoForm /> : <MovimientoGenericoForm key={tipo} tipo={tipo} />}
    </>
  );
}
