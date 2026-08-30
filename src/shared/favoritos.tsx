/**
 * Favoritos de filtros de listado: guarda el estado de búsqueda/filtros de un
 * listado (localStorage, por página) para volver a una consulta recurrente en
 * un clic. Solo persiste el estado de presentación, nunca datos de negocio.
 */
import { useState } from "react";
import { useT } from "./i18n";
import { Button, Input, Text } from "./ui";
import { Icon } from "./ui";

export interface FavoritoFiltros {
  id: string;
  nombre: string;
  estado: Record<string, unknown>;
}

const PREFIJO = "rustock:filtros:";

export function leerFavoritos(clave: string): FavoritoFiltros[] {
  try {
    const crudo = window.localStorage.getItem(PREFIJO + clave);
    return crudo ? (JSON.parse(crudo) as FavoritoFiltros[]) : [];
  } catch {
    return [];
  }
}

function escribir(clave: string, lista: FavoritoFiltros[]): void {
  try {
    window.localStorage.setItem(PREFIJO + clave, JSON.stringify(lista));
  } catch {
    // almacenamiento no disponible: se ignora
  }
}

export function guardarFavorito(
  clave: string,
  nombre: string,
  estado: Record<string, unknown>,
): FavoritoFiltros[] {
  const lista = leerFavoritos(clave);
  const nuevo: FavoritoFiltros = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    nombre: nombre.trim(),
    estado,
  };
  const siguiente = [...lista, nuevo];
  escribir(clave, siguiente);
  return siguiente;
}

export function eliminarFavorito(clave: string, id: string): FavoritoFiltros[] {
  const siguiente = leerFavoritos(clave).filter((f) => f.id !== id);
  escribir(clave, siguiente);
  return siguiente;
}

/**
 * Barra de favoritos de filtros: un campo para guardar el estado actual y los
 * favoritos guardados como chips (clic = aplicar, × = eliminar). `estadoActual`
 * devuelve el estado de filtros vigente del listado; `onAplicar` lo restaura.
 */
export function FavoritosFiltros({
  clave,
  estadoActual,
  onAplicar,
}: {
  clave: string;
  estadoActual: () => Record<string, unknown>;
  onAplicar: (estado: Record<string, unknown>) => void;
}) {
  const t = useT();
  const [favoritos, setFavoritos] = useState<FavoritoFiltros[]>(() => leerFavoritos(clave));
  const [nombre, setNombre] = useState("");

  function guardar() {
    if (!nombre.trim()) return;
    setFavoritos(guardarFavorito(clave, nombre, estadoActual()));
    setNombre("");
  }

  function aplicar(f: FavoritoFiltros) {
    onAplicar(f.estado);
  }

  function quitar(id: string) {
    setFavoritos(eliminarFavorito(clave, id));
  }

  return (
    <div className="favoritos">
      <div className="favoritos__guardar">
        <Input
          aria-label={t.favoritos.nombre}
          placeholder={t.favoritos.marcador}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              guardar();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon="aprobar"
          disabled={!nombre.trim()}
          onClick={guardar}
        >
          {t.comun.guardar}
        </Button>
      </div>
      {favoritos.length > 0 ? (
        <ul className="favoritos__lista">
          {favoritos.map((f) => (
            <li key={f.id} className="favoritos__chip">
              <button type="button" className="favoritos__chip-aplicar" onClick={() => aplicar(f)}>
                <Icon name="filtrar" size={12} aria-hidden="true" />
                {f.nombre}
              </button>
              <button
                type="button"
                className="favoritos__chip-quitar"
                aria-label={t.favoritos.quitar({ nombre: f.nombre })}
                onClick={() => quitar(f.id)}
              >
                <Icon name="anular" size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {favoritos.length > 0 ? (
        <Text size="xs" color="muted" as="p">
          Guarda consultas frecuentes para volver a ellas en un clic.
        </Text>
      ) : null}
    </div>
  );
}
