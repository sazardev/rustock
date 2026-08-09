import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon, type IconName } from "./Icon";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: IconName;
  children: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
  info: "badge--info",
  neutral: "badge--neutral",
};

export function Badge({ tone = "neutral", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn("badge", TONE_CLASS[tone], className)} {...rest}>
      {icon ? <Icon name={icon} className="badge__icon" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
