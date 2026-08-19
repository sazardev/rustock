#!/usr/bin/env bash
# Rustock — arranque en un solo comando (modo navegador, front + back).
#
# Encapsula todo lo que hay que saber para levantar la app en modo web:
#   - limpieza de procesos viejos que queden ocupando los puertos (:6821/:1421)
#   - lanzamiento de vite (frontend) + backend Rust web-only (sin GTK)
#   - opciones de datos: seed de ejemplo, reset de la base, db temporal
#
# Uso:
#   ./scripts/dev.sh                levanta con la base actual
#   ./scripts/dev.sh --seed         levanta y puebla datos de ejemplo si está vacía
#   ./scripts/dev.sh --reset        respalda y borra la base real, luego seedea
#   ./scripts/dev.sh --tmpdb        usa una base temporal en /tmp (no toca la real)
#   ./scripts/dev.sh --seed --tmpdb datos de ejemplo en base temporal
#   ./scripts/dev.sh --stop         detiene cualquier instancia en los puertos
#   ./scripts/dev.sh --help         esta ayuda
#
# Notas:
#   - El backend tarda en compilar la primera vez (~1-2 min); el script espera
#     y avisa cuando ambos servicios responden.
#   - Credenciales del seed: admin / Admin1234!
#   - Para detener: Ctrl+C en la terminal, o ./scripts/dev.sh --stop.

set -u

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT_PUERTO=6821
API_PUERTO="${RUSTOCK_HTTP_PORT:-1421}"
DB_REAL="${RUSTOCK_DB_PATH:-$HOME/.local/share/com.rustock.app/rustock.db}"

SEED=0
RESET=0
TMPDB=0
STOP=0

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=1 ;;
    --reset) RESET=1 ;;
    --tmpdb) TMPDB=1 ;;
    --stop) STOP=1 ;;
    --help|-h)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      echo "error: argumento desconocido '$arg' (usa --help)" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# 0. Detener instancias previas
# ---------------------------------------------------------------------------
matar_proceso_en_puerto() {
  local puerto="$1" pid
  pid="$(ss -tlnp 2>/dev/null | rg ":$puerto\\b" | sed -E 's/.*pid=([0-9]+).*/\1/' | head -1)"
  if [ -n "$pid" ]; then
    echo "[dev] puerto $puerto ocupado por pid $pid, deteniendo..."
    kill "$pid" 2>/dev/null || true
    sleep 2
    kill -9 "$pid" 2>/dev/null || true
  fi
}

if [ "$STOP" -eq 1 ]; then
  matar_proceso_en_puerto "$FRONT_PUERTO"
  matar_proceso_en_puerto "$API_PUERTO"
  echo "[dev] procesos detenidos. Hasta pronto."
  exit 0
fi

matar_proceso_en_puerto "$FRONT_PUERTO"
matar_proceso_en_puerto "$API_PUERTO"

# ---------------------------------------------------------------------------
# 1. Preparar la base de datos
# ---------------------------------------------------------------------------
if [ "$TMPDB" -eq 1 ]; then
  DB_REAL="/tmp/opencode/rustock-dev.db"
  export RUSTOCK_DB_PATH="$DB_REAL"
  echo "[dev] usando base temporal: $DB_REAL (la real no se toca)"
fi

if [ "$RESET" -eq 1 ]; then
  if [ -f "$DB_REAL" ]; then
    backup="${DB_REAL}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$DB_REAL" "$backup"
    echo "[dev] base respaldada en: $backup"
    rm -f "$DB_REAL"
    echo "[dev] base borrada: $DB_REAL"
  else
    echo "[dev] no había base que resetear ($DB_REAL)"
  fi
fi

if [ "$SEED" -eq 1 ]; then
  export RUSTOCK_SEED=1
  echo "[dev] RUSTOCK_SEED=1 (datos de ejemplo si la base está vacía)"
fi

# ---------------------------------------------------------------------------
# 2. Levantar front + back
# ---------------------------------------------------------------------------
echo "[dev] levantando Rustock en modo web..."
echo "[dev]   frontend -> http://localhost:$FRONT_PUERTO"
echo "[dev]   API      -> http://127.0.0.1:$API_PUERTO"
echo "[dev]   base     -> $DB_REAL"
echo "[dev]   Ctrl+C para detener ambos"
echo ""

cd "$RAIZ" || exit 1
exec npm run tauri:web