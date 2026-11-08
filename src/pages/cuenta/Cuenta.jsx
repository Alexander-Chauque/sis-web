// Pantallas de la cuenta (Mi perfil, Cambiar contraseña, Mis permisos), con el diseño de Django:
// tarjeta centrada y el paisaje de cardones abajo.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
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
      {/* Paisaje decorativo: el CSS muestra el del modo activo, claro u oscuro */}
      <div className="cuenta-paisaje" aria-hidden="true">
        <img className="paisaje-claro" src="/img/paisaje_claro.webp" alt="" />
        <img className="paisaje-oscuro" src="/img/paisaje_oscuro.webp" alt="" />
      </div>
    </div>
  );
}

function iniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase() || "?";
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

export function MiPerfil() {
  const { usuario } = useAuth();
  const perfil = useCarga("/perfil/");
  const [editando, setEditando] = useState(false);
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  const p = perfil.datos;
  if (perfil.cargando && !p) return <Cargando />;
  if (!p) return <Alerta>{perfil.error}</Alerta>;

  const nombre = `${p.nombre_empleado} ${p.apellido_empleado}`.trim() || p.usuario;

  const editar = () => {
    setCorreo(p.correo);
    setTelefono(p.telefono);
    setError("");
    setEditando(true);
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const { data } = await api.patch("/perfil/", { correo: correo.trim(), telefono: telefono.trim() });
      perfil.setDatos(data);
      setEditando(false);
      setAviso("Tus datos se actualizaron correctamente.");
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PaginaCuenta icono="person" titulo="Mi perfil" subtitulo="Consulta y administra tu información personal.">
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <div className="perfil-cabecera">
        <span className="user-avatar perfil-avatar-grande" aria-hidden="true">
          {iniciales(nombre)}
        </span>
        <div>
          <h2>{nombre}</h2>
          <span className="cuenta-etiqueta">
            <Icono nombre="workspace_premium" /> {p.cargo || usuario?.cargo || "Usuario"}
          </span>
        </div>
      </div>

      {editando ? (
        <form className="cuenta-formulario" onSubmit={guardar} noValidate>
          {error && <p className="cuenta-error">{error}</p>}
          <CampoCuenta id="perfil-correo" icono="mail" etiqueta="Correo electrónico">
            <input id="perfil-correo" type="email" required maxLength={80} value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </CampoCuenta>
          <CampoCuenta id="perfil-telefono" icono="call" etiqueta="Teléfono">
            <input id="perfil-telefono" maxLength={20} placeholder="+54 387 456-7890" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </CampoCuenta>
          <div className="cuenta-botones">
            <button type="button" className="cuenta-btn cuenta-btn-secundario" onClick={() => setEditando(false)}>
              <Icono nombre="close" /> Cancelar
            </button>
            <button type="submit" className="cuenta-btn cuenta-btn-primario" disabled={guardando}>
              <Icono nombre="save" /> {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="perfil-cuenta-datos">
            <div>
              <dt>
                <Icono nombre="person" /> Usuario
              </dt>
              <dd>{p.usuario}</dd>
            </div>
            <div>
              <dt>
                <Icono nombre="mail" /> Correo electrónico
              </dt>
              <dd>{p.correo || "Sin cargar"}</dd>
            </div>
            <div>
              <dt>
                <Icono nombre="badge" /> Nombre completo
              </dt>
              <dd>{nombre}</dd>
            </div>
            <div>
              <dt>
                <Icono nombre="call" /> Teléfono
              </dt>
              <dd>{p.telefono || "Sin cargar"}</dd>
            </div>
          </dl>
          <div className="cuenta-botones">
            <button type="button" className="cuenta-btn cuenta-btn-secundario" onClick={editar}>
              <Icono nombre="edit" /> Editar datos
            </button>
          </div>
        </>
      )}
    </PaginaCuenta>
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
