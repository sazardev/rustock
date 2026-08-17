# Instalación de Rustock

> Guía de instalación y primer arranque de Rustock, el sistema de gestión de
> inventario / mini-WMS self-hosted. Complementa a `AGENTS.md` (desarrollo) y
> `MEMORY.md` (estado del proyecto).

---

## Requisitos

- **Sistema operativo**: Linux (x86_64) — los paquetes de instalación son
  `.deb` (Debian/Ubuntu) y `.rpm` (Fedora/openSUSE).
- **Sin servicios externos**: Rustock es completamente autosuficiente. Corre
  local y guarda sus datos en un archivo SQLite junto a la app. No necesita
  red, base de datos externa ni cuenta en la nube.
- Para **compilar desde fuente** (desarrolladores): Node.js ≥ 26, Rust
  ≥ 1.96, y las dependencias de WebKitGTK para Tauri (ver `STACK.md`).

## Instalar

### Con el paquete instalador (deb/rpm)

1. Descarga el instalador para tu distribución (`rustock_*.deb` o
   `rustock-*.rpm`).
2. Instálalo:

   ```bash
   sudo apt install ./rustock_*.deb     # Debian/Ubuntu
   sudo dnf install ./rustock-*.rpm     # Fedora
   ```

3. Abre **Rustock** desde el menú de aplicaciones.

### Compilando desde fuente

```bash
npm install
npm run tauri build     # genera el frontend, compila Rust en release y empaqueta deb/rpm
```

Los instaladores quedan en `src-tauri/target/release/bundle/`.

## Primer arranque (bootstrap del Administrador)

La primera vez que abras la app verás el formulario **"Configurar
administrador"**: crea el usuario ADMIN que controla la instalación (tiene
todos los permisos). Este paso solo puede hacerse una vez.

Después inicia sesión con ese usuario y, en **Configuración**, completa los
datos de la empresa (zona horaria, formato de fecha, país, datos fiscales,
logo, sucursales) antes de cargar catálogos.

### Datos de ejemplo (solo desarrollo)

Para explorar la app con datos realistas ya poblados (usuarios, almacenes,
productos, lotes con vencimientos, movimientos aprobados y sesiones de
inventario):

```bash
RUSTOCK_SEED=1 npm run tauri dev
```

Usuario de ejemplo: `admin` / contraseña `Admin1234!`. El seed solo aplica en
builds de desarrollo y es idempotente (no duplica si ya hay datos).

## Modos de ejecución

| Modo | Cuándo | Cómo |
|---|---|---|
| **Escritorio (ventana nativa)** | Uso normal | `npm run tauri dev` (desarrollo) o el instalador (producción) |
| **Navegador con ventana** | Probar en el navegador local | `RUSTOCK_HEADLESS=1 npm run tauri dev` + abrir `http://localhost:6821` |
| **Navegador sin ventana** | Entornos sin servidor X/Wayland (WSL, SSH, CI) | `npm run tauri:web` y abrir `http://localhost:6821` |

En los modos navegador, la app expone su lógica de negocio en un servidor
HTTP local (`127.0.0.1:1421`) que el frontend consume desde el navegador; es
la **misma base de datos y la misma lógica** que el modo escritorio.

## Dónde viven los datos

- Base de datos: `~/.local/share/com.rustock.app/rustock.db` (o la ruta de
  `RUSTOCK_DB_PATH` si se define).
- La base es un único archivo SQLite: para respaldar la instalación basta
  copiarlo (con la app cerrada).

## Solución de problemas

- **La ventana no aparece en WSL/SSH**: usa `npm run tauri:web` (modo
  navegador sin ventana). En entornos sin X/Wayland la ventana nativa no
  puede crearse.
- **"No se pudo conectar con el backend local"** en el navegador: el backend
  HTTP no está corriendo; lanza `npm run tauri:web` o `npm run tauri dev`.
- **Base de datos antigua / error de esquema**: si actualizaste desde una
  versión muy anterior, borra `rustock.db` y vuelve a configurar el
  administrador (los cambios de esquema recientes son migraciones
  automáticas, pero las versiones pre-0.3 requerían borrar el archivo).
- **Cambiar el puerto HTTP** (1421): define `RUSTOCK_HTTP_PORT`.

## Respaldo y restauración

1. Cierra Rustock.
2. Copia `~/.local/share/com.rustock.app/rustock.db` a un lugar seguro.
3. Para restaurar, coloca la copia en la misma ruta antes de abrir la app.

---

*Fin de la guía de instalación. Para el manual de uso completo, consulta la
sección **Ayuda** dentro de la aplicación.*
