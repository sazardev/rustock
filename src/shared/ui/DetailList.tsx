import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Code } from "./Code";

export interface DetailItem {
  label: ReactNode;
  value: ReactNode;
  code?: boolean;
  num?: boolean;
}

export interface DetailListProps {
  items: DetailItem[];
  className?: string;
}

export function DetailList({ items, className }: DetailListProps) {
  return (
    <dl className={cn("detail-list", className)}>
      {items.map((item, index) => (
        <div className="detail-list__item" key={index}>
          <dt className="detail-list__label">{item.label}</dt>
          <dd>
            {item.code || item.num ? (
              <Code className={cn("detail-list__value", item.num && "detail-list__value--num")}>
                {item.value}
              </Code>
            ) : (
              <span className="detail-list__value">{item.value}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
