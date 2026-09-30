/** Fundido breve al entrar (de opaco a transparente) y al salir (un
 * parpadeo suave mientras la cámara regresa). Es CSS puro. */
export function FundidoCaminata({ saliendo }: { saliendo: boolean }) {
  return (
    <div
      key={saliendo ? "salida" : "entrada"}
      className={`caminata__fundido caminata__fundido--${saliendo ? "salida" : "entrada"}`}
      aria-hidden="true"
    />
  );
}
