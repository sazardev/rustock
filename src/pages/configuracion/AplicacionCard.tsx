import { useT } from "../../shared/i18n";
import { usePwa } from "../../shared/pwa";
import { Button, Card } from "../../shared/ui";

/**
 * Instalación de Rustock como aplicación del dispositivo. La invitación vive
 * aquí — en una página que la persona abre por decisión propia — y no como
 * un banner que interrumpe la operación (DESIGN §5.1).
 */
export function AplicacionCard() {
  const t = useT();
  const instalable = usePwa((s) => s.instalable);
  const instalada = usePwa((s) => s.instalada);
  const instalar = usePwa((s) => s.instalar);

  return (
    <Card title={t.configuracion.aplicacion} className="mt-6">
      <Card.Body>
        {instalada ? (
          <p className="text-sm text-gray-500">{t.configuracion.yaInstalada}</p>
        ) : instalable ? (
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm text-gray-500 flex-1">{t.configuracion.invitacionInstalar}</p>
            <Button
              type="button"
              variant="secondary"
              icon="instalar"
              onClick={() => void instalar()}
            >
              {t.configuracion.instalarRustock}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t.configuracion.sinInstalacion}</p>
        )}
      </Card.Body>
    </Card>
  );
}
