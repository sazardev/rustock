import type { MetricasActividad } from "../../shared/audit";
import { useT } from "../../shared/i18n";
import { Card, Icon } from "../../shared/ui";
import { iconoInsight } from "./formato";

export function InsightsCard({ insights }: { insights: MetricasActividad["insights"] }) {
  const t = useT();
  return (
    <div className="mt-6">
      <Card title={t.historial.perspectiva}>
        <Card.Body>
          <ul className="list-none p-0">
            {insights.map((insight) => (
              <li
                key={insight.titulo}
                className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-b-0"
              >
                <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <Icon name={iconoInsight(insight.icono)} size={14} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{insight.titulo}</p>
                  <p className="text-sm text-gray-500">{insight.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
}
