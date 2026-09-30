import { useMemo, useState } from "react";
import { useT } from "../../shared/i18n";
import type { LineaMovimiento, Movimiento, TipoMovimiento } from "../../shared/types";
import { Button, ButtonLink, FormActions } from "../../shared/ui";
import { movimientoEditar, PATH } from "../../app/route-paths";
import { useCatalogosBasicos } from "./useCatalogosBasicos";
import { useOfrecerAprobar } from "./useOfrecerAprobar";
import { useMovimientoFormulario } from "./useMovimientoFormulario";
import { useGuardarMovimiento } from "./useGuardarMovimiento";
import { CabeceraMovimiento } from "./CabeceraMovimiento";
import { LineasMovimiento } from "./LineasMovimiento";
import { SugerenciaFifoFefo } from "./SugerenciaFifoFefo";
import { AprobarAlCrear } from "./AprobarAlCrear";

export function MovimientoGenericoForm({
  tipo,
  movimiento,
  movimientoInicial,
  lineasIniciales = [],
}: {
  tipo: TipoMovimiento;
  /** En modo edición (SPEC §6.2): el movimiento ya existe en BORRADOR o
   *  PENDIENTE_APROBACION y se actualizan sus campos operativos y líneas. */
  movimiento?: Movimiento;
  /** En modo duplicar: se precargan los datos de un movimiento origen para
   *  crear uno nuevo (sin pasar por edición). */
  movimientoInicial?: Movimiento;
  lineasIniciales?: LineaMovimiento[];
}) {
  const t = useT();
  const { productos, ubicaciones, proveedores, clientes } = useCatalogosBasicos();
  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const esEdicion = Boolean(movimiento);
  const ofrecerAprobar = useOfrecerAprobar();
  const [aprobarAlCrear, setAprobarAlCrear] = useState(false);

  const { control, register, handleSubmit, fields, append, remove, replace, subTipo, descartar } =
    useMovimientoFormulario({
      origen: movimiento ?? movimientoInicial,
      lineasIniciales,
      esEdicion,
    });
  const { error, guardarMut, onSubmit } = useGuardarMovimiento({
    tipo,
    movimiento,
    productosPorId,
    aprobarAlCrear,
    descartar,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <CabeceraMovimiento
        register={register}
        tipo={tipo}
        subTipo={subTipo}
        esEdicion={esEdicion}
        proveedores={proveedores}
        clientes={clientes}
      />

      {tipo === "SALIDA" ? (
        <SugerenciaFifoFefo control={control} productos={productos} onSugerido={replace} />
      ) : null}

      <LineasMovimiento
        control={control}
        fields={fields}
        tipo={tipo}
        subTipo={subTipo}
        productos={productos}
        ubicaciones={ubicaciones}
        esEdicion={esEdicion}
        error={error}
        onAdd={append}
        onRemove={remove}
      />

      {ofrecerAprobar ? (
        <AprobarAlCrear
          id="aprobar-al-crear"
          esEdicion={esEdicion}
          checked={aprobarAlCrear}
          onChange={setAprobarAlCrear}
          leyenda="La política de la empresa no exige aprobación: el movimiento se aprobará al guardar."
        />
      ) : null}

      <FormActions>
        <Button type="submit" variant="primary" disabled={guardarMut.isPending}>
          {guardarMut.isPending
            ? t.comun.guardando
            : esEdicion
              ? t.movForm.guardarCambios
              : t.movForm.crearMovimiento}
        </Button>
        <ButtonLink
          variant="secondary"
          href={esEdicion ? movimientoEditar(movimiento!.id) : PATH.movimientos}
        >
          {t.comun.cancelar}
        </ButtonLink>
      </FormActions>
    </form>
  );
}
