// Pantallas de la cuenta (Cambiar contraseña, Mis permisos; Mi perfil está en MiPerfil.jsx):
// tarjeta centrada, sin imágenes de fondo.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Icono } from "../../components/Icono";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { api, mensajeDeError } from "../../services/api";

function PaginaCuenta({ icono, titulo, subtitulo, children }) {
  return (
    <div className="cuenta-pagina">
      <header className="cuenta-encabezado">
        <Icono nombre={icono} />
        <div>
          <h1>{titulo}</h1>
          <p>{subtitulo}</p>
        </div>
      </header>
      <section className="cuenta-tarjeta">{children}</section>
    </div>
  );
}

function CampoCuenta({ id, icono, etiqueta, children }) {
  return (
    <div className="cuenta-campo">
      <label htmlFor={id}>
        <Icono nombre={icono} /> {etiqueta}
      </label>
      <div>{children}</div>
    </div>
  );
}

// Campo de contraseña con el ojito para mostrarla
function CampoClave({ id, etiqueta, valor, onCambiar, autoComplete, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <CampoCuenta id={id} icono="lock" etiqueta={etiqueta}>
      <div className="clave-campo">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
        />
        <button type="button" className="clave-ver" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible(!visible)}>
          <Icono nombre={visible ? "visibility" : "visibility_off"} />
        </button>
      </div>
    </CampoCuenta>
  );
}

export function CambiarContrasena() {
  const { usuario, iniciarSesion } = useAuth();
  const navegar = useNavigate();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (nueva !== confirmar) return setError("Las contraseñas nuevas no coinciden.");
    setEnviando(true);
    try {
      await api.post("/perfil/contrasena/", { actual, nueva, confirmar });
      await iniciarSesion(usuario.usuario, nueva);
      setActual("");
      setNueva("");
      setConfirmar("");
      setAviso("Tu contraseña se actualizó correctamente.");
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PaginaCuenta icono="key" titulo="Cambiar contraseña" subtitulo="Actualiza tu contraseña de acceso.">
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <form className="cuenta-formulario" onSubmit={enviar} noValidate>
        {error && <p className="cuenta-error">{error}</p>}
        <CampoClave id="clave-actual" etiqueta="Contraseña actual" valor={actual} onCambiar={setActual} autoComplete="current-password" autoFocus />
        <CampoClave id="clave-nueva" etiqueta="Nueva contraseña" valor={nueva} onCambiar={setNueva} autoComplete="new-password" />
        <CampoClave id="clave-confirmar" etiqueta="Confirmar nueva contraseña" valor={confirmar} onCambiar={setConfirmar} autoComplete="new-password" />
        <p className="cuenta-aviso">
          <Icono nombre="info" />
          La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula, un número y un carácter especial.
        </p>
        <div className="cuenta-botones">
          <button type="button" className="cuenta-btn cuenta-btn-secundario" onClick={() => navegar("/cuenta/perfil")}>
            <Icono nombre="close" /> Cancelar
          </button>
          <button type="submit" className="cuenta-btn cuenta-btn-primario" disabled={enviando}>
            <Icono nombre="save" /> {enviando ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </div>
      </form>
    </PaginaCuenta>
  );
}

// Los mismos módulos e íconos que "Mis permisos" de Django, más los de finanzas
const MODULOS = [
  ["platos", "Platos", "restaurant"],
  ["bebidas", "Bebidas", "local_bar"],
  ["ingredientes", "Ingredientes", "grocery"],
  ["categorias", "Categorías", "category"],
  ["empleados", "Empleados", "groups"],
  ["cargos", "Cargos", "badge"],
  ["mesas", "Mesas", "table_restaurant"],
  ["comandas", "Comandas", "receipt_long"],
  ["caja", "Caja", "point_of_sale"],
  ["ventas", "Ventas", "payments"],
  ["reportes", "Reportes", "bar_chart"],
  ["auditoria", "Auditoría", "history"],
];
const ACCIONES = [
  ["leer", "Ver"],
  ["escribir", "Crear"],
  ["modificar", "Editar"],
  ["eliminar", "Eliminar"],
];

export function MisPermisos() {
  const { usuario, puede } = useAuth();
  const esAdmin = usuario.nivel >= 5;

  return (
    <PaginaCuenta icono="verified_user" titulo="Mis permisos" subtitulo="Consulta los módulos y acciones que tienes asignados.">
      <div className="permisos-banner">
        <Icono nombre="workspace_premium" />
        <div>
          <strong>{usuario.cargo || "Sin cargo asignado"}</strong>
          <small>
            {esAdmin
              ? "Acceso completo al sistema."
              : usuario.cargo
                ? `Nivel de acceso ${usuario.nivel}. Si necesitás otro permiso, pedíselo a un administrador.`
                : "Pedile a un administrador que te asigne un cargo."}
          </small>
        </div>
      </div>
      <h2 className="permisos-titulo">Permisos por módulo</h2>
      <ul className="permisos-lista">
        {MODULOS.map(([modulo, nombre, icono]) => {
          const permitidas = ACCIONES.filter(([accion]) => puede(`${modulo}:${accion}`));
          return (
            <li key={modulo}>
              <span className="permisos-modulo">
                <Icono nombre={icono} /> {nombre}
              </span>
              <span className="permisos-acciones">
                {permitidas.length ? (
                  permitidas.map(([accion, etiqueta]) => (
                    <span key={accion} className="permiso-chip permiso-si">
                      <Icono nombre="check" /> {etiqueta}
                    </span>
                  ))
                ) : (
                  <span className="permiso-chip permiso-no">Sin acceso</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </PaginaCuenta>
  );
}
