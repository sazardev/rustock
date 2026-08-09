import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface CodeProps {
  size?: "xs" | "sm" | "base";
  className?: string;
  children: ReactNode;
}

const SIZE_CLASS = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
} as const;

export function Code({ size = "sm", className, children }: CodeProps) {
  return <code className={cn("font-mono", SIZE_CLASS[size], className)}>{children}</code>;
}
