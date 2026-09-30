import type { ReactNode } from "react";
import { Card } from "../../shared/ui";

interface ShowcaseSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function ShowcaseSection({ id, title, description, children }: ShowcaseSectionProps) {
  return (
    <section id={id} className="mb-6 scroll-mt-20">
      <Card>
        <Card.Header>
          <h2 className="card__title">{title}</h2>
        </Card.Header>
        <Card.Body>
          <p className="mb-4 text-base text-gray-500">{description}</p>
          {children}
        </Card.Body>
      </Card>
    </section>
  );
}
