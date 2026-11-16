import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { Cargando } from "./Cargando";
import { Icono } from "./Icono";
import { ProveedorMensajes } from "./Mensajes";
import { MENU } from "./menu";

const ANIO = new Date().getFullYear();

function iniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase() || "?";
}

function leerTema() {
  return document.documentElement.getAttribute("data-tema") === "oscuro";
}

function aplicarTema(oscuro) {
  const raiz = document.documentElement;
  if (oscuro) {
    raiz.setAttribute("data-tema", "oscuro");
    raiz.setAttribute("data-bs-theme", "dark");
  } else {
    raiz.removeAttribute("data-tema");
    raiz.removeAttribute("data-bs-theme");
  }
  try {
    localStorage.setItem("tema", oscuro ? "oscuro" : "claro");
  } catch {
    // Sin almacenamiento, el tema dura hasta recargar
  }
}

const ESCRITORIO = "(min-width: 1024px)";

// En escritorio el menú queda siempre a la vista
function useEsEscritorio() {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia(ESCRITORIO);
      consulta.addEventListener("change", avisar);
      return () => consulta.removeEventListener("change", avisar);
    },
    () => window.matchMedia(ESCRITORIO).matches,
  );
}

// Opciones agrupadas por sección (Inventario, Salón, Finanzas, Personal, Control)
function agruparPorSeccion(grupos) {
  const secciones = [];
  grupos.forEach((g) => {
    const ultima = secciones[secciones.length - 1];
    if (ultima && ultima.titulo === g.seccion) ultima.opciones.push(...g.opciones);
    else secciones.push({ titulo: g.seccion, opciones: [...g.opciones] });
  });
  return secciones;
}

function MenuLateral({ abierto, onCerrar, grupos }) {
  const escritorio = useEsEscritorio();
  const visible = abierto || escritorio;
  const clase = ({ isActive }) => `sidebar-item ${isActive ? "activo" : ""}`;

  return (
    <>
      <aside className={`sidebar no-imprimir ${abierto ? "activo" : ""}`} aria-label="Menú principal" aria-hidden={!visible} inert={!visible}>
        <div className="sidebar-header">
          <Link to="/" onClick={onCerrar}>
            <img src="/img/logo.png" alt="Los Cardones" className="sidebar-logo" />
          </Link>
          <button type="button" className="btn-cerrar-sidebar" aria-label="Cerrar menú" onClick={onCerrar}>
            <Icono nombre="close" />
          </button>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={clase} onClick={onCerrar}>
            <Icono nombre="home" /> Inicio
          </NavLink>
          {agruparPorSeccion(grupos).map((s) => (
            <div key={s.titulo} className="sidebar-seccion" role="group" aria-label={s.titulo}>
              <p className="sidebar-etiqueta" aria-hidden="true">
                {s.titulo}
              </p>
              {s.opciones.map((o) => (
                <NavLink key={o.a} to={o.a} className={clase} onClick={onCerrar}>
                  <Icono nombre={o.icono} /> {o.texto}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className={`overlay-sidebar ${abierto ? "activo" : ""}`} onClick={onCerrar} aria-hidden="true" />
    </>
  );
}

function MenuUsuario({ usuario, cerrarSesion }) {
  const [abierto, setAbierto] = useState(false);
  const [oscuro, setOscuro] = useState(leerTema);
  const caja = useRef(null);
  const boton = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alTocar = (e) => {
      if (!caja.current?.contains(e.target)) setAbierto(false);
    };
    const alPresionar = (e) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("mousedown", alTocar);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("mousedown", alTocar);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  const cambiarTema = () => {
    aplicarTema(!oscuro);
    setOscuro(!oscuro);
  };

  const opcion = (a, icono, texto) => (
    <Link to={a} className="panel-usuario-item" onClick={() => setAbierto(false)}>
      <Icono nombre={icono} /> {texto}
    </Link>
  );

  return (
    <div className="menu-usuario" ref={caja}>
      <button
        type="button"
        className="user-dropdown"
        ref={boton}
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls="panel-usuario"
        onClick={() => setAbierto(!abierto)}
      >
        <span className="user-avatar">{iniciales(usuario?.nombre)}</span>
        <span className="user-cargo">{usuario?.cargo || "Usuario"}</span>
        <Icono nombre="expand_more" className="dropdown-arrow" />
      </button>
      {abierto && (
        <div className="panel-usuario" id="panel-usuario">
          <div className="panel-usuario-cabecera">
            <span className="user-avatar panel-usuario-avatar">{iniciales(usuario?.nombre)}</span>
            <div>
              <strong>{usuario?.nombre || usuario?.usuario}</strong>
              <small>
                {usuario?.usuario} · {usuario?.cargo || "Usuario"}
              </small>
            </div>
          </div>
          {opcion("/cuenta/perfil", "person", "Mi perfil")}
          {opcion("/cuenta/contrasena", "key", "Cambiar contraseña")}
          {opcion("/cuenta/permisos", "verified_user", "Mis permisos")}
          <button type="button" className="panel-usuario-item" role="switch" aria-checked={oscuro} onClick={cambiarTema}>
            <Icono nombre="dark_mode" /> Modo oscuro
            <span className="interruptor" aria-hidden="true" />
          </button>
          <hr className="panel-usuario-separador" />
          <button type="button" className="panel-usuario-item panel-usuario-salir" onClick={cerrarSesion}>
            <Icono nombre="power_settings_new" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

// Pie de página: una sola línea discreta, como en Django
function Pie() {
  return (
    <footer className="footer pie-simple no-imprimir">
      <p>Los Cardones · Sistema de gestión gastronómica · {ANIO}</p>
    </footer>
  );
}

export default function Layout() {
  const { usuario, cerrarSesion, puede } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const grupos = MENU.map((g) => ({ ...g, opciones: g.opciones.filter((o) => puede(o.permiso)) })).filter((g) => g.opciones.length);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPresionar = (e) => e.key === "Escape" && setMenuAbierto(false);
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [menuAbierto]);

  return (
    <>
      <a className="visually-hidden-focusable btn btn-light position-absolute m-2" href="#contenido">
        Saltar al contenido
      </a>
      <MenuLateral abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} grupos={grupos} />
      <div className="contenido-principal">
        <header className="topbar no-imprimir">
          <div className="topbar-left">
            <button type="button" className="btn-hamburguesa" aria-label="Abrir menú" aria-expanded={menuAbierto} onClick={() => setMenuAbierto(true)}>
              <Icono nombre="menu" />
            </button>
            <Link to="/">
              <img src="/img/logo.png" alt="Los Cardones" className="logo-topbar" />
            </Link>
          </div>
          <div className="navbar-user">
            <MenuUsuario usuario={usuario} cerrarSesion={cerrarSesion} />
          </div>
        </header>
        <main className="contenido" id="contenido">
          {/* Los mensajes van arriba de todo, a lo ancho, como en Django */}
          <ProveedorMensajes>
            <div className="contenedor-pagina">
              {/* Para las pantallas que se descargan al abrirlas (ej. Reportes) */}
              <Suspense fallback={<Cargando />}>
                <Outlet />
              </Suspense>
            </div>
          </ProveedorMensajes>
        </main>
        <Pie />
      </div>
    </>
  );
}
