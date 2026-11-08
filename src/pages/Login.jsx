// Inicio de sesión
import { useState } from "react";
import { Navigate } from "react-router-dom";

import { Cargando } from "../components/Cargando";
import { Icono } from "../components/Icono";
import { useAuth } from "../context/AuthContext";
import { api, mensajeDeError, URL_BASE } from "../services/api";
import { AYUDA_CLAVE } from "../utils/formato";

// Las ondas
function Ondas() {
  return (
    <svg className="onda-svg" viewBox="0 0 500 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="gradNaranjaSup" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0951A" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
        <linearGradient id="gradNaranjaInf1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#E0951A" />
        </linearGradient>
        <linearGradient id="gradNaranjaInf2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0951A" />
          <stop offset="100%" stopColor="#C06C0F" />
        </linearGradient>
        <linearGradient id="gradBlanco" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" className="onda-blanca-arriba" />
          <stop offset="100%" className="onda-blanca-abajo" />
        </linearGradient>
      </defs>
      <path d="M0 210 C90 170 155 195 235 220 C330 250 410 315 500 325 L500 365 C400 350 325 290 235 260 C145 230 75 225 0 270 Z" fill="url(#gradNaranjaSup)" />
      <path d="M0 270 C75 225 145 230 235 260 C325 290 400 350 500 365" fill="none" stroke="#FFF8EC" strokeWidth="5" />
      <path d="M0 270 C75 225 145 230 235 260 C325 290 400 350 500 365 L500 650 C405 685 330 725 245 690 C155 655 80 610 0 645 Z" fill="url(#gradBlanco)" />
      <path d="M0 645 C80 610 155 655 245 690 C330 725 405 685 500 650 L500 690 C405 730 330 770 245 735 C155 700 80 655 0 690 Z" fill="url(#gradNaranjaInf1)" />
      <path d="M0 690 C80 655 155 700 245 735 C330 770 405 730 500 690 L500 725 C405 770 330 805 245 770 C155 735 80 690 0 730 Z" fill="url(#gradNaranjaInf2)" />
      <path d="M0 730 C80 690 155 735 245 770 C330 805 405 770 500 725" fill="none" stroke="#FFF8EC" strokeWidth="4" />
    </svg>
  );
}

function CampoClave({ id, etiqueta, valor, onCambiar, autoComplete, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grupo-campo-login">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="input-con-icono">
        <Icono nombre="lock" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          placeholder="••••••••"
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
        />
        <button type="button" className="toggle-password" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVisible(!visible)}>
          <Icono nombre={visible ? "visibility" : "visibility_off"} />
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const { usuario, cargando, iniciarSesion } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  // Con una contraseña temporal, primero hay que elegir una nueva
  const [debeCambiar, setDebeCambiar] = useState(false);
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
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
      if (e.response?.data?.codigo === "debe_cambiar_contrasena") setDebeCambiar(true);
      else setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  const cambiarYEntrar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (nueva !== confirmar) return setError("Las contraseñas nuevas no coinciden.");
    setEnviando(true);
    try {
      await api.post("/token/cambiar-clave/", { username: identificador.trim(), password: contrasena, nueva, confirmar });
      await iniciarSesion(identificador.trim(), nueva);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <main className="login-container">
      <div className="login-imagen">
        <div className="img-paisaje" />
        <div className="img-empanadas" />
        <Ondas />
        <div className="contenido-logo">
          <img src="/img/logo.png" alt="Los Cardones" className="logo-onda" />
          <p className="slogan">SABORES QUE NOS UNEN</p>
        </div>
      </div>

      <div className="login-formulario">
        <div className="form-contenido">
          <h1>{debeCambiar ? "Nueva contraseña" : "Iniciar sesión"}</h1>
          <p className="subtitulo-login">
            {debeCambiar ? "Tu contraseña es temporal. Antes de continuar, elegí una nueva." : "Accedé a tu cuenta para continuar con Los Cardones."}
          </p>
          <div className="linea-naranja" />

          {error && (
            <div className="alerta-error" role="alert">
              <Icono nombre="error" />
              {error}
            </div>
          )}

          {debeCambiar ? (
            <form onSubmit={cambiarYEntrar}>
              <CampoClave id="nueva" etiqueta="Contraseña nueva" valor={nueva} onCambiar={setNueva} autoComplete="new-password" autoFocus />
              <p className="ayuda-clave">{AYUDA_CLAVE}</p>
              <CampoClave id="confirmar" etiqueta="Repetí la contraseña nueva" valor={confirmar} onCambiar={setConfirmar} autoComplete="new-password" />
              <button type="submit" className="btn-login" disabled={enviando}>
                <Icono nombre="save" /> {enviando ? "Guardando..." : "Guardar e ingresar"}
              </button>
              <button
                type="button"
                className="btn-volver-login"
                onClick={() => {
                  setDebeCambiar(false);
                  setContrasena("");
                  setError("");
                }}
              >
                <Icono nombre="arrow_back" /> Volver
              </button>
            </form>
          ) : (
            <form onSubmit={enviar}>
              <div className="grupo-campo-login">
                <label htmlFor="identificador">Usuario o correo electrónico</label>
                <div className="input-con-icono">
                  <Icono nombre="mail" />
                  <input
                    id="identificador"
                    placeholder="ejemplo@correo.com"
                    autoComplete="username"
                    autoFocus
                    required
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                  />
                </div>
              </div>
              <CampoClave id="contrasena" etiqueta="Contraseña" valor={contrasena} onCambiar={setContrasena} autoComplete="current-password" />
              <div className="opciones-extra">
                {/* La recuperación por correo la hace Django: el enlace del correo abre sus páginas */}
                <a href={`${URL_BASE}/password-reset/`} className="olvide">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <button type="submit" className="btn-login" disabled={enviando}>
                <Icono nombre="login" /> {enviando ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>
          )}

          <div className="ayuda-admin">
            <Icono nombre="info" />
            <p>Si tenés problemas para acceder, contactá con el administrador del sistema.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
