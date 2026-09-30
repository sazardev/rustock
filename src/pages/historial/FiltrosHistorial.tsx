import type { ReactNode } from "react";
import { useT } from "../../shared/i18n";
import type { Usuario } from "../../shared/types";
import { FilterBar, FilterField, Input, Select } from "../../shared/ui";
import { TIPOS_EVENTO } from "./formato";
import type { FiltrosHistorial as Filtros } from "./useHistorial";

interface FiltrosHistorialProps {
  filtros: Filtros;
  onChange: <K extends keyof Filtros>(clave: K, valor: Filtros[K]) => void;
  usuarios: Usuario[];
  modulos: string[];
  /** Acciones de la barra (exportación). */
  action: ReactNode;
}

export function FiltrosHistorial({
  filtros,
  onChange,
  usuarios,
  modulos,
  action,
}: FiltrosHistorialProps) {
  const t = useT();
  return (
    <FilterBar action={action}>
      <FilterField>
        <Input
          type="date"
          aria-label={t.reportes.desde}
          value={filtros.desde}
          onChange={(e) => onChange("desde", e.target.value)}
        />
      </FilterField>
      <FilterField>
        <Input
          type="date"
          aria-label={t.reportes.hasta}
          value={filtros.hasta}
          onChange={(e) => onChange("hasta", e.target.value)}
        />
      </FilterField>
      <FilterField>
        <Select
          aria-label={t.historial.filtrarUsuario}
          value={filtros.usuarioId}
          onChange={(e) => onChange("usuarioId", e.target.value)}
        >
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre_usuario}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField>
        <Select
          aria-label={t.historial.filtrarEvento}
          value={filtros.tipoEvento}
          onChange={(e) => onChange("tipoEvento", e.target.value)}
        >
          <option value="">{t.reportes.todosTipos}</option>
          {TIPOS_EVENTO.map((evento) => (
            <option key={evento} value={evento}>
              {evento === "VISTA" ? t.historial.vistasDePagina : t.historial.comandosBackend}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField>
        <Select
          aria-label={t.historial.filtrarModulo}
          value={filtros.modulo}
          onChange={(e) => onChange("modulo", e.target.value)}
        >
          <option value="">Todos los módulos</option>
          {modulos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField>
        <Select
          aria-label={t.historial.filtrarResultado}
          value={filtros.resultado}
          onChange={(e) => onChange("resultado", e.target.value)}
        >
          <option value="">Todos los resultados</option>
          <option value="EXITO">Solo éxito</option>
          <option value="ERROR">Solo errores</option>
        </Select>
      </FilterField>
      <FilterField grow>
        <Input
          type="search"
          aria-label={t.historial.buscarComando}
          placeholder={t.reportes.auditoria.comandoEjemplo}
          value={filtros.comando}
          onChange={(e) => onChange("comando", e.target.value)}
        />
      </FilterField>
    </FilterBar>
  );
}
