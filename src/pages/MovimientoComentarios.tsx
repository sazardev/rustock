/**
 * Panel de comentarios de un movimiento (SPEC §12): lista + formulario en
 * línea (nunca modal, DESIGN §5.1). El autor se resuelve a su nombre legible.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crearComentario, listarComentarios } from "../shared/backend";
import { UsuarioNombre } from "../shared/refs";
import { formatearFecha, mensajeError } from "../shared/format";
import { Badge, Button, Card, Text, Textarea, useToast } from "../shared/ui";

export function MovimientoComentarios({ movimientoId }: { movimientoId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [textoComentario, setTextoComentario] = useState("");

  const comentariosQuery = useQuery({
    queryKey: ["comentarios", "movimiento", movimientoId],
    queryFn: () => listarComentarios("movimiento", movimientoId),
  });

  const comentarMut = useMutation({
    mutationFn: () =>
      crearComentario({ entidad: "movimiento", entidad_id: movimientoId, texto: textoComentario }),
    onSuccess: () => {
      setTextoComentario("");
      queryClient.invalidateQueries({ queryKey: ["comentarios", "movimiento", movimientoId] });
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  return (
    <div className="mt-6">
      <Card title="Comentarios">
        <Card.Body>
          {comentariosQuery.data && comentariosQuery.data.length > 0 ? (
            <ul className="list-none p-0">
              {comentariosQuery.data
                .filter((c) => !c.oculto)
                .map((c) => (
                  <li key={c.id} className="border-b border-gray-100 py-2">
                    <div className="flex items-center gap-2">
                      <Text size="sm" weight="medium">
                        <UsuarioNombre id={c.usuario_id} />
                      </Text>
                      <Text size="xs" color="muted">
                        {formatearFecha(c.created_at)}
                      </Text>
                      {c.editado ? (
                        <Badge tone="neutral" className="text-xs">
                          Editado
                        </Badge>
                      ) : null}
                    </div>
                    <Text as="p" size="sm">
                      {c.texto}
                    </Text>
                  </li>
                ))}
            </ul>
          ) : (
            <Text as="p" size="sm" color="muted">
              Sin comentarios todavía.
            </Text>
          )}

          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (textoComentario.trim()) comentarMut.mutate();
            }}
          >
            <Textarea
              aria-label="Nuevo comentario"
              placeholder="Agregar un comentario…"
              value={textoComentario}
              onChange={(e) => setTextoComentario(e.target.value)}
              rows={3}
            />
            <div className="mt-2">
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={comentarMut.isPending || !textoComentario.trim()}
              >
                Comentar
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
