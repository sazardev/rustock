/** Pinta el minimapa 2D en un canvas (sin React). Los colores llegan ya
 * resueltos desde tokens CSS: el canvas no entiende `var(--x)`. */
import { encuadreMinimapa, type GeometriaMinimapa } from "./geometriaMinimapa";

export interface ColoresMinimapa {
  fondo: string;
  zona: string;
  zonaRelleno: string;
  pasillo: string;
  pasilloBorde: string;
  rack: string;
  jugador: string;
  contorno: string;
}

export interface PosicionMinimapa {
  x: number;
  z: number;
  yaw: number;
}

export function dibujarMinimapa(
  ctx: CanvasRenderingContext2D,
  lado: number,
  g: GeometriaMinimapa,
  jugador: PosicionMinimapa,
  c: ColoresMinimapa,
): void {
  const { escala, cx, cz } = encuadreMinimapa(g, lado, jugador);
  const px = (x: number) => lado / 2 + (x - cx) * escala;
  const pz = (z: number) => lado / 2 + (z - cz) * escala;
  ctx.clearRect(0, 0, lado, lado);
  ctx.fillStyle = c.fondo;
  ctx.fillRect(0, 0, lado, lado);
  for (const r of g.rects) {
    const x = px(r.x);
    const y = pz(r.y);
    const w = r.ancho * escala;
    const h = r.profundo * escala;
    if (r.tipo === "rack") {
      ctx.fillStyle = c.rack;
      ctx.fillRect(x, y, w, h);
    } else if (r.tipo === "pasillo") {
      ctx.fillStyle = c.pasillo;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = c.pasilloBorde;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    } else {
      ctx.fillStyle = c.zonaRelleno;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = c.zona;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }
  dibujarJugador(ctx, px(jugador.x), pz(jugador.z), jugador.yaw, c);
}

/** Flecha que apunta al rumbo: el frente con yaw 0 es hacia arriba del mapa. */
function dibujarJugador(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  yaw: number,
  c: ColoresMinimapa,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-yaw);
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5.5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5.5, 6);
  ctx.closePath();
  ctx.fillStyle = c.jugador;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = c.contorno;
  ctx.stroke();
  ctx.restore();
}
