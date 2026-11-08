// Piezas de los listados:
// panel de filtros a la izquierda, panel de resultados a la derecha,
// botones de acción con íconos y paginación numerada.
import { Link } from "react-router-dom";

import { OPCIONES_POR_PAGINA } from "../utils/formato";
import { Icono } from "./Icono";


export function ListadoLayout({ filtros, children }) {
  return (
    <div className="listado-layout">
      <aside className="filtros-panel no-imprimir">{filtros}</aside>
      <section className="tabla-panel">{children}</section>
    </div>
  );
}

// Formulario de filtros: los cambios se aplican con el botón (o Enter)
export function PanelFiltros({ onAplicar, onLimpiar, children }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAplicar();
      }}
    >
      <div className="filtros-header">
        <Icono nombre="filter_alt" />
        <h2>Filtros</h2>
      </div>
      {children}
      <button type="submit" className="btn-aplicar">
        <Icono nombre="filter_alt" /> Aplicar filtros
      </button>
      <button type="button" className="btn-limpiar" onClick={onLimpiar}>
        <Icono nombre="refresh" /> Limpiar filtros
      </button>
    </form>
  );
}

export function FiltroBuscar({ id, valor, onCambiar, placeholder, etiqueta = "Buscar" }) {
  return (
    <div className="filtro-grupo">
      <label htmlFor={id}>{etiqueta}</label>
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
    <fieldset className="filtro-grupo">
      <legend>{titulo}</legend>
      <div className={`checkboxes ${largo ? "checkboxes-largo" : ""}`}>
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
    </fieldset>
  );
}

// Rango de fechas "Desde / Hasta"
export function FiltroFechas({ titulo = "Rango de fecha", desde, hasta, onCambiar, maximo }) {
  return (
    <fieldset className="filtro-grupo">
      <legend>{titulo}</legend>
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
    </fieldset>
  );
}

// Lista desplegable con la opción "Todos"
export function FiltroLista({ id, titulo, todos = "Todos", opciones, valor, onCambiar }) {
  return (
    <div className="filtro-grupo">
      <label htmlFor={id}>{titulo}</label>
      <select id={id} className="form-select" value={valor} onChange={(e) => onCambiar(e.target.value)}>
        <option value="">{todos}</option>
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
