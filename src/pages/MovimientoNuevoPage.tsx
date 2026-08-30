import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { listarLineasMovimiento, obtenerMovimiento } from "../shared/backend";
import { esPaginado, type TipoMovimiento } from "../shared/types";
import { Button, Card, Icon, PageHeader } from "../shared/ui";
import { MovimientoGenericoForm, TIPOS, TrasladoForm } from "./movimiento-form";
import { useT } from "../shared/i18n";

function tipoValido(valor: string | null): TipoMovimiento | null {
  return TIPOS.some((t) => t.value === valor) ? (valor as TipoMovimiento) : null;
}

export function MovimientoNuevoPage() {
  const t = useT();
  // El tipo vive en la URL (?tipo=...) para que el flujo de creación rápida
  // (volver con un registro recién creado) conserve el contexto del movimiento.
  const [searchParams, setSearchParams] = useSearchParams();
  const tipoEnUrl = tipoValido(searchParams.get("tipo"));
  const [tipo, setTipo] = useState<TipoMovimiento>(tipoEnUrl ?? "ENTRADA");

  // Sincronizar con cambios externos de la URL (atrás/adelante del navegador,
  // Deep-link): El formulario se re-monta limpio (key={tipo}) para no arrastrar
  // Datos de un tipo a otro.
  useEffect(() => {
    if (tipoEnUrl && tipoEnUrl !== tipo) setTipo(tipoEnUrl);
    // `tipo` deliberadamente fuera: solo reacciona a la URL, nunca a sí mismo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoEnUrl]);
  // Duplicar (?duplicarDe=<id>): Precarga los datos de un movimiento origen
  // Para crear uno nuevo a partir de él.
  const duplicarDe = searchParams.get("duplicarDe");
  const origenMovQuery = useQuery({
    queryKey: ["movimiento", duplicarDe],
    queryFn: () => obtenerMovimiento(duplicarDe as string),
    enabled: Boolean(duplicarDe),
  });
  const origenLineasQuery = useQuery({
    queryKey: ["movimiento-lineas", duplicarDe],
    queryFn: () => listarLineasMovimiento(duplicarDe as string, { page_size: -1 }),
    enabled: Boolean(duplicarDe),
  });
  const origenMov = duplicarDe ? (origenMovQuery.data ?? undefined) : undefined;
  const origenLineas =
    duplicarDe && origenLineasQuery.data && esPaginado(origenLineasQuery.data)
      ? origenLineasQuery.data.data
      : [];
  const cargandoOrigen = Boolean(duplicarDe) && origenMovQuery.isLoading;

  function cambiarTipo(nuevo: TipoMovimiento) {
    setTipo(nuevo);
    setSearchParams({ tipo: nuevo });
  }

  return (
    <>
      <PageHeader
        title={
          duplicarDe
            ? `Duplicar movimiento — ${origenMov?.numero ?? ""}`
            : t.movimientoAcciones.nuevoTitulo
        }
        description={
          duplicarDe ? t.movimientoAcciones.duplicarDesc : t.movimientoAcciones.nuevoDesc
        }
      />

      <Card title={t.movimientoAcciones.tipoDeMovimiento} className="mb-6">
        <Card.Body>
          <div className="flex gap-2">
            {TIPOS.map((t) => (
              <Button
                key={t.value}
                type="button"
                variant={tipo === t.value ? "primary" : "secondary"}
                onClick={() => cambiarTipo(t.value)}
                disabled={Boolean(duplicarDe)}
              >
                <Icon name={t.value === "TRASLADO" ? "traslado" : "movements"} aria-hidden="true" />
                {t.label}
              </Button>
            ))}
          </div>
        </Card.Body>
      </Card>

      {cargandoOrigen ? (
        <Card title={t.movimientoAcciones.cargandoOrigen} className="mb-6">
          <Card.Body>Precargando los datos para duplicar.</Card.Body>
        </Card>
      ) : tipo === "TRASLADO" ? (
        <TrasladoForm movimientoInicial={origenMov} lineaInicial={origenLineas[0]} />
      ) : (
        <MovimientoGenericoForm
          key={tipo}
          tipo={tipo}
          movimientoInicial={origenMov}
          lineasIniciales={origenLineas}
        />
      )}
    </>
  );
}
