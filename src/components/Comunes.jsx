// Piezas que se repiten en todas las pantallas.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { ESTADOS_COMANDA } from "../utils/formato";
import { Icono } from "./Icono";
import { ubicar } from "./menu";

// Encabezado de cada pantalla, como en Django: migas de pan, ícono en círculo, título y acciones.
// El ícono y las migas salen del menú según la ruta actual.
export function Encabezado({ titulo, subtitulo, icono, children, volver }) {
  const { pathname } = useLocation();
  const { grupo, opcion } = ubicar(pathname);
  const esListado = opcion && pathname === opcion.a;
  return (
    <>
      <nav className="breadcrumb no-imprimir" aria-label="Ubicación">
        <Link to="/" className="breadcrumb-item">
          <Icono nombre="home" /> Inicio
        </Link>
        {opcion && (
          <>
            {grupo.inicio && (
              <>
                <Icono nombre="chevron_right" className="breadcrumb-separator" />
                <Link to={grupo.inicio} className="breadcrumb-item">
                  {grupo.titulo}
                </Link>
              </>
            )}
            <Icono nombre="chevron_right" className="breadcrumb-separator" />
            {esListado ? (
              <span className="breadcrumb-item active" aria-current="page">
                {opcion.texto}
              </span>
            ) : (
              <>
                <Link to={opcion.a} className="breadcrumb-item">
                  {opcion.texto}
                </Link>
                <Icono nombre="chevron_right" className="breadcrumb-separator" />
                <span className="breadcrumb-item active" aria-current="page">
                  {titulo}
                </span>
              </>
            )}
          </>
        )}
        {!opcion && pathname !== "/" && (
          <>
            <Icono nombre="chevron_right" className="breadcrumb-separator" />
            <span className="breadcrumb-item active" aria-current="page">
              {pathname === grupo.inicio ? grupo.titulo : titulo}
            </span>
          </>
        )}
      </nav>
      <div className="page-header">
        <div className="page-header-info">
          {volver && (
            <Link to={volver} className="btn-volver-flecha no-imprimir" title="Volver" aria-label="Volver">
              <Icono nombre="arrow_back" />
            </Link>
          )}
          <div className="page-header-icono">
            <Icono nombre={icono || opcion?.icono || grupo.icono} />
          </div>
          <div className="page-header-texto">
            <h1>{titulo}</h1>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
        </div>
        {children && <div className="page-header-acciones no-imprimir">{children}</div>}
      </div>
    </>
  );
}

const ICONOS_ALERTA = { success: "check_circle", danger: "error", warning: "warning", info: "info" };
const DURACION_AVISO = 5000;

// Mensaje con borde de color a la izquierda, como los "messages" de Django.
// Los avisos de éxito se desvanecen solos a los 5 segundos, igual que en Django;
// los errores quedan a la vista hasta que se cierran.
export function Alerta({ tipo = "danger", children, onCerrar }) {
  if (!children) return null;
  // La clave hace que un mensaje nuevo vuelva a empezar la cuenta
  return (
    <AlertaVisible key={typeof children === "string" ? children : undefined} tipo={tipo} onCerrar={onCerrar}>
      {children}
    </AlertaVisible>
  );
}

function AlertaVisible({ tipo, children, onCerrar }) {
  const [saliendo, setSaliendo] = useState(false);
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });

  useEffect(() => {
    if (tipo !== "success" || !cerrar.current) return undefined;
    const desvanecer = setTimeout(() => setSaliendo(true), DURACION_AVISO);
    const quitar = setTimeout(() => cerrar.current?.(), DURACION_AVISO + 500);
    return () => {
      clearTimeout(desvanecer);
      clearTimeout(quitar);
    };
  }, [tipo]);

  return (
    <div className={`alert alert-${tipo} alerta-django ${saliendo ? "alerta-saliendo" : ""}`} role={tipo === "danger" ? "alert" : "status"}>
      <Icono nombre={ICONOS_ALERTA[tipo] || "info"} className="alerta-icono" />
      <div className="flex-grow-1">{children}</div>
      {onCerrar && (
        <button type="button" className="alerta-cerrar" aria-label="Cerrar mensaje" onClick={onCerrar}>
          <Icono nombre="close" />
        </button>
      )}
    </div>
  );
}

export function Insignia({ activo, si = "Activo", no = "Inactivo" }) {
  return <span className={`badge ${activo ? "text-bg-success" : "text-bg-danger"}`}>{activo ? si : no}</span>;
}

