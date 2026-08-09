import type { TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea className={cn("field__control field__control--textarea", className)} {...rest} />
  );
}
