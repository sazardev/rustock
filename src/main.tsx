import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/600.css";
import "@fontsource/geist-mono/700.css";
import App from "./App";
import { iniciarPwa } from "./shared/pwa";
import { aplicarTemaCacheado } from "./shared/tema";
import "./styles/index.css";

// Antes de montar React: pinta el último tema conocido para que la primera
// imagen ya salga con los colores correctos (ver `tema.ts`).
aplicarTemaCacheado();
iniciarPwa();

createRoot(document.querySelector("#root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
