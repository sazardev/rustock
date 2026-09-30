import { useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Field,
  FilterBar,
  FilterChip,
  FilterChips,
  FilterField,
  Icon,
  Input,
  Radio,
  Search,
  Select,
  Textarea,
  useToast,
} from "../../shared/ui";
import { useT } from "../../shared/i18n";

export function DemoBotones() {
  const t = useT();
  const { toast } = useToast();
  const demo = (msg: string) => () => toast(`Acción de ejemplo: ${msg}`, "default");

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary" onClick={demo("Primario")}>
        {t.comun.primario}
      </Button>
      <Button variant="secondary" onClick={demo("Secundario")}>
        {t.comun.secundario}
      </Button>
      <Button variant="danger" onClick={demo("Peligro")}>
        {t.comun.peligro}
      </Button>
      <Button variant="ghost" onClick={demo("Fantasma")}>
        {t.comun.fantasma}
      </Button>
      <Button variant="link" onClick={demo("Enlace")}>
        Enlace
      </Button>
      <Button variant="primary" size="sm" onClick={demo("Compacto")}>
        Compacto
      </Button>
      <Button variant="primary" size="lg" onClick={demo("Grande")}>
        Grande
      </Button>
      <Button variant="primary" icon="agregar" onClick={demo(t.galeria.conIcono)}>
        Con icono
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t.galeria.accionConIcono}
        onClick={demo("Icono")}
      >
        <Icon name="ver" size={16} aria-hidden="true" />
      </Button>
      <Button variant="secondary" disabled>
        {t.comun.deshabilitado}
      </Button>
      <ButtonLink variant="primary" href="/galeria#botones">
        {t.comun.enlaceBoton}
      </ButtonLink>
    </div>
  );
}

export function DemoBadges() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Badge tone="success" icon="aprobar">
        Aprobado
      </Badge>
      <Badge tone="warning" icon="alerta">
        Pendiente
      </Badge>
      <Badge tone="danger" icon="anular">
        Anulado
      </Badge>
      <Badge tone="info" icon="alerta">
        Información
      </Badge>
      <Badge tone="neutral">Borrador</Badge>
      <Badge tone="success">Entrada</Badge>
      <Badge tone="danger">Salida</Badge>
      <Badge tone="warning">Stock bajo</Badge>
      <Badge tone="warning">Vence pronto</Badge>
    </div>
  );
}

export function DemoCampos() {
  const t = useT();
  const [checked, setChecked] = useState(false);
  const [radio, setRadio] = useState("a");

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Field label={t.galeria.nombreAlmacen} required htmlFor="demo-nombre">
        <Input id="demo-nombre" placeholder="Almacén Central" />
      </Field>
      <Field label={t.comun.codigo} help={t.galeria.codigoUnico} htmlFor="demo-codigo">
        <Input id="demo-codigo" code placeholder="ALM-###" />
      </Field>
      <Field label={t.comun.cantidad} htmlFor="demo-cantidad">
        <Input id="demo-cantidad" number placeholder="0" />
      </Field>
      <Field label={t.comun.estado} htmlFor="demo-estado">
        <Select id="demo-estado" placeholder={t.galeria.seleccioneEstado}>
          <option value="activo">Activo</option>
          <option value="mantenimiento">Mantenimiento</option>
        </Select>
      </Field>
      <Field
        label={t.galeria.cantidadConError}
        error={t.galeria.valorMayorQueCero}
        htmlFor="demo-error"
      >
        <Input id="demo-error" number defaultValue="0" aria-invalid="true" />
      </Field>
      <Field label={t.campos.observaciones} htmlFor="demo-notas">
        <Textarea id="demo-notas" placeholder={t.galeria.notasInternas} />
      </Field>
      <div className="flex flex-wrap items-center gap-6">
        <label className="checkbox">
          <input
            type="checkbox"
            className="checkbox__input"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="checkbox__label">Recibir alertas de stock</span>
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <Radio
            name="demo-radio"
            label="Opción A"
            checked={radio === "a"}
            onChange={() => setRadio("a")}
          />
          <Radio
            name="demo-radio"
            label="Opción B"
            checked={radio === "b"}
            onChange={() => setRadio("b")}
          />
        </div>
      </div>
    </div>
  );
}

export function DemoFiltros() {
  const t = useT();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [zona, setZona] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        action={
          <Button
            variant="secondary"
            onClick={() => toast(`Filtros aplicados${query ? ` para "${query}"` : ""}`, "default")}
          >
            Aplicar
          </Button>
        }
      >
        <FilterField grow>
          <Field label={t.comun.buscar}>
            <Input
              aria-label={t.comun.buscar}
              placeholder={t.galeria.codigoONombre}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </FilterField>
        <FilterField>
          <Field label={t.campos.zona}>
            <Select
              aria-label={t.campos.zona}
              value={zona}
              onChange={(e) => setZona(e.target.value)}
            >
              <option value="">Todas las zonas</option>
              <option value="norte">Zona Norte</option>
              <option value="sur">Zona Sur</option>
            </Select>
          </Field>
        </FilterField>
      </FilterBar>
      <FilterChips>
        {query ? <FilterChip label={`q: ${query}`} onRemove={() => setQuery("")} /> : null}
        {zona ? (
          <FilterChip
            label={`zona: ${zona === "norte" ? "Zona Norte" : "Zona Sur"}`}
            onRemove={() => setZona("")}
          />
        ) : null}
      </FilterChips>
      <div className="w-full max-w-md">
        <Field label={t.galeria.busquedaGlobal}>
          <Search placeholder={t.shell.buscarGlobal} aria-label={t.galeria.busquedaGlobal} />
        </Field>
      </div>
    </div>
  );
}
