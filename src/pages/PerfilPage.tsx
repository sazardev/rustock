import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cambiarPassword, listarTemas } from "../shared/backend";
import {
  FORMATO_FECHA_LABEL,
  TAMANIO_FUENTE_LABEL,
  ZONA_HORARIA_LABEL,
  ZONAS_HORARIAS,
  type FormatoFecha,
  type TamanioFuente,
} from "../shared/types";
import { usePreferencias } from "../shared/preferencias";
import { useTema } from "../shared/tema";
import { useSession } from "../shared/session";
import { mensajeError } from "../shared/format";
import { itemsDeNav } from "../app/nav";
import {
  Button,
  Card,
  Checkbox,
  DetailList,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Icon,
  Input,
  ModoPicker,
  PageHeader,
  PaletaPicker,
  Select,
  useToast,
} from "../shared/ui";
import type { IconName } from "../shared/ui";

const esquemaPassword = z
  .object({
    password_actual: z.string().min(1, "Ingresa tu contraseña actual"),
    password_nueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmacion: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((v) => v.password_nueva === v.confirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["confirmacion"],
  });

type FormPassword = z.infer<typeof esquemaPassword>;

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  ENCARGADO_ALMACEN: "Encargado de almacén",
  OPERADOR: "Operador",
  LECTOR: "Lector",
};

