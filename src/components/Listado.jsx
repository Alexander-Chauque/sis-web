// Piezas de los listados:
// barra de filtros arriba y resultados abajo,
// botones de acción con íconos y paginación numerada.
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { OPCIONES_POR_PAGINA } from "../utils/formato";
import { Icono } from "./Icono";


export function ListadoLayout({ filtros, children }) {
  return (
    <div className="listado-layout listado-layout--barra">
      <aside className="filtros-panel no-imprimir">{filtros}</aside>
      <section className="tabla-panel">{children}</section>
    </div>
  );
}

// Formulario de filtros en una barra arriba de la tabla: se aplican con el botón (o Enter).
// En celular la barra se pliega detrás del título "Filtros".
export function PanelFiltros({ onAplicar, onLimpiar, children }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <form
      className={abierto ? "filtros-abiertos" : ""}
      onSubmit={(e) => {
        e.preventDefault();
        onAplicar();
      }}
    >
      <button type="button" className="filtros-header" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <Icono nombre="filter_alt" />
        <h2>Filtros</h2>
        <Icono nombre={abierto ? "expand_less" : "expand_more"} className="filtros-header-flecha" />
      </button>
      {children}
      <button type="submit" className="btn-aplicar">
        <Icono nombre="filter_alt" /> Aplicar
      </button>
      <button type="button" className="btn-limpiar" onClick={onLimpiar}>
        <Icono nombre="refresh" /> Limpiar
      </button>
    </form>
  );
}

// Botón de la barra que abre una lista (casillas o fechas)
function Desplegable({ titulo, cantidad, clase = "", children }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!abierto) return undefined;
    const alTocar = (e) => {
      if (!caja.current?.contains(e.target)) setAbierto(false);
    };
    const alPresionar = (e) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", alTocar);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("mousedown", alTocar);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  return (
    <div className="filtro-grupo filtro-desplegable" ref={caja}>
      <button
        type="button"
        className={`filtro-desplegable-boton ${cantidad ? "con-filtros" : ""}`}
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto(!abierto)}
      >
        <span>{titulo}</span>
        {!!cantidad && <span className="filtro-desplegable-contador">{cantidad}</span>}
        <Icono nombre="expand_more" />
      </button>
      <div id={id} className={`filtro-desplegable-lista ${clase}`} hidden={!abierto} role="group" aria-label={titulo}>
        {children}
      </div>
    </div>
  );
}

export function FiltroBuscar({ id, valor, onCambiar, placeholder, etiqueta = "Buscar" }) {
  return (
    <div className="filtro-grupo filtro-buscar">
      <label htmlFor={id} className="visually-hidden">
        {etiqueta}
      </label>
      <div className="input-buscar">
        <Icono nombre="search" />
        <input id={id} type="search" placeholder={placeholder} value={valor} onChange={(e) => onCambiar(e.target.value)} />
      </div>
    </div>
  );
}

// Casillas con la opción "Todos": sin ninguna elegida, se muestran todos
export function FiltroCasillas({ titulo, todos = "Todos", opciones, elegidos, onCambiar, largo }) {
  const alternar = (valor) => onCambiar(elegidos.includes(valor) ? elegidos.filter((v) => v !== valor) : [...elegidos, valor]);
  return (
    <Desplegable titulo={titulo} cantidad={elegidos.length} clase={largo ? "checkboxes-largo" : ""}>
      <div className="checkboxes">
        <label className="checkbox-item">
          <input type="checkbox" checked={!elegidos.length} onChange={() => onCambiar([])} />
          {todos}
        </label>
        {opciones.map((o) => (
          <label className="checkbox-item" key={o.valor}>
            <input type="checkbox" checked={elegidos.includes(o.valor)} onChange={() => alternar(o.valor)} />
            {o.texto}
          </label>
        ))}
      </div>
    </Desplegable>
  );
}

