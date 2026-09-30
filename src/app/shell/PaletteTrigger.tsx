import { Icon, Kbd } from "../../shared/ui";
import { usePalette } from "../../shared/palette/palette-store";
import { useT } from "../../shared/i18n";

/** Píldora de la topbar que abre el command palette (DESIGN §4.2, §6.10). */
export function PaletteTrigger() {
  const t = useT();
  const abrir = usePalette((s) => s.abrir);
  return (
    <button
      type="button"
      className="palette-trigger"
      onClick={abrir}
      aria-label={t.shell.buscarGlobalAria}
    >
      <Icon name="buscar" size={16} className="palette-trigger__icono" aria-hidden="true" />
      <span className="palette-trigger__texto">{t.shell.buscarGlobal}</span>
      <Kbd className="palette-trigger__kbd" aria-hidden="true">
        Ctrl K
      </Kbd>
    </button>
  );
}
