// Ventana de confirmación con el diseño de los modales de Django:
// ícono en círculo, pregunta y explicación, tarjeta con el registro y su estado actual,
// motivo obligatorio (si se pide), recuadro "Importante" y el botón de la acción.
//
// confirmar("¿Eliminar X?")                 -> título y botón según el texto
// confirmar({ titulo, subtitulo, icono, tono, resumen, motivo, importante, textoConfirmar, iconoConfirmar, peligro })
// Devuelve false si se cancela, o { motivo } si se confirma.
import { useCallback, useRef, useState } from "react";

import { ContextoConfirmar } from "../hooks/useConfirmar";
import { Modal } from "./Comunes";
import { Icono } from "./Icono";

const MAXIMO_MOTIVO = 250;

// Título, ícono y botón según lo que se pide confirmar, si no se indican
function completar(opciones) {
  const datos = typeof opciones === "string" ? { mensaje: opciones } : opciones;
  const texto = (datos.mensaje || datos.titulo || "").toLowerCase();
  let base;
  if (texto.startsWith("¿eliminar")) {
    base = {
      titulo: "Confirmar eliminación",
      textoConfirmar: "Sí, eliminar",
      iconoConfirmar: "delete",
      icono: "delete",
      tono: "peligro",
      peligro: true,
      importante: ["Esta acción quedará registrada en el historial de auditoría.", { texto: "Esta acción no se puede deshacer.", fuerte: true }],
    };
  } else if (texto.startsWith("¿anular")) {
    base = {
      titulo: "Confirmar anulación",
      textoConfirmar: "Sí, anular",
      iconoConfirmar: "delete",
      icono: "warning",
      tono: "peligro",
      peligro: true,
      importante: [{ texto: "Esta acción no se puede deshacer.", fuerte: true }],
    };
  } else {
    base = { titulo: "Confirmar cambio", textoConfirmar: "Confirmar cambio", iconoConfirmar: "sync", icono: "warning", peligro: false };
  }
  return { ...base, ...datos };
}

function VentanaConfirmar({ pedido, onResponder }) {
  const [motivo, setMotivo] = useState("");
  const [falta, setFalta] = useState(false);
  const { resumen } = pedido;

  const confirmar = () => {
    if (pedido.motivo && !motivo.trim()) {
      setFalta(true);
      return;
    }
    onResponder({ motivo: motivo.trim() });
  };

  return (
    <Modal
      titulo={pedido.titulo}
      subtitulo={pedido.subtitulo || (pedido.titulo !== pedido.mensaje ? pedido.mensaje : "")}
      icono={pedido.icono}
      tono={pedido.tono}
      peligro={pedido.peligro}
      textoEnviar={pedido.textoConfirmar}
      iconoEnviar={pedido.iconoConfirmar}
      grande={!!(pedido.motivo || resumen)}
      onCerrar={() => onResponder(false)}
      onEnviar={confirmar}
    >
      {resumen && (
        <div className="tarjeta-resumen">
          <div className="resumen-datos">
            <strong>{resumen.nombre}</strong>
            {resumen.detalle && <small>{resumen.detalle}</small>}
          </div>
          {resumen.estado && (
            <div className="resumen-estado">
              <span className="resumen-label">Estado actual</span>
              <span className={`badge ${resumen.estado.activo ? "text-bg-success" : "text-bg-danger"}`}>{resumen.estado.texto}</span>
            </div>
          )}
        </div>
      )}

      {pedido.motivo && (
        <div className="campo-motivo">
          <label htmlFor="motivo-confirmar" className="form-label">
            {pedido.motivo.etiqueta || "Motivo del cambio"} <span className="req">*</span>
          </label>
          <textarea
            id="motivo-confirmar"
            className={`form-control ${falta ? "is-invalid" : ""}`}
            rows={3}
            maxLength={MAXIMO_MOTIVO}
            placeholder={pedido.motivo.placeholder}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setFalta(false);
            }}
          />
          <div className="motivo-pie">
            <span className={falta ? "text-danger fw-semibold" : ""}>
              {falta ? "Escribí el motivo para continuar." : pedido.motivo.ayuda || "Registrá el motivo para dejar constancia en el historial."}
            </span>
            <span>
              {motivo.length}/{MAXIMO_MOTIVO}
            </span>
          </div>
        </div>
      )}

      {!resumen && !pedido.motivo && pedido.subtitulo && pedido.mensaje && pedido.mensaje !== pedido.titulo && (
        <p className="mensaje-confirmar">{pedido.mensaje}</p>
      )}

      {!!pedido.importante?.length && (
        <div className={`modal-alerta-${pedido.peligro || pedido.tono === "peligro" ? "peligro" : "aviso"} mt-3`}>
          <Icono nombre="info" />
          <div>
            <strong>Importante</strong>
            <ul>
              {pedido.importante.map((item) => {
                const texto = typeof item === "string" ? item : item.texto;
                return <li key={texto}>{typeof item === "object" && item.fuerte ? <strong className="d-inline m-0">{texto}</strong> : texto}</li>;
              })}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ProveedorConfirmar({ children }) {
  const [pedido, setPedido] = useState(null);
  const responder = useRef(null);

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolver) => {
        responder.current = resolver;
        setPedido(completar(opciones));
      }),
    [],
  );

  const alResponder = (respuesta) => {
    responder.current?.(respuesta);
    responder.current = null;
    setPedido(null);
  };

  return (
    <ContextoConfirmar.Provider value={confirmar}>
      {children}
      {/* La clave hace que cada confirmación empiece con el motivo vacío */}
      {pedido && <VentanaConfirmar key={`${pedido.titulo}-${pedido.resumen?.nombre || pedido.mensaje}`} pedido={pedido} onResponder={alResponder} />}
    </ContextoConfirmar.Provider>
  );
}
