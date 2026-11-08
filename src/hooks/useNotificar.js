// Mensajes de la pantalla, como los "messages" de Django: se muestran arriba de todo,
// a lo ancho, y se desvanecen solos a los 5 segundos.
// Uso: const notificar = useNotificar(); notificar("Se guardó.", "success");
import { createContext, useContext } from "react";

export const ContextoNotificar = createContext(() => {});

export const useNotificar = () => useContext(ContextoNotificar);
