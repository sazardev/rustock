import type { UseFormRegister } from "react-hook-form";
import { useT } from "../../shared/i18n";
import type { Cliente, Proveedor, SubTipoMovimiento, TipoMovimiento } from "../../shared/types";
import { Card, Field, FormGrid, Input, Select, Textarea } from "../../shared/ui";
import { catalogoNuevo } from "../../app/route-paths";
import { CrearRapido } from "../../shared/creacion-rapida";
import { REQUIERE_CLIENTE, REQUIERE_MOTIVO, REQUIERE_PROVEEDOR, subTiposDe } from "./reglas";
import type { FormValues } from "./tipos";
import { CampoConCrear } from "./CampoConCrear";

/** Tarjeta "Datos del movimiento": sub-tipo, referencia, tercero, fecha, motivo y notas. */
export function CabeceraMovimiento({
  register,
  tipo,
  subTipo,
  esEdicion,
  proveedores,
  clientes,
}: {
  register: UseFormRegister<FormValues>;
  tipo: TipoMovimiento;
  subTipo: SubTipoMovimiento | "";
  esEdicion: boolean;
  proveedores: Proveedor[];
  clientes: Cliente[];
}) {
  const t = useT();
  const subTipoOpciones = subTiposDe(t, tipo);

  return (
    <Card title={t.movForm.datosDelMovimiento}>
      <Card.Body>
        <FormGrid columns={2}>
          <Field label={t.movForm.subTipo} required>
            <Select
              {...register("sub_tipo")}
              aria-label={t.movForm.subTipo}
              placeholder={t.movForm.selecciona}
              disabled={esEdicion}
            >
              {subTipoOpciones.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.movForm.documentoReferencia}>
            <Input
              {...register("documento_referencia")}
              placeholder={t.movForm.documentoMarcador}
            />
          </Field>

          {REQUIERE_PROVEEDOR.includes(subTipo as SubTipoMovimiento) ? (
            <Field label={t.catalogos.proveedorSingular}>
              <CampoConCrear
                crear={
                  esEdicion ? null : (
                    <CrearRapido campo="proveedor_id" rutaNueva={catalogoNuevo("proveedores")}>
                      {t.comun.nuevoProveedor}
                    </CrearRapido>
                  )
                }
              >
                <Select
                  {...register("proveedor_id")}
                  aria-label={t.catalogos.proveedorSingular}
                  placeholder={t.movForm.selecciona}
                >
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </CampoConCrear>
            </Field>
          ) : null}

          {REQUIERE_CLIENTE.includes(subTipo as SubTipoMovimiento) ? (
            <Field label={t.catalogos.clienteSingular}>
              <CampoConCrear
                crear={
                  esEdicion ? null : (
                    <CrearRapido campo="cliente_id" rutaNueva={catalogoNuevo("clientes")}>
                      {t.comun.nuevoCliente}
                    </CrearRapido>
                  )
                }
              >
                <Select
                  {...register("cliente_id")}
                  aria-label={t.catalogos.clienteSingular}
                  placeholder={t.movForm.selecciona}
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </CampoConCrear>
            </Field>
          ) : null}

          <Field label={t.movForm.fechaDelMovimiento}>
            <Input {...register("fecha_movimiento")} type="datetime-local" />
          </Field>

          <Field
            label={t.movForm.motivo}
            required={REQUIERE_MOTIVO.includes(subTipo as SubTipoMovimiento)}
          >
            <Input {...register("motivo")} placeholder={t.movForm.motivoDeLaOperacion} />
          </Field>
        </FormGrid>
        <Field label={t.comun.notas}>
          <Textarea {...register("notas")} rows={2} />
        </Field>
      </Card.Body>
    </Card>
  );
}
