import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type SkeletonVariant = "text" | "control" | "block";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  text: "skeleton--text",
  control: "skeleton--control",
  block: "skeleton--block",
};

export function Skeleton({ variant = "text", className, ...rest }: SkeletonProps) {
  return <div className={cn("skeleton", VARIANT_CLASS[variant], className)} {...rest} />;
}
