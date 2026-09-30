import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useWatch, type Control } from "react-hook-form";
import { useT } from "../../shared/i18n";
import { sugerirLineasSalida } from "../../shared/backend";
import type { Producto } from "../../shared/types";
import { Button, Card, ErrorPanel, Field, FormGrid, Input, Select } from "../../shared/ui";
import { mensajeError } from "../../shared/format";
import type { FormValues } from "./tipos";

export function SugerenciaFifoFefo({
  control,
  productos,
  onSugerido,
}: {
  control: Control<FormValues>;
  productos: Producto[];
  onSugerido: (lineas: FormValues["lineas"]) => void;
}) {
  const t = useT();
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const subTipo = useWatch({ control, name: "sub_tipo" });

  const sugerirMut = useMutation({
    mutationFn: () =>
      sugerirLineasSalida({
        productoId,
        cantidad: Number(cantidad),
        subTipo: subTipo || "CLIENTE",
      }),
    onSuccess: (sugerencias) => {
      setError(null);
      onSugerido(
        sugerencias.map((s) => ({
          producto_id: productoId,
          lote_id: s.lote_id ?? "",
          cantidad: String(s.cantidad),
          origen_ubicacion_id: s.ubicacion_id,
          destino_ubicacion_id: "",
        })),
      );
    },
    onError: (err) => setError(mensajeError(err)),
  });

  return (
    <Card muted className="mb-4">
      <Card.Body>
        <FormGrid columns={2}>
          <Field label={t.movForm.productoADespachar}>
            <Select
              aria-label={t.movForm.productoADespachar}
              placeholder={t.movForm.seleccionaProducto}
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.movForm.cantidadTotal}>
            <Input
              type="number"
              min="0"
              step="1"
              number
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </Field>
        </FormGrid>
        {error ? (
          <ErrorPanel title={t.movForm.errores.noSePudoSugerir} className="mt-2">
            {error}
          </ErrorPanel>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon="filtrar"
          disabled={!productoId || !cantidad || sugerirMut.isPending}
          onClick={() => sugerirMut.mutate()}
        >
          {t.comun.sugerirFifoFefo}
        </Button>
      </Card.Body>
    </Card>
  );
}
