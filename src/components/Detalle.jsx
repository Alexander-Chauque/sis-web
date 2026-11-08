// Piezas de las ventanas "Ver detalle", con el diseño de las pantallas de detalle de Django
// (platos.css y empleados.css).
import { Icono } from "./Icono";

// Etiqueta chica arriba y el nombre grande: "NOMBRE DEL PLATO / Locro"
export function CabeceraDetalle({ etiqueta, titulo, children }) {
  return (
    <div className="detalle-cabecera">
      <div className="detalle-header-top">
        <span className="detalle-label">{etiqueta}</span>
        {children}
      </div>
      <h3 className="detalle-titulo">{titulo}</h3>
    </div>
  );
}

// Recuadros grises con ícono, etiqueta y valor. "destacada" lo pinta de naranja (ej. el precio).
export function Subtarjeta({ icono, etiqueta, children, destacada, ancha }) {
  return (
    <div className={`subtarjeta ${destacada ? "subtarjeta-destacada" : ""} ${ancha ? "subtarjeta-ancha" : ""}`}>
      <div className="subtarjeta-header">
        <Icono nombre={icono} className={destacada ? "icono-naranja" : "icono-gris"} />
        <span className="subtarjeta-label">{etiqueta}</span>
      </div>
      <div className={`subtarjeta-valor ${destacada ? "precio-valor" : ""} ${ancha ? "descripcion-texto" : ""}`}>{children}</div>
    </div>
  );
}

export function Subtarjetas({ children }) {
  return <div className="detalle-subtarjetas">{children}</div>;
}

// Título de una sección del detalle, con ícono y una línea de ayuda
export function SeccionDetalle({ icono, titulo, descripcion, children, extra }) {
  return (
    <section className="seccion-detalle">
      <div className="seccion-titulo">
        <Icono nombre={icono} />
        <div>
          <h4>{titulo}</h4>
          {descripcion && <p>{descripcion}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

// Dato con etiqueta arriba y el valor en un recuadro con ícono (detalle de empleado de Django)
export function Dato({ etiqueta, icono, children }) {
  return (
    <div className="dato-item">
      <span className="dato-label">{etiqueta}</span>
      <div className="dato-valor">
        {icono && <Icono nombre={icono} />}
        <span>{children}</span>
      </div>
    </div>
  );
}

export function GrillaDatos({ children }) {
  return <div className="grid-datos">{children}</div>;
}

// Cabecera oscura del perfil: iniciales, nombre, estado y cargo
export function PerfilCabecera({ iniciales, nombre, activo, textoActivo = "Activo", textoInactivo = "Inactivo", subtitulo }) {
  return (
    <div className="perfil-header">
      <div className="perfil-avatar" aria-hidden="true">
        {iniciales}
      </div>
      <div className="perfil-datos">
        <div className="perfil-nombre-estado">
          <h3>{nombre}</h3>
          <span className={`badge-header ${activo ? "badge-header-activo" : "badge-header-inactivo"}`}>
            <span className="punto" /> {activo ? textoActivo : textoInactivo}
          </span>
        </div>
        {subtitulo && <p className="perfil-cargo">{subtitulo}</p>}
      </div>
    </div>
  );
}