export function InsigniaComanda({ estado, nombre }) {
  const datos = ESTADOS_COMANDA[estado] || { nombre: nombre || estado, color: "text-bg-secondary" };
  return <span className={`badge ${datos.color}`}>{nombre || datos.nombre}</span>;
}

export function Vacio({ columnas, children }) {
  return (
    <tr>
      <td colSpan={columnas} className="sin-resultados">
        {children}
      </td>
    </tr>
  );
}

// Etiqueta con el asterisco de obligatorio en rojo, como en los formularios de Django
export function Etiqueta({ texto }) {
  if (typeof texto !== "string" || !texto.endsWith(" *")) return texto;
  return (
    <>
      {texto.slice(0, -2)} <span className="req">*</span>
    </>
  );
}

// Etiqueta, campo y ayuda de un formulario.
// "prefijo" muestra un recuadro delante del campo (ej. "$" en los precios), como en Django.
export function Campo({ id, etiqueta, ayuda, children, className = "mb-3", prefijo }) {
  return (
    <div className={`grupo-campo ${className}`}>
      <label htmlFor={id} className="form-label">
        <Etiqueta texto={etiqueta} />
      </label>
      {prefijo ? (
        <div className="input-con-prefijo">
          <span aria-hidden="true">{prefijo}</span>
          {children}
        </div>
      ) : (
        children
      )}
      {ayuda && <div className="form-text">{ayuda}</div>}
    </div>
  );
}

// Ícono del encabezado de la ventana según lo que hace, como los modales de Django
function iconoDeVentana(titulo, peligro, conFormulario) {
  if (peligro) return "warning";
  if (!conFormulario) return "info";
  const t = String(titulo).toLowerCase();
  if (t.startsWith("editar") || t.startsWith("turno de") || t.startsWith("permisos de")) return "edit_square";
  if (t.startsWith("restablecer")) return "key";
  if (t.startsWith("cobrar")) return "payments";
  return "add_circle";
}

// Ventana sobre la pantalla. Se cierra con Escape o con el botón Cancelar.
// "tono" pinta el círculo del ícono: "peligro" (rojo), "exito" (verde) o naranja si no se indica.
// "botonPeligro" pone el botón de confirmar en rojo aunque el ícono no lo sea.
export function Modal({
  titulo,
  subtitulo,
  onCerrar,
  onEnviar,
  enviando,
  textoEnviar = "Guardar",
  peligro,
  children,
  grande,
  icono,
  iconoEnviar,
  tono,
  botonPeligro = peligro,
}) {
  const ventana = useRef(null);
  // En una referencia: así el efecto corre una sola vez y no mueve el foco mientras se escribe
  const cerrar = useRef(onCerrar);
  const ocupado = useRef(enviando);
  useEffect(() => {
    cerrar.current = onCerrar;
    ocupado.current = enviando;
  });

  useEffect(() => {
    const alPresionar = (evento) => {
      if (evento.key === "Escape" && !ocupado.current) cerrar.current();
    };
    document.addEventListener("keydown", alPresionar);
    // Lleva el foco al primer campo, o a la ventana si no tiene campos
    const primero = ventana.current?.querySelector("input:not([type=hidden]), select, textarea");
    (primero || ventana.current)?.focus();
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.classList.remove("modal-open");
    };
  }, []);

  const enviar = (evento) => {
    evento.preventDefault();
    onEnviar?.();
  };

  return (
    <>
      <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${grande ? "modal-lg" : ""}`}>
          <form className="modal-content" onSubmit={enviar} ref={ventana} tabIndex={-1}>
            <div className="modal-header">
              <div className={`modal-icono ${(tono || (peligro ? "peligro" : "")) ? `modal-icono-${tono || "peligro"}` : ""}`} aria-hidden="true">
                <Icono nombre={icono || iconoDeVentana(titulo, peligro, !!onEnviar)} />
              </div>
              <div className="modal-titulos">
                <h2 className="modal-title" id="titulo-modal">
                  {titulo}
                </h2>
                {subtitulo && <p className="modal-subtitulo">{subtitulo}</p>}
              </div>
              <button type="button" className="btn-cerrar-modal" aria-label="Cerrar" onClick={onCerrar} disabled={enviando}>
                <Icono nombre="close" />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
                {onEnviar ? "Cancelar" : "Cerrar"}
              </button>
              {onEnviar && (
                <button type="submit" className={`btn ${botonPeligro ? "btn-danger" : "btn-marca"}`} disabled={enviando}>
                  <Icono nombre={iconoEnviar || (peligro ? "block" : "save")} />
                  {enviando ? "Guardando..." : textoEnviar}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
