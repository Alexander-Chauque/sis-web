import { useCallback, useEffect, useRef, useState } from "react";

import { ContextoNotificar, useNotificar } from "../hooks/useNotificar";

const VISIBLE = 5000;
const DESVANECER = 500;

export function ProveedorMensajes({ children }) {
  const [mensajes, setMensajes] = useState([]); // [{id, texto, tipo, saliendo}]
  const siguiente = useRef(1);

  const notificar = useCallback((texto, tipo = "success") => {
    if (!texto) return;
    const id = siguiente.current++;
    // El mismo texto no se repite en pantalla
    setMensajes((actuales) => [...actuales.filter((m) => m.texto !== texto), { id, texto, tipo, saliendo: false }]);
    setTimeout(() => setMensajes((actuales) => actuales.map((m) => (m.id === id ? { ...m, saliendo: true } : m))), VISIBLE);
    setTimeout(() => setMensajes((actuales) => actuales.filter((m) => m.id !== id)), VISIBLE + DESVANECER);
  }, []);

  return (
    <ContextoNotificar.Provider value={notificar}>
      {mensajes.length > 0 && (
        <div className="mensajes-django no-imprimir" aria-live="polite">
          {mensajes.map((m) => (
            <div key={m.id} className={`mensaje-django mensaje-${m.tipo} ${m.saliendo ? "saliendo" : ""}`} role={m.tipo === "danger" ? "alert" : "status"}>
              {m.texto}
            </div>
          ))}
        </div>
      )}
      {children}
    </ContextoNotificar.Provider>
  );
}
export function Notificar({ texto, tipo = "danger", onListo }) {
  const notificar = useNotificar();
  const listo = useRef(onListo);
  const ultimo = useRef("");
  useEffect(() => {
    listo.current = onListo;
  });

  useEffect(() => {
    if (!texto || typeof texto !== "string") {
      ultimo.current = "";
      return;
    }
    if (texto === ultimo.current) return;
    ultimo.current = texto;
    notificar(texto, tipo);
    listo.current?.();
  }, [texto, tipo, notificar]);

  return null;
}
