import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ContextoNotificar, useNotificar } from "../hooks/useNotificar";
import { Icono } from "./Icono";

const VISIBLE = 5000;
const DESVANECER = 500;

export function ProveedorMensajes({ children }) {
  const [mensajes, setMensajes] = useState([]); // [{id, texto, tipo, saliendo}]
  const [errores, setErrores] = useState([]);
  const siguiente = useRef(1);

  const notificar = useCallback((texto, tipo = "success") => {
    if (!texto) return;
    // Los errores van en una alerta que hay que cerrar; el resto, arriba y se van solos
    if (tipo === "danger") {
      setErrores((actuales) => (actuales.includes(texto) ? actuales : [...actuales, texto]));
      return;
    }
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
      {errores.length > 0 && <AlertaErrores errores={errores} onCerrar={() => setErrores([])} />}
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

function AlertaErrores({ errores, onCerrar }) {
  const boton = useRef(null);
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });

  useEffect(() => {
    const anterior = document.activeElement;
    boton.current?.focus();
    const alPresionar = (e) => {
      // Antes que las ventanas de la pantalla: Escape cierra solo la alerta
      e.stopPropagation();
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        cerrar.current();
      }
      // El foco queda en la alerta
      if (e.key === "Tab") {
        e.preventDefault();
        boton.current?.focus();
      }
    };
    document.addEventListener("keydown", alPresionar, true);
    return () => {
      document.removeEventListener("keydown", alPresionar, true);
      anterior?.focus?.();
    };
  }, []);

  // Al final de la página: el fondo oscuro tapa también el menú y la barra de arriba
  return createPortal(
    <>
      <div className="modal d-block alerta-errores no-imprimir" role="alertdialog" aria-modal="true" aria-labelledby="alerta-errores-titulo" aria-describedby="alerta-errores-texto" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-icono modal-icono-peligro" aria-hidden="true">
                <Icono nombre="error" />
              </div>
              <div className="modal-titulos">
                <h2 className="modal-title" id="alerta-errores-titulo">
                  No se pudo completar
                </h2>
              </div>
            </div>
            <div className="modal-body" id="alerta-errores-texto">
              {errores.length === 1 ? (
                <p>{errores[0]}</p>
              ) : (
                <ul>
                  {errores.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-marca" ref={boton} onClick={onCerrar}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>,
    document.body,
  );
}
