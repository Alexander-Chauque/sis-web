import { useState } from "react";
import { Navigate } from "react-router-dom";

import { Cargando } from "../components/Cargando";
import { useAuth } from "../context/AuthContext";
import { mensajeDeError } from "../services/api";

export default function Login() {
  const { usuario, cargando, iniciarSesion } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  if (cargando) return <Cargando />;
  if (usuario) return <Navigate to="/" replace />;

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await iniciarSesion(identificador.trim(), contrasena);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <main className="pantalla-login">
      <div className="card tarjeta-login shadow-sm">
        <div className="card-body p-4">
          <h1 className="titulo-marca h3 text-center mb-1">Los Cardones</h1>
          <p className="text-secondary text-center mb-4">Ingresá al sistema</p>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={enviar}>
            <div className="mb-3">
              <label htmlFor="identificador" className="form-label">
                Usuario o correo
              </label>
              <input
                id="identificador"
                className="form-control"
                autoComplete="username"
                autoFocus
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="contrasena" className="form-label">
                Contraseña
              </label>
              <input
                id="contrasena"
                type="password"
                className="form-control"
                autoComplete="current-password"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-marca w-100" disabled={enviando}>
              {enviando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
