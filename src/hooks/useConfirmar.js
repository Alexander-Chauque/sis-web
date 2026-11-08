// Pide confirmación con una ventana como las de Django, en lugar del cuadro del navegador.
// Uso: const confirmar = useConfirmar(); if (!(await confirmar("¿Eliminar X?"))) return;
import { createContext, useContext } from "react";

export const ContextoConfirmar = createContext(null);

export function useConfirmar() {
  const confirmar = useContext(ContextoConfirmar);
  // Sin el proveedor (por ejemplo en pruebas), se usa el cuadro del navegador
  return confirmar || ((opciones) => Promise.resolve(window.confirm(typeof opciones === "string" ? opciones : opciones.mensaje)));
}
