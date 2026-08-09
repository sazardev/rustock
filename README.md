# Rustock

Warehouse management, on Rust.

Rustock es una aplicación de gestión de almacenes (WMS) de escritorio construida con **Tauri v2**, **React**, **TypeScript** y **CSS puro** (sistema de diseño modular), con el backend en **Rust**.

## Stack

- [Tauri v2](https://tauri.app) — shell de escritorio con backend en Rust
- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) — bundler del frontend
- [CSS puro](src/styles/index.css) — sistema de diseño modular (tokens, layout, componentes) sin frameworks

## Requisitos

- [Rust](https://rustup.rs) (stable)
- [Node.js](https://nodejs.org) (LTS recomendada)
- Dependencias de sistema de Tauri: [prerrequisitos según plataforma](https://tauri.app/start/prerequisites)

## Desarrollo

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Los instaladores se generan en `src-tauri/target/release/bundle/`.

## Scripts

| Script         | Descripción                              |
| -------------- | ---------------------------------------- |
| `npm run dev`  | Servidor de desarrollo de Vite           |
| `npm run build`| Typecheck + build de producción          |
| `npm run tauri`| CLI de Tauri                             |
| `npm run tauri dev` | Ejecuta la app de escritorio en modo dev |

## Licencia

MIT
