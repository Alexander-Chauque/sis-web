// Inicio de sesión, igual al de Django (templates/login.html y static/css/login.css):
// la marca sobre la foto de la peña a la izquierda y la tarjeta con el formulario a la derecha.
import { useState } from "react";
import { Navigate } from "react-router-dom";

import "../login.css";
import { Cargando } from "../components/Cargando";
import { Icono } from "../components/Icono";
import { useAuth } from "../context/AuthContext";
import { api, mensajeDeError, tokens, URL_BASE } from "../services/api";
import { AYUDA_CLAVE } from "../utils/formato";

function CampoClave({ id, etiqueta, valor, onCambiar, autoComplete, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grupo-campo">
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

function AlertaLogin({ texto, onCerrar }) {
  if (!texto) return null;
  return (
    <div className="alerta alerta-error" role="alert">
      <Icono nombre="error" />
      <span className="alerta-texto">{texto}</span>
      <button type="button" className="alerta-cerrar" aria-label="Cerrar" onClick={onCerrar}>
        <Icono nombre="close" />
      </button>
    </div>
  );
}

export default function Login() {
  const { usuario, cargando, iniciarSesion } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [recordar, setRecordar] = useState(false);
  // Con una contraseña temporal, primero hay que elegir una nueva
  const [debeCambiar, setDebeCambiar] = useState(false);
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  if (cargando) return <Cargando />;
  if (usuario) return <Navigate to="/" replace />;

  const entrar = async (clave) => {
    tokens.recordar(recordar);
    await iniciarSesion(identificador.trim(), clave);
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await entrar(contrasena);
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
      await entrar(nueva);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <div className="vista-login">
      <div className="login-container">
        {/* Lado izquierdo: la marca sobre la foto de la peña */}
        <div className="login-marca">
          <img src="/img/logo.png" alt="Los Cardones" className="logo-marca" />
          <p className="slogan">SABORES QUE NOS UNEN</p>
          <p className="marca-frase">Tradición, música y gastronomía del norte argentino</p>
        </div>

        {/* Lado derecho: la tarjeta con el formulario */}
        <div className="login-formulario">
          <div className="tarjeta-login">
            <div className="tarjeta-aviso">
              <Icono nombre="verified_user" />
              Acceso exclusivo para el personal de la peña.
            </div>

            <div className="form-contenido">
              <h1>{debeCambiar ? "Nueva contraseña" : "¡Bienvenido de nuevo!"}</h1>
              <p className="subtitulo">
                {debeCambiar ? "Tu contraseña es temporal. Antes de continuar, elegí una nueva." : "Ingresá tus datos para continuar con Los Cardones."}
              </p>
              <div className="linea-naranja" />

              {debeCambiar ? (
                <form onSubmit={cambiarYEntrar}>
                  <AlertaLogin texto={error} onCerrar={() => setError("")} />
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
                  <AlertaLogin texto={error} onCerrar={() => setError("")} />

                  {/* Campo: correo o usuario */}
                  <div className="grupo-campo">
                    <label htmlFor="identificador">Correo electrónico</label>
                    <div className="input-con-icono">
                      <Icono nombre="mail" />
                      <input
                        id="identificador"
                        placeholder="ejemplo@correo.com"
                        autoComplete="username"
                        autoFocus
                        required
                        maxLength={254}
                        value={identificador}
                        onChange={(e) => setIdentificador(e.target.value)}
                      />
                    </div>
                  </div>

                  <CampoClave id="contrasena" etiqueta="Contraseña" valor={contrasena} onCambiar={setContrasena} autoComplete="current-password" />

                  {/* Recordar y olvidé contraseña */}
                  <div className="opciones-extra">
                    <label className="recordar">
                      <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                      <span>Recordar sesión</span>
                    </label>
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
        </div>

        {/* Dirección abajo a la izquierda */}
        <p className="login-direccion">
          <Icono nombre="location_on" />
          Balcarce 922 · Salta
        </p>
      </div>
    </div>
  );
}