export function PerfilPage() {
  const usuario = useSession((s) => s.usuario);
  const preferencias = usePreferencias((s) => s.resueltas);
  const guardarPrefs = usePreferencias((s) => s.guardar);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // ---- Orden del sidebar (solo UI; se persiste al guardar preferencias) ----
  const [orden, setOrden] = useState<string[]>(() => {
    if (!preferencias?.orden_sidebar) return itemsDeNav().map(({ item }) => item.href);
    try {
      const parsed: unknown = JSON.parse(preferencias.orden_sidebar);
      if (!Array.isArray(parsed)) {
        return itemsDeNav().map(({ item }) => item.href);
      }
      const actuales = new Set(itemsDeNav().map(({ item }) => item.href));
      const validos = (parsed as string[]).filter((h) => actuales.has(h));
      const faltantes = itemsDeNav()
        .map(({ item }) => item.href)
        .filter((h) => !validos.includes(h));
      return [...validos, ...faltantes];
    } catch {
      return itemsDeNav().map(({ item }) => item.href);
    }
  });

  const grupos = useMemo(() => {
    const items = itemsDeNav();
    const gruposUnicos = [...new Set(items.map(({ grupo }) => grupo))];
    return gruposUnicos.map((titulo) => {
      const hrefsDelGrupo = items.filter((i) => i.grupo === titulo).map(({ item }) => item.href);
      return {
        titulo,
        items: hrefsDelGrupo
          .map((href) => ({
            href,
            orden: orden.indexOf(href) >= 0 ? orden.indexOf(href) : orden.length,
            label: items.find((i) => i.item.href === href)?.item.label ?? href,
            icon:
              items.find((i) => i.item.href === href)?.item.icon ?? ("configuracion" as IconName),
          }))
          .toSorted((a, b) => a.orden - b.orden),
      };
    });
  }, [orden]);

  function moverItem(href: string, delta: -1 | 1) {
    setOrden((actual) => {
      const siguiente = [...actual];
      const a = siguiente.indexOf(href);
      const b = a + delta;
      if (a === -1) {
        siguiente.push(href);
        return siguiente;
      }
      if (b < 0 || b >= siguiente.length) return actual;
      [siguiente[a], siguiente[b]] = [siguiente[b], siguiente[a]];
      return siguiente;
    });
  }

  // ---- Formulario de preferencias ----
  const guardarPrefsMut = useMutation({
    mutationFn: () => {
      const cambios: {
        tamano_fuente?: string;
        orden_sidebar?: string | null;
        zona_horaria?: string | null;
        formato_fecha?: string | null;
        tema_id?: string | null;
        modo_oscuro?: boolean | null;
        ayuda_en_palette?: boolean;
      } = { orden_sidebar: JSON.stringify(orden) };
      const t = (document.getElementById("tamano_fuente") as HTMLSelectElement | null)?.value;
      const z = (document.getElementById("zona_horaria") as HTMLSelectElement | null)?.value;
      const f = (document.getElementById("formato_fecha") as HTMLSelectElement | null)?.value;
      const heredarZ = (document.getElementById("heredar_zona") as HTMLInputElement | null)
        ?.checked;
      const heredarF = (document.getElementById("heredar_formato") as HTMLInputElement | null)
        ?.checked;
      const ayudaPalette = (document.getElementById("ayuda_en_palette") as HTMLInputElement | null)
        ?.checked;
      if (t && t !== preferencias?.tamano_fuente) cambios.tamano_fuente = t;
      if (!heredarZ && z && z !== preferencias?.zona_horaria) cambios.zona_horaria = z;
      if (heredarZ && preferencias?.zona_horaria) cambios.zona_horaria = null;
      if (!heredarF && f && f !== preferencias?.formato_fecha) cambios.formato_fecha = f;
      if (heredarF && preferencias?.formato_fecha) cambios.formato_fecha = null;
      // Ayuda en el command palette: solo se envía si cambió.
      if (ayudaPalette !== undefined && ayudaPalette !== preferencias?.ayuda_en_palette) {
        cambios.ayuda_en_palette = ayudaPalette;
      }
      // Apariencia: null = heredar de la empresa; id/bool = fijar preferencia propia.
      cambios.tema_id = paletaSel;
      cambios.modo_oscuro = modoSel === null ? null : modoSel === "OSCURO";
      return guardarPrefs(cambios);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["preferencias"] });
      const ayudaPalette = (document.getElementById("ayuda_en_palette") as HTMLInputElement | null)
        ?.checked;
      if (ayudaPalette !== undefined && ayudaPalette !== preferencias?.ayuda_en_palette) {
        toast(
          ayudaPalette
            ? "Ayuda activada en la búsqueda rápida: verás sugerencias de guías y glosario en Ctrl+K."
            : "Ayuda desactivada en la búsqueda rápida: las sugerencias de guías y glosario ya no aparecerán en Ctrl+K.",
          "success",
        );
      } else {
        toast("Preferencias guardadas", "success");
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  // ---- Cambio de contraseña ----
  const passwordForm = useForm<FormPassword>({
    resolver: zodResolver(esquemaPassword),
    defaultValues: { password_actual: "", password_nueva: "", confirmacion: "" },
  });
  const cambiarPassMut = useMutation({
    mutationFn: (v: FormPassword) => cambiarPassword(v.password_actual, v.password_nueva),
    onSuccess: () => {
      passwordForm.reset();
      toast("Contraseña actualizada", "success");
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const heredaZona = !preferencias?.zona_horaria || preferencias.zona_horaria === "";
  const heredaFormato = !preferencias?.formato_fecha || preferencias.formato_fecha === "";

  // ---- Apariencia (paleta + modo, con vista previa en vivo) ----
  const temasQuery = useQuery({
    queryKey: ["temas"],
    queryFn: listarTemas,
    staleTime: Infinity,
  });
  const [paletaSel, setPaletaSel] = useState<string | null>(() =>
    preferencias?.tema_heredado ? null : (preferencias?.tema_id ?? null),
  );
  const [modoSel, setModoSel] = useState<"CLARO" | "OSCURO" | null>(() =>
    preferencias?.modo_oscuro_heredado ? null : preferencias?.modo_oscuro ? "OSCURO" : "CLARO",
  );
  useEffect(() => {
    if (!preferencias) return;
    setPaletaSel(preferencias.tema_heredado ? null : preferencias.tema_id);
    setModoSel(
      preferencias.modo_oscuro_heredado ? null : preferencias.modo_oscuro ? "OSCURO" : "CLARO",
    );
  }, [preferencias]);

  function previewTema(paleta: string | null, modo: "CLARO" | "OSCURO" | null) {
    const p = paleta ?? preferencias?.tema_id ?? "rust";
    const m = modo === null ? (preferencias?.modo_oscuro ?? false) : modo === "OSCURO";
    void useTema.getState().previsualizar(p, m);
  }

  return (
    <>
      <PageHeader
        title="Mi perfil"
        description="Tus datos, tus preferencias de presentación y tu contraseña."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Datos">
          <Card.Body>
            <DetailList
              items={[
                { label: "Usuario", value: usuario?.nombre_usuario ?? "—" },
                { label: "Nombre completo", value: usuario?.nombre_completo ?? "—" },
                { label: "Email", value: usuario?.email ?? "—" },
                {
                  label: "Rol",
                  value: ROL_LABEL[usuario?.rol_id ?? ""] ?? "—",
                },
              ]}
            />
          </Card.Body>
        </Card>

        <Card title="Contraseña">
          <Card.Body>
            <p className="mb-4 text-sm text-gray-600">
              La contraseña se usa para iniciar sesión en esta instalación.
            </p>
            <form onSubmit={passwordForm.handleSubmit((v) => cambiarPassMut.mutate(v))} noValidate>
              <FormGrid columns={1}>
                <Field
                  label="Contraseña actual"
                  htmlFor="password_actual"
                  error={passwordForm.formState.errors.password_actual?.message}
                >
                  <Input
                    id="password_actual"
                    type="password"
                    {...passwordForm.register("password_actual")}
                  />
                </Field>
                <Field
                  label="Contraseña nueva"
                  htmlFor="password_nueva"
                  error={passwordForm.formState.errors.password_nueva?.message}
                >
                  <Input
                    id="password_nueva"
                    type="password"
                    {...passwordForm.register("password_nueva")}
                  />
                </Field>
                <Field
                  label="Confirmar contraseña nueva"
                  htmlFor="confirmacion"
                  error={passwordForm.formState.errors.confirmacion?.message}
                >
                  <Input
                    id="confirmacion"
                    type="password"
                    {...passwordForm.register("confirmacion")}
                  />
                </Field>
              </FormGrid>
              <FormActions>
                <Button type="submit" variant="primary" disabled={cambiarPassMut.isPending}>
                  {cambiarPassMut.isPending ? "Cambiando…" : "Cambiar contraseña"}
                </Button>
              </FormActions>
            </form>
          </Card.Body>
        </Card>
      </div>

      <Card title="Preferencias" className="mt-6">
        <Card.Body>
          {error ? (
            <ErrorPanel title="No se pudieron guardar las preferencias" className="mb-4">
              {error}
            </ErrorPanel>
          ) : null}
          <FormGrid columns={2}>
            <Field label="Tamaño de fuente" htmlFor="tamano_fuente" help="Escala toda la interfaz.">
              <Select
                id="tamano_fuente"
                defaultValue={preferencias?.tamano_fuente ?? "MEDIA"}
                options={(Object.keys(TAMANIO_FUENTE_LABEL) as TamanioFuente[]).map((k) => ({
                  value: k,
                  label: TAMANIO_FUENTE_LABEL[k],
                }))}
              />
            </Field>
            <Field label="Zona horaria" htmlFor="zona_horaria" help="Fechas y horas en reportes.">
              <Select
                id="zona_horaria"
                defaultValue={preferencias?.zona_horaria ?? ""}
                options={[
                  { value: "", label: "Heredar de la empresa" },
                  ...ZONAS_HORARIAS.map((z) => ({
                    value: z,
                    label: ZONA_HORARIA_LABEL[z] ?? z,
                  })),
                ]}
              />
            </Field>
            <Field label="Formato de fecha" htmlFor="formato_fecha">
              <Select
                id="formato_fecha"
                defaultValue={preferencias?.formato_fecha ?? ""}
                options={[
                  { value: "", label: "Heredar de la empresa" },
                  ...(Object.keys(FORMATO_FECHA_LABEL) as FormatoFecha[]).map((k) => ({
                    value: k,
                    label: FORMATO_FECHA_LABEL[k],
                  })),
                ]}
              />
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Checkbox
              id="ayuda_en_palette"
              defaultChecked={preferencias?.ayuda_en_palette ?? true}
              label="Mostrar sugerencias de Ayuda en la búsqueda rápida (Ctrl+K)"
            />
            <p className="mt-1 text-xs text-gray-500">
              Incluye guías de módulos, procesos del negocio y términos del glosario en los
              resultados del command palette, para aprender mientras trabajas.
            </p>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            {heredaZona
              ? "Zona horaria: se usa la de la empresa."
              : "Zona horaria propia definida."}{" "}
            {heredaFormato
              ? "Formato de fecha: se usa el de la empresa."
              : "Formato de fecha propio definido."}
          </p>
        </Card.Body>
      </Card>

      <Card title="Apariencia" className="mt-6">
        <Card.Body>
          <p className="mb-4 text-sm text-gray-600">
            Elige la paleta de colores y el modo claro u oscuro. La vista previa se aplica al
            instante; el cambio se guarda con el botón de abajo.
          </p>
          <FormGrid columns={1}>
            <Field
              label="Paleta de colores"
              htmlFor="paleta"
              help={paletaSel === null ? "Se usa la paleta elegida por la empresa." : undefined}
            >
              <PaletaPicker
                temas={temasQuery.data ?? []}
                seleccionado={paletaSel}
                onSeleccionar={(id) => {
                  setPaletaSel(id);
                  previewTema(id, modoSel);
                }}
                heredar
                onHeredar={() => {
                  setPaletaSel(null);
                  previewTema(null, modoSel);
                }}
                ariaLabel="Paleta de colores de la interfaz"
              />
            </Field>
            <Field
              label="Modo de color"
              htmlFor="modo"
              help={modoSel === null ? "Se usa el modo elegido por la empresa." : undefined}
            >
              <ModoPicker
                seleccionado={modoSel}
                onSeleccionar={(m) => {
                  setModoSel(m);
                  previewTema(paletaSel, m);
                }}
                heredar
                onHeredar={() => {
                  setModoSel(null);
                  previewTema(paletaSel, null);
                }}
                ariaLabel="Modo de color de la interfaz"
              />
            </Field>
          </FormGrid>
        </Card.Body>
      </Card>

      <Card title="Orden del panel lateral" className="mt-6">
        <Card.Body>
          <p className="mb-4 text-sm text-gray-600">
            Arrastra con las flechas la posición de cada sección dentro de su grupo. El cambio se
            aplica al guardar.
          </p>
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">{grupo.titulo}</h3>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {grupo.items.map((item, idx, arr) => (
                  <li key={item.href} className="flex items-center gap-3 px-4 py-2">
                    <Icon name={item.icon} size={16} aria-hidden="true" />
                    <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Subir ${item.label}`}
                      disabled={idx === 0}
                      onClick={() => moverItem(item.href, -1)}
                    >
                      <Icon name="subir" size={14} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Bajar ${item.label}`}
                      disabled={idx === arr.length - 1}
                      onClick={() => moverItem(item.href, 1)}
                    >
                      <Icon name="bajar" size={14} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <FormActions>
            <Button
              type="button"
              variant="primary"
              disabled={guardarPrefsMut.isPending}
              onClick={() => guardarPrefsMut.mutate()}
            >
              {guardarPrefsMut.isPending ? "Guardando…" : "Guardar preferencias"}
            </Button>
          </FormActions>
        </Card.Body>
      </Card>
    </>
  );
}