// Rango de fechas "Desde / Hasta"
export function FiltroFechas({ titulo = "Rango de fecha", desde, hasta, onCambiar, maximo }) {
  return (
    <Desplegable titulo={titulo} cantidad={[desde, hasta].filter(Boolean).length} clase="filtro-fechas-lista">
      <div className="filtro-fechas">
        <label>
          <span>Desde</span>
          <input type="date" className="form-control" max={hasta || maximo} value={desde} onChange={(e) => onCambiar({ desde: e.target.value, hasta })} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" className="form-control" min={desde || undefined} max={maximo} value={hasta} onChange={(e) => onCambiar({ desde, hasta: e.target.value })} />
        </label>
      </div>
    </Desplegable>
  );
}

// Lista desplegable con la opción "Todos"
export function FiltroLista({ id, titulo, todos = "Todos", opciones, valor, onCambiar }) {
  return (
    <div className="filtro-grupo filtro-lista">
      <label htmlFor={id} className="visually-hidden">
        {titulo}
      </label>
      <select id={id} className={`form-select ${valor ? "con-filtros" : ""}`} value={valor} onChange={(e) => onCambiar(e.target.value)}>
        <option value="">
          {titulo}: {todos.toLowerCase()}
        </option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CabeceraResultados({ porPagina, onPorPagina, titulo = "Resultados" }) {
  return (
    <div className="tabla-header">
      <h2>{titulo}</h2>
      <label className="mostrar-registros">
        Mostrar
        <select value={porPagina} onChange={(e) => onPorPagina(Number(e.target.value))}>
          {OPCIONES_POR_PAGINA.map((n) => (
            <option key={n} value={n}>
              {n} registros
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// Números de página alrededor de la actual
function paginasVisibles(pagina, paginas) {
  const desde = Math.max(1, Math.min(pagina - 2, paginas - 4));
  const hasta = Math.min(paginas, desde + 4);
  return Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
}

export function PaginacionNumeros({ pagina, porPagina, total, nombre, onPagina }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total ? (pagina - 1) * porPagina + 1 : 0;
  const hasta = Math.min(total, pagina * porPagina);
  return (
    <div className="paginacion no-imprimir">
      <span className="paginacion-info">
        Mostrando {desde} a {hasta} de {total} {nombre}
      </span>
      {paginas > 1 && (
        <nav className="paginacion-botones" aria-label="Páginas">
          {pagina > 1 && (
            <button type="button" className="paginacion-btn" aria-label="Página anterior" onClick={() => onPagina(pagina - 1)}>
              <Icono nombre="chevron_left" />
            </button>
          )}
          {paginasVisibles(pagina, paginas).map((n) => (
            <button
              key={n}
              type="button"
              className={`paginacion-btn ${n === pagina ? "pagina-activa" : ""}`}
              aria-current={n === pagina ? "page" : undefined}
              onClick={() => onPagina(n)}
            >
              {n}
            </button>
          ))}
          {pagina < paginas && (
            <button type="button" className="paginacion-btn" aria-label="Página siguiente" onClick={() => onPagina(pagina + 1)}>
              <Icono nombre="chevron_right" />
            </button>
          )}
        </nav>
      )}
    </div>
  );
}

const ACCIONES = {
  ver: { icono: "visibility", clase: "btn-detalle" },
  editar: { icono: "edit", clase: "btn-editar" },
  desactivar: { icono: "toggle_off", clase: "btn-baja" },
  activar: { icono: "toggle_on", clase: "btn-reactivar" },
  eliminar: { icono: "delete", clase: "btn-clave" },
};

// Botón cuadrado con ícono de las tablas de Django (ver, editar, dar de baja, eliminar).
export function BotonAccion({ tipo, titulo, onClick, a, disabled, icono: otroIcono }) {
  const { icono: iconoDelTipo, clase } = ACCIONES[tipo];
  const icono = otroIcono || iconoDelTipo;
  if (a && !disabled) {
    return (
      <Link to={a} className={`btn-icon ${clase}`} title={titulo} aria-label={titulo}>
        <Icono nombre={icono} />
      </Link>
    );
  }
  return (
    <button type="button" className={`btn-icon ${clase}`} title={titulo} aria-label={titulo} onClick={onClick} disabled={disabled}>
      <Icono nombre={icono} />
    </button>
  );
}
