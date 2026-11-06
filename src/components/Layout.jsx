// Diseño común de las pantallas con sesión: barra superior y contenido.
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { usuario, cerrarSesion, puede } = useAuth();

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark barra-marca">
        <div className="container">
          <NavLink className="navbar-brand titulo-marca" to="/">
            Los Cardones
          </NavLink>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#menu"
            aria-controls="menu"
            aria-expanded="false"
            aria-label="Abrir menú"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="menu">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <NavLink className="nav-link" to="/" end>
                  Inicio
                </NavLink>
              </li>
              {puede("ingredientes:leer") && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/ingredientes">
                    Ingredientes
                  </NavLink>
                </li>
              )}
            </ul>
            <div className="d-flex align-items-center gap-3">
              <span className="navbar-text">
                {usuario?.nombre}
                {usuario?.cargo ? ` · ${usuario.cargo}` : ""}
              </span>
              <button type="button" className="btn btn-outline-light btn-sm" onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
