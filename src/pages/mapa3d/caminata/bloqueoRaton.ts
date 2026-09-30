/** Pointer Lock: captura del ratón para mirar. Puede fallar (sin gesto previo,
 * navegador sin soporte, TV): entonces se sigue sin él. */
export function pedirBloqueo(el: Element | null): void {
  if (!el || document.pointerLockElement === el) {
    return;
  }
  try {
    const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
    r?.catch(() => undefined);
  } catch {
    // Sin Pointer Lock: la mirada queda para el tacto o el mando.
  }
}

export function soltarBloqueo(): void {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}
