import { createElement, type ElementType, type ReactNode } from "react";
import { cn } from "../lib/cn";

export type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type TextColor =
  "default" | "muted" | "secondary" | "strong" | "danger" | "success" | "warning" | "info" | "link";

export interface TextProps {
  as?: ElementType;
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  mono?: boolean;
  className?: string;
  children: ReactNode;
}

const SIZE_CLASS: Record<TextSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

const WEIGHT_CLASS: Record<TextWeight, string> = {
  regular: "fw-regular",
  medium: "fw-medium",
  semibold: "fw-semibold",
  bold: "fw-bold",
};

const COLOR_CLASS: Record<TextColor, string> = {
  default: "text-gray-600",
  muted: "text-gray-500",
  secondary: "text-gray-600",
  strong: "text-gray-800",
  danger: "text-danger",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  link: "text-blue-500",
};

export function Text({
  as: Tag = "span",
  size = "base",
  weight = "regular",
  color = "default",
  mono = false,
  className,
  children,
}: TextProps) {
  return createElement(
    Tag,
    {
      className: cn(
        SIZE_CLASS[size],
        WEIGHT_CLASS[weight],
        COLOR_CLASS[color],
        mono && "font-mono",
        className,
      ),
    },
    children,
  );
}
