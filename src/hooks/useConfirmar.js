import { createContext, useContext } from "react";

export const ContextoConfirmar = createContext(null);

export function useConfirmar() {
  const confirmar = useContext(ContextoConfirmar);
  return confirmar || ((opciones) => Promise.resolve(window.confirm(typeof opciones === "string" ? opciones : opciones.mensaje)));
}
