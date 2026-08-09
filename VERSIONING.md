# VERSIONING.md — Rustock

> Política y tracking de versiones. Define qué significa cada versión, cómo se
> numeran los cambios y el mapa de versiones a trabajar (alineado con
> `ROADMAP.md` y `SPEC.md`).

---

## 1. Modelo de versionado

Rustock usa **SemVer** estricto: `MAYOR.MENOR.PATCH`.

| Componente | Cuándo se incrementa | Ejemplo |
|---|---|---|
| **MAYOR** | Cambios incompatibles: rompe datos existentes, cambia una regla de negocio del SPEC, migra el esquema de forma irreversible. | 1.0.0 |
| **MENOR** | Nueva funcionalidad **compatible**: una nueva entidad, un nuevo tipo de movimiento, un reporte nuevo. | 0.2.0 |
| **PATCH** | Correcciones y mejoras internas sin cambiar la API ni la lógica: bugs, perf, refactor. | 0.1.1 |

Reglas:
- La versión actual es la **misma** en las 3 fuentes: `package.json`,
  `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json`. **Nunca** se cambian
  por separado; solo con `npm run release:*`.
- Un cambio `breaking` (según Conventional Commits) siempre sube la MENOR o
  MAYOR, nunca solo PATCH.
- En fase 0.x, un cambio de lógica de negocio del SPEC (aunque "parezca" un
  fix) sube MINOR, porque el dominio aún se está estabilizando.

---

## 2. Convención de commits (Conventional Commits)

Todo commit usa **Conventional Commits** — es el insumo del changelog y del
versionado automático.

```
<tipo>(<alcance>): <descripción>

[body / BREAKING CHANGE]
```

Tipos permitidos:

| Tipo | Uso | Grupo en changelog |
|---|---|---|
| `feat` | Nueva funcionalidad | Features |
| `fix` | Corrección de bug | Bug Fixes |
| `perf` | Mejora de rendimiento | Performance |
| `refactor` | Reestructuración sin cambiar comportamiento | Refactor |
| `docs` | Documentación (SPEC/DESIGN/STACK/AGENTS/...) | Documentación |
| `test` | Tests | Tests |
| `build` | Build y dependencias | Build |
| `ci` | CI / hooks / pipeline | CI |
| `chore` | Tareas de mantenimiento | Chore |
| `revert` | Revert de un commit | Revert |
| `style` | Formato sin cambio de lógica | Estilo |
| `wip` | Trabajo en progreso (se evita en main) | WIP |

`BREAKING CHANGE:` en el body, o `!` tras el tipo (`feat!:`), marca un cambio
incompatible → sube MAYOR/MENOR.

El formato lo valida el hook `commit-msg` de lefthook (ver §4). **Nunca** se
salta con `--no-verify`.

---

## 3. Flujo de release

1. **Desarrollar** con commits convencionales (los hooks validan el formato).
2. **Revisar** el changelog pendiente: `npm run changelog:unreleased`.
3. **Publicar** una release:
   - `npm run release:patch` → sube PATCH y crea tag `vX.Y.Z`
   - `npm run release:minor` → sube MINOR y crea tag `vX.Y.Z`
   - `npm run release:major` → sube MAYOR y crea tag `vX.Y.Z`
   - `npm run release` — con argumento explícito (`node scripts/release.mjs 0.3.0 --tag`)
4. El script:
   - sincroniza la versión en las 3 fuentes,
   - regenera `CHANGELOG.md` con git-cliff,
   - hace el commit `chore(release): prepare for X.Y.Z`,
   - crea el tag anotado `vX.Y.Z`.

**Regla de oro:** una release = un tag = una entrada en el CHANGELOG. No se
publica una versión sin changelog.

---

## 4. Hooks relacionados (lefthook)

- **`commit-msg`**: valida que el mensaje del commit sea Conventional Commits.
  Se usa un script ligero (`scripts/check-commit.mjs`). Si el formato es
  inválido, el commit se rechaza con el formato correcto sugerido.
- **`pre-commit` / `pre-push`**: el pipeline de calidad ya definido (lint,
  typecheck, build, design, clippy, fmt) corre en cada commit/push.

---

## 5. Mapa de versiones a trabajar

Alineado con `ROADMAP.md`. Una versión se marca **en progreso** mientras su
fase no esté cerrada con `/verify` en verde.

| Versión | Fase del roadmap | Contenido | Estado |
|---|---|---|---|
| 0.1.0 | 0 — Fundación | Scaffold Tauri+React, sistema de diseño CSS puro, componentes UI, pipeline de calidad, docs | ✅ Publicada |
| 0.2.0 | 1 — Capa de datos | SQLite/rusqlite, migraciones, tablas del SPEC, auditoría | ⏳ En progreso |
| 0.3.0 | 2 — Catálogos | CRUD de entidades maestras (almacén→caja, producto, lote, etc.) | Pendiente |
| 0.4.0 | 3 — Usuarios y permisos | Auth local, roles, matriz de permisos | Pendiente |
| 0.5.0 | 4 — Stock y movimientos | Entradas, salidas, traslados, ajustes, saldos | Pendiente |
| 0.6.0 | 5 — Inventario físico | Sesiones, conteos, precisión | Pendiente |
| 0.7.0 | 6 — Trazabilidad | Comentarios, histórico, auditoría consultable | Pendiente |
| 0.8.0 | 7 — Consulta universal y reportes | Estándar §15, dashboard, KPI, alertas | Pendiente |
| 0.9.0 | 8 — Pulido UX | Virtualización, code-splitting, accesibilidad | Pendiente |
| 1.0.0 | 9 — Release | Empaquetado final, instalación, bootstrap ADMIN | Pendiente |

**Regla:** no se avanza de fase/versión sin cerrar la anterior. Cada fase
termina con el pipeline en verde y, si el usuario lo pide, una release con su
tag y changelog.

---

## 6. Tracking en cada sesión

- Al iniciar una tarea: confirmar en qué **versión** se trabaja (la de
  `package.json` = la del tag más reciente).
- Al terminar una feature/fix: el commit debe ser convencional y describir el
  cambio real.
- Los `feat` acumulados alimentan la próxima release; cada release publica lo
  acumulado desde el tag anterior.
