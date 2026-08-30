import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { useT } from "../i18n";

export type SkeletonVariant = "text" | "control" | "block" | "title" | "panel";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  text: "skeleton--text",
  control: "skeleton--control",
  block: "skeleton--block",
  title: "skeleton--title",
  panel: "skeleton--panel",
};

export function Skeleton({ variant = "text", className, ...rest }: SkeletonProps) {
  const t = useT();
  return (
    <div
      className={cn("skeleton", VARIANT_CLASS[variant], className)}
      role="status"
      aria-label={t.comun.cargando}
      aria-busy="true"
      {...rest}
    />
  );
}
