import type { SVGProps } from "react";

/** Texto de cota con halo del color del lienzo, legible sobre cualquier relleno.
 * `escala` = unidades de SVG por píxel: mide lo mismo en pantalla con cualquier zoom. */
export function TextoCota({
  escala,
  color,
  children,
  ...rest
}: { escala: number; color: string } & Omit<SVGProps<SVGTextElement>, "color">) {
  return (
    <text
      fontSize={11 * escala}
      fontWeight={600}
      fill={color}
      stroke="var(--color-gray-50)"
      strokeWidth={3 * escala}
      paintOrder="stroke"
      pointerEvents="none"
      textAnchor="middle"
      {...rest}
    >
      {children}
    </text>
  );
}
