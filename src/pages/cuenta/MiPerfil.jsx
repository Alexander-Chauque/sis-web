// Mi perfil igual a Django (cuenta/mi_perfil.html): cabecera con avatar, mi día y tarjetas
// de contacto (se edita en la misma tarjeta), datos laborales y seguridad.
import { useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { Notificar } from "../../components/Mensajes";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import "../../perfil.css";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function iniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase() || "?";
}

function plural(n, palabra) {
  return n === 1 ? palabra : `${palabra}s`;
}

// "2026-03-01" → "marzo de 2026"
function mesYAnio(fecha) {
  const [anio, mes] = fecha.split("-");
  return `${MESES[Number(mes) - 1]} de ${anio}`;
}

function fechaCorta(fecha) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

function fechaHora(valor) {
  const d = new Date(valor);
  const dos = (n) => String(n).padStart(2, "0");
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

const primero = (valor) => [].concat(valor || [])[0];

export default function MiPerfil() {
  const perfil = useCarga("/perfil/");
  const [editando, setEditando] = useState(false);
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  const p = perfil.datos;
  if (perfil.cargando && !p) return <Cargando />;
  if (!p) return <Alerta>{perfil.error}</Alerta>;

  const nombre = `${p.nombre_empleado} ${p.apellido_empleado}`.trim() || p.usuario;
  const dia = p.mi_dia;

  const editar = () => {
    setCorreo(p.correo);
    setTelefono(p.telefono);
    setErrores({});
    setEditando(true);
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setErrores({});
    setGuardando(true);
    try {
      const { data } = await api.patch("/perfil/", { correo: correo.trim(), telefono: telefono.trim() });
      perfil.setDatos(data);
      setEditando(false);
      setAviso("Tus datos se actualizaron correctamente.");
    } catch (e) {
      const datos = e.response?.data;
      if (datos?.correo || datos?.telefono) setErrores({ correo: primero(datos.correo), telefono: primero(datos.telefono) });
      else setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="vista-perfil">
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error} onListo={() => setError("")} />

      {/* Quién soy */}
      <section className="perfil-hero" aria-labelledby="perfil-nombre">
        <span className="perfil-hero-avatar" aria-hidden="true">
          {iniciales(nombre)}
        </span>
        <div className="perfil-hero-texto">
          <h1 id="perfil-nombre">{nombre}</h1>
          <div className="perfil-hero-meta">
            <span className="perfil-cargo">
              <Icono nombre="workspace_premium" /> {p.cargo || "Usuario"}
            </span>
            <span>@{p.usuario}</span>
            {p.fecha_ingreso && <span>En Los Cardones desde {mesYAnio(p.fecha_ingreso)}</span>}
          </div>
        </div>
        <Link to="/cuenta/contrasena" className="btn btn-outline-secondary perfil-hero-accion">
          <Icono nombre="key" /> Cambiar contraseña
        </Link>
      </section>

      {p.debe_cambiar_contrasena && (
        <div className="perfil-aviso">
          <Icono nombre="lock_reset" />
          <span>
            <strong>Tenés una contraseña temporal.</strong> Cambiala por una propia para proteger tu cuenta.
          </span>
          <Link to="/cuenta/contrasena">Cambiar ahora</Link>
        </div>
      )}

      {/* Mi día */}
      {dia && (
        <section className="perfil-dia" aria-label="Tu actividad de hoy">
          <div className="perfil-dato-dia">
            <Icono nombre="receipt_long" />
            <div>
              <strong>{dia.comandas}</strong>
              <span>
                {plural(dia.comandas, "Comanda")} {plural(dia.comandas, "tomada")} hoy
              </span>
            </div>
          </div>
          <div className="perfil-dato-dia">
            <Icono nombre="table_restaurant" />
            <div>
              <strong>{dia.abiertas}</strong>
              <span>
                {plural(dia.abiertas, "Mesa")} {plural(dia.abiertas, "abierta")} ahora
              </span>
            </div>
          </div>
          <div className="perfil-dato-dia">
            <Icono nombre="payments" />
            <div>
              <strong>${Math.round(Number(dia.cobrado)).toLocaleString("es-AR")}</strong>
              <span>Cobrado por vos hoy</span>
            </div>
          </div>
        </section>
      )}

      <div className="perfil-grilla">
        {/* Contacto: lo único que cada uno puede cambiar */}
        <section className="perfil-tarjeta" aria-labelledby="perfil-contacto">
          <header className="perfil-tarjeta-cabecera">
            <h2 id="perfil-contacto">
              <Icono nombre="contact_mail" /> Datos de contacto
            </h2>
            {!editando && (
              <button type="button" className="perfil-editar" onClick={editar}>
                <Icono nombre="edit" /> Editar
              </button>
            )}
          </header>

          {editando ? (
            <form className="perfil-formulario" onSubmit={guardar} noValidate>
              <div className="grupo-campo">
                <label htmlFor="perfil-correo">
                  Correo electrónico <span className="text-danger">*</span>
                </label>
                <input id="perfil-correo" type="email" className={`form-control ${errores.correo ? "is-invalid" : ""}`} maxLength={80} value={correo} onChange={(e) => setCorreo(e.target.value)} />
                {errores.correo && <span className="cuenta-error">{errores.correo}</span>}
                <span className="texto-ayuda">Se usa para recuperar la contraseña.</span>
              </div>
              <div className="grupo-campo">
                <label htmlFor="perfil-telefono">Teléfono</label>
                <input id="perfil-telefono" className={`form-control ${errores.telefono ? "is-invalid" : ""}`} maxLength={20} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                {errores.telefono && <span className="cuenta-error">{errores.telefono}</span>}
              </div>
              <div className="perfil-botones">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-marca" disabled={guardando}>
                  <Icono nombre="save" /> {guardando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          ) : (
            <dl className="perfil-datos-lista">
              <div>
                <dt>Correo electrónico</dt>
                <dd>{p.correo || <span className="perfil-vacio">Sin cargar</span>}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{p.telefono || <span className="perfil-vacio">Sin cargar</span>}</dd>
              </div>
            </dl>
          )}
        </section>

        {/* Datos laborales: los carga el administrador */}
        <section className="perfil-tarjeta" aria-labelledby="perfil-laboral">
          <header className="perfil-tarjeta-cabecera">
            <h2 id="perfil-laboral">
              <Icono nombre="badge" /> Datos laborales
            </h2>
          </header>
          <dl className="perfil-datos-lista">
            <div>
              <dt>Cargo</dt>
              <dd>{p.cargo || "Sin cargo"}</dd>
            </div>
            <div>
              <dt>DNI</dt>
              <dd>{p.dni}</dd>
            </div>
            <div>
              <dt>Fecha de ingreso</dt>
              <dd>{fechaCorta(p.fecha_ingreso)}</dd>
            </div>
          </dl>
          <p className="perfil-nota">
            <Icono nombre="lock" /> Estos datos los carga el administrador. Si hay un error, avisale.
          </p>
        </section>

        {/* Seguridad */}
        <section className="perfil-tarjeta" aria-labelledby="perfil-seguridad">
          <header className="perfil-tarjeta-cabecera">
            <h2 id="perfil-seguridad">
              <Icono nombre="shield_person" /> Seguridad
            </h2>
          </header>
          <dl className="perfil-datos-lista">
            <div>
              <dt>Usuario para ingresar</dt>
              <dd>{p.usuario}</dd>
            </div>
            <div>
              <dt>Contraseña</dt>
              <dd className="perfil-fila-accion">
                <span aria-label="Oculta">••••••••</span>
                <Link to="/cuenta/contrasena">Cambiar</Link>
              </dd>
            </div>
            <div>
              <dt>Último ingreso</dt>
              <dd>{p.ultimo_ingreso ? fechaHora(p.ultimo_ingreso) : <span className="perfil-vacio">Primera vez</span>}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
