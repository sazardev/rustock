import { useMemo, useState } from "react";
import { useT } from "../../shared/i18n";
import type { LineaMovimiento, Movimiento } from "../../shared/types";
import {
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "../../shared/ui";
import { catalogoNuevo, movimientoEditar, PATH } from "../../app/route-paths";
import { CrearRapido } from "../../shared/creacion-rapida";
import { useCatalogosBasicos } from "./useCatalogosBasicos";
import { useOfrecerAprobar } from "./useOfrecerAprobar";
import { useTrasladoFormulario } from "./useTrasladoFormulario";
import { useGuardarTraslado } from "./useGuardarTraslado";
import { LoteSelect } from "./LoteSelect";
import { CampoConCrear } from "./CampoConCrear";
import { AprobarAlCrear } from "./AprobarAlCrear";

export function TrasladoForm({
  movimiento,
  movimientoInicial,
  linea,
  lineaInicial,
}: {
  /** En modo edición: el TRASLADO ya existe y se actualizan sus campos. */
  movimiento?: Movimiento;
  /** En modo duplicar: se precargan los datos de un traslado origen. */
  movimientoInicial?: Movimiento;
  linea?: LineaMovimiento;
  lineaInicial?: LineaMovimiento;
}) {
  const t = useT();
  const { productos, ubicaciones } = useCatalogosBasicos();
  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const esEdicion = Boolean(movimiento);
  const ofrecerAprobar = useOfrecerAprobar();
  const [aprobarAlCrear, setAprobarAlCrear] = useState(false);

  const { register, handleSubmit, productoId, descartar } = useTrasladoFormulario({
    origenMov: movimiento ?? movimientoInicial,
    origenLinea: linea ?? lineaInicial,
    esEdicion,
  });
  const producto = productosPorId.get(productoId);
  const { error, setError, guardarMut } = useGuardarTraslado({
    movimiento,
    aprobarAlCrear,
    descartar,
  });

  return (
    <form
      onSubmit={handleSubmit((valores) => {
        setError(null);
        if (producto?.controla_lote && !valores.lote_id) {
          setError(`El producto ${producto.sku} controla lote: selecciona un lote.`);
          return;
        }
        if (valores.origen_ubicacion_id === valores.destino_ubicacion_id) {
          setError(t.movForm.errores.mismaUbicacion);
          return;
        }
        guardarMut.mutate(valores);
      })}
      noValidate
    >
      <Card title={t.dominio.tipoMovimiento.TRASLADO}>
        <Card.Body>
          {error ? (
            <ErrorPanel
              title={
                esEdicion
                  ? t.movForm.errores.noSePudoGuardarTraslado
                  : t.movForm.errores.noSePudoCrearTraslado
              }
              className="mb-4"
            >
              {error}
            </ErrorPanel>
          ) : null}
          <FormGrid columns={2}>
            <Field label={t.campos.producto} required>
              <CampoConCrear
                crear={
                  esEdicion ? null : (
                    <CrearRapido campo="producto_id" rutaNueva={catalogoNuevo("productos")}>
                      {t.comun.nuevoProducto}
                    </CrearRapido>
                  )
                }
              >
                <Select
                  {...register("producto_id")}
                  aria-label={t.campos.producto}
                  placeholder={t.movForm.selecciona}
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.nombre}
                    </option>
                  ))}
                </Select>
              </CampoConCrear>
            </Field>
            {producto?.controla_lote ? (
              <Field label={t.campos.lote} required>
                <CampoConCrear
                  crear={
                    esEdicion ? null : (
                      <CrearRapido campo="lote_id" rutaNueva={catalogoNuevo("lotes")}>
                        {t.comun.nuevoLote}
                      </CrearRapido>
                    )
                  }
                >
                  <LoteSelect productoId={productoId} {...register("lote_id")} />
                </CampoConCrear>
              </Field>
            ) : null}
            <Field label={t.comun.cantidad} required>
              <Input {...register("cantidad")} type="number" min="0" step="1" number />
            </Field>
            <Field label={t.movForm.documentoReferencia}>
              <Input {...register("documento_referencia")} />
            </Field>
            <Field label={t.movForm.ubicacionOrigen} required>
              <CampoConCrear
                crear={
                  esEdicion ? null : (
                    <CrearRapido
                      campo="origen_ubicacion_id"
                      rutaNueva={catalogoNuevo("ubicaciones")}
                    >
                      {t.comun.nuevaUbicacion}
                    </CrearRapido>
                  )
                }
              >
                <Select
                  {...register("origen_ubicacion_id")}
                  aria-label={t.movForm.ubicacionOrigen}
                  placeholder={t.movForm.selecciona}
                >
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo}
                    </option>
                  ))}
                </Select>
              </CampoConCrear>
            </Field>
            <Field label={t.movForm.ubicacionDestino} required>
              <CampoConCrear
                crear={
                  esEdicion ? null : (
                    <CrearRapido
                      campo="destino_ubicacion_id"
                      rutaNueva={catalogoNuevo("ubicaciones")}
                    >
                      {t.comun.nuevaUbicacion}
                    </CrearRapido>
                  )
                }
              >
                <Select
                  {...register("destino_ubicacion_id")}
                  aria-label={t.movForm.ubicacionDestino}
                  placeholder={t.movForm.selecciona}
                >
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo}
                    </option>
                  ))}
                </Select>
              </CampoConCrear>
            </Field>
          </FormGrid>
          <Field label={t.comun.notas}>
            <Textarea {...register("notas")} rows={2} />
          </Field>
        </Card.Body>
      </Card>
      {ofrecerAprobar ? (
        <AprobarAlCrear
          id="aprobar-traslado"
          esEdicion={esEdicion}
          checked={aprobarAlCrear}
          onChange={setAprobarAlCrear}
          leyenda="La política de la empresa no exige aprobación: el traslado se aprobará al guardar."
        />
      ) : null}
      <FormActions>
        <Button type="submit" variant="primary" disabled={guardarMut.isPending}>
          {guardarMut.isPending
            ? t.comun.guardando
            : esEdicion
              ? t.movForm.guardarCambios
              : t.movForm.crearTraslado}
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
