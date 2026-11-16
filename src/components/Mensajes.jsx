import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ContextoNotificar, useNotificar } from "../hooks/useNotificar";
import { Icono } from "./Icono";

const VISIBLE = 4000; // lo que dura un aviso en pantalla
const MAXIMO = 3; // avisos a la vez; el más viejo se va
const ICONOS = { success: "check_circle", warning: "warning", info: "info" };

export function ProveedorMensajes({ children }) {
  const [mensajes, setMensajes] = useState([]); // [{id, texto, tipo}]
  const [errores, setErrores] = useState([]);
  const siguiente = useRef(1);

  const notificar = useCallback((texto, tipo = "success") => {
    if (!texto) return;
    // Los errores van en una alerta que hay que cerrar; el resto, en un aviso flotante que se va solo
    if (tipo === "danger") {
      setErrores((actuales) => (actuales.includes(texto) ? actuales : [...actuales, texto]));
      return;
    }
    const id = siguiente.current++;
    // El mismo texto no se repite en pantalla
    setMensajes((actuales) => [...actuales.filter((m) => m.texto !== texto), { id, texto, tipo }].slice(-MAXIMO));
  }, []);

  const quitar = useCallback((id) => setMensajes((actuales) => actuales.filter((m) => m.id !== id)), []);

  return (
    <ContextoNotificar.Provider value={notificar}>
      {children}
      {/* Avisos flotantes: arriba a la derecha (abajo al centro en celular), sin mover la pantalla */}
      {createPortal(
        <div className="avisos-flotantes no-imprimir" aria-live="polite">
          {mensajes.map((m) => (
            <AvisoFlotante key={m.id} mensaje={m} onCerrar={() => quitar(m.id)} />
          ))}
        </div>,
        document.body,
      )}
      {errores.length > 0 && <AlertaErrores errores={errores} onCerrar={() => setErrores([])} />}
    </ContextoNotificar.Provider>
  );
}

// Se va solo a los 4 segundos; con el mouse encima espera a que lo terminen de leer
function AvisoFlotante({ mensaje, onCerrar }) {
  const [pausado, setPausado] = useState(false);
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });
  useEffect(() => {
    if (pausado) return undefined;
    const reloj = setTimeout(() => cerrar.current(), VISIBLE);
    return () => clearTimeout(reloj);
  }, [pausado]);

  return (
    <div
      className={`aviso-flotante aviso-${mensaje.tipo}`}
      role="status"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <Icono nombre={ICONOS[mensaje.tipo] || "info"} className="aviso-flotante-icono" />
      <p>{mensaje.texto}</p>
      <button type="button" className="aviso-flotante-cerrar" aria-label="Cerrar aviso" onClick={onCerrar}>
        <Icono nombre="close" />
      </button>
    </div>
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
