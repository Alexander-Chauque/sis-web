// Listado de empleados, con el diseño de Django: filtros a la izquierda y tabla a la derecha.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { Dato, GrillaDatos, PerfilCabecera, SeccionDetalle } from "../../components/Detalle";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";
import { AYUDA_CLAVE, fecha, normalizar } from "../../utils/formato";

const ESTADOS = [
  { valor: "si", texto: "Activo" },
  { valor: "no", texto: "Inactivo" },
];
const FILTROS_VACIOS = { buscar: "", cargos: [], estados: [] };
const SIN_NIVEL_EMPLEADO = "No podés gestionar a un empleado con un nivel de acceso igual o superior al tuyo.";

function FormularioEmpleado({ empleado, cargos, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({
    nombre_empleado: empleado?.nombre_empleado || "",
    apellido_empleado: empleado?.apellido_empleado || "",
    dni: empleado?.dni || "",
    telefono: empleado?.telefono || "",
    correo: empleado?.correo || "",
    cargo: empleado?.cargo ? String(empleado.cargo) : "",
    contrasena: "",
    confirmar_contrasena: "",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const guardar = async () => {
    setError("");
    if (!datos.nombre_empleado.trim() || !datos.apellido_empleado.trim() || !datos.dni.trim() || !datos.correo.trim() || !datos.cargo) {
      return setError("Completá nombre, apellido, DNI, correo y cargo.");
    }
    if (!empleado && datos.contrasena !== datos.confirmar_contrasena) return setError("Las contraseñas no coinciden.");
    const cuerpo = { ...datos, cargo: Number(datos.cargo) };
    if (empleado) {
      delete cuerpo.contrasena;
      delete cuerpo.confirmar_contrasena;
    }
    setGuardando(true);
    try {
      const { data } = empleado ? await api.patch(`/empleados/${empleado.id_empleado}/`, cuerpo) : await api.post("/empleados/", cuerpo);
      onGuardado(data, !empleado);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={empleado ? `Editar a ${empleado.nombre_empleado} ${empleado.apellido_empleado}` : "Nuevo empleado"} onCerrar={onCerrar} onEnviar={guardar} enviando={guardando} grande>
      <Alerta>{error}</Alerta>
      <div className="row g-3">
        <Campo id="emp-nombre" etiqueta="Nombre *" className="col-12 col-md-6">
          <input id="emp-nombre" className="form-control" maxLength={100} required value={datos.nombre_empleado} onChange={cambiar("nombre_empleado")} />
        </Campo>
        <Campo id="emp-apellido" etiqueta="Apellido *" className="col-12 col-md-6">
          <input id="emp-apellido" className="form-control" maxLength={100} required value={datos.apellido_empleado} onChange={cambiar("apellido_empleado")} />
        </Campo>
        <Campo id="emp-dni" etiqueta="DNI *" className="col-6 col-md-4">
          <input id="emp-dni" className="form-control" inputMode="numeric" maxLength={10} required value={datos.dni} onChange={cambiar("dni")} />
        </Campo>
        <Campo id="emp-telefono" etiqueta="Teléfono" className="col-6 col-md-4">
          <input id="emp-telefono" className="form-control" maxLength={20} value={datos.telefono} onChange={cambiar("telefono")} />
        </Campo>
        <Campo id="emp-cargo" etiqueta="Cargo *" className="col-12 col-md-4">
          <select id="emp-cargo" className="form-select" required value={datos.cargo} onChange={cambiar("cargo")}>
            <option value="">Elegí</option>
            {cargos
              .filter((c) => c.gestionable || String(c.id_cargo) === datos.cargo)
              .map((c) => (
                <option key={c.id_cargo} value={c.id_cargo} disabled={!c.gestionable}>
                  {c.nombre_cargo}
                </option>
              ))}
          </select>
        </Campo>
        <Campo id="emp-correo" etiqueta="Correo *" className="col-12">
          <input id="emp-correo" type="email" className="form-control" maxLength={80} required value={datos.correo} onChange={cambiar("correo")} />
        </Campo>
        {!empleado && (
          <>
            <Campo id="emp-clave" etiqueta="Contraseña *" className="col-12 col-md-6" ayuda={AYUDA_CLAVE}>
              <input id="emp-clave" type="password" autoComplete="new-password" className="form-control" required value={datos.contrasena} onChange={cambiar("contrasena")} />
            </Campo>
            <Campo id="emp-clave2" etiqueta="Confirmar contraseña *" className="col-12 col-md-6">
              <input id="emp-clave2" type="password" autoComplete="new-password" className="form-control" required value={datos.confirmar_contrasena} onChange={cambiar("confirmar_contrasena")} />
            </Campo>
          </>
        )}
      </div>
      {!empleado && <p className="small text-secondary mb-0">El usuario se genera solo, con el apellido y la inicial del nombre.</p>}
    </Modal>
  );
}

function RestablecerClave({ empleado, onCerrar, onListo }) {
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setError("");
    if (nueva !== confirmar) return setError("Las contraseñas no coinciden.");
    setEnviando(true);
    try {
      const { data } = await api.post(`/empleados/${empleado.id_empleado}/contrasena/`, { nueva_contrasena: nueva, confirmar_contrasena: confirmar });
      onListo(data.detail);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={`Restablecer contraseña de ${empleado.user_auto}`} onCerrar={onCerrar} onEnviar={enviar} enviando={enviando} textoEnviar="Restablecer">
      <Alerta>{error}</Alerta>
      <p className="small">Es una contraseña temporal: la persona deberá cambiarla la próxima vez que entre.</p>
      <Campo id="clave-temp" etiqueta="Contraseña temporal *" ayuda={AYUDA_CLAVE}>
        <input id="clave-temp" type="password" autoComplete="new-password" className="form-control" required value={nueva} onChange={(e) => setNueva(e.target.value)} />
      </Campo>
      <Campo id="clave-temp2" etiqueta="Confirmar *" className="mb-0">
        <input id="clave-temp2" type="password" autoComplete="new-password" className="form-control" required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
      </Campo>
    </Modal>
  );
}

export default function Empleados() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const empleados = useCarga("/empleados/");
  const cargos = useCarga(puede("empleados:escribir") || puede("empleados:modificar") ? "/empleados/cargos/" : null);
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [formulario, setFormulario] = useState(null);
  const [restableciendo, setRestableciendo] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null);

  const lista = useMemo(() => empleados.datos || [], [empleados.datos]);
  // Los cargos que aparecen en la lista, para las casillas del filtro
  const opcionesCargo = useMemo(() => {
    const vistos = new Map();
    lista.forEach((e) => vistos.set(e.cargo_nombre || "Sin cargo", true));
    return [...vistos.keys()].sort().map((nombre) => ({ valor: nombre, texto: nombre }));
  }, [lista]);
  const filtrados = useMemo(() => {
    const texto = normalizar(filtros.buscar.trim());
    return lista.filter((e) => {
      if (filtros.estados.length && !filtros.estados.includes(e.estado ? "si" : "no")) return false;
      if (filtros.cargos.length && !filtros.cargos.includes(e.cargo_nombre || "Sin cargo")) return false;
      return [e.nombre_empleado, e.apellido_empleado, e.dni, e.user_auto, e.correo].some((v) => normalizar(v).includes(texto));
    });
  }, [lista, filtros]);
  const paginado = usePaginaLocal(filtrados, JSON.stringify(filtros));

  const reemplazar = (empleado) => empleados.setDatos((l) => l.map((e) => (e.id_empleado === empleado.id_empleado ? empleado : e)));

  const cambiarEstado = async (e) => {
    const baja = e.estado;
    const respuesta = await confirmar({
      titulo: baja ? "¿Dar de baja al empleado?" : "¿Reactivar al empleado?",
      subtitulo: baja ? "El empleado dejará de tener acceso al sistema." : "El empleado volverá a tener acceso al sistema.",
      icono: baja ? "person_remove" : "person_add",
      tono: baja ? "peligro" : "exito",
      peligro: baja,
      resumen: {
        nombre: `${e.nombre_empleado} ${e.apellido_empleado}`,
        detalle: e.cargo_nombre || "Sin cargo",
        estado: { texto: e.estado ? "Activo" : "Inactivo", activo: e.estado },
      },
      motivo: { placeholder: "Ej.: renuncia, licencia, suspensión..." },
      importante: baja
        ? [
            "El empleado no podrá iniciar sesión.",
            "No podrá ser asignado a nuevas comandas.",
            "Se conservará su historial en el sistema.",
            { texto: "Esta acción no se puede deshacer.", fuerte: true },
          ]
        : ["El empleado podrá iniciar sesión nuevamente.", "Podrá ser asignado a nuevas comandas.", "Su historial se mantendrá intacto."],
      textoConfirmar: baja ? "Sí, dar de baja" : "Sí, reactivar",
      iconoConfirmar: "sync",
    });
    if (!respuesta) return;
    setOcupado(e.id_empleado);
    setError("");
    try {
      const { data } = await api.post(`/empleados/${e.id_empleado}/estado/`, { motivo: respuesta.motivo });
      reemplazar(data);
      setAviso(data.estado ? "Empleado reactivado." : "Empleado dado de baja. Ya no puede entrar al sistema.");
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setOcupado(null);
    }
  };

  const alGuardar = (empleado, esNuevo) => {
    if (esNuevo) empleados.setDatos((l) => [...l, empleado]);
    else reemplazar(empleado);
    setAviso(esNuevo ? `Empleado creado. Su usuario es "${empleado.user_auto}".` : "Los datos se guardaron.");
    setFormulario(null);
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Empleados" subtitulo="Administra las cuentas y el acceso del personal." icono="groups">
        {puede("cargos:leer") && (
          <>
            <Link className="btn btn-outline-secondary" to="/cargos">
              <Icono nombre="work" /> Cargos
            </Link>
            <Link className="btn btn-outline-secondary" to="/permisos">
              <Icono nombre="shield_person" /> Permisos
            </Link>
          </>
        )}
        {puede("empleados:escribir") && (
          <button type="button" className="btn btn-marca" disabled={!cargos.datos} onClick={() => setFormulario({ nuevo: true })}>
            <Icono nombre="add" /> Nuevo empleado
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || empleados.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros(borrador)}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              setFiltros(FILTROS_VACIOS);
            }}
          >
            <FiltroBuscar id="buscar-empleado" valor={borrador.buscar} onCambiar={(v) => setBorrador({ ...borrador, buscar: v })} placeholder="Nombre, usuario o DNI..." />
            <FiltroCasillas titulo="Cargo" opciones={opcionesCargo} elegidos={borrador.cargos} onCambiar={(v) => setBorrador({ ...borrador, cargos: v })} />
            <FiltroCasillas titulo="Estado" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {empleados.cargando ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Apellido</th>
                  <th scope="col">Cargo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((e) => (
                  <tr key={e.id_empleado}>
                    <td className="fw-semibold">
                      {e.user_auto}
                      {e.es_yo && <span className="badge text-bg-light ms-1">Vos</span>}
                    </td>
                    <td>{e.nombre_empleado}</td>
                    <td>{e.apellido_empleado}</td>
                    <td>{e.cargo_nombre || "Sin cargo"}</td>
                    <td>
                      <span className={`badge ${e.estado ? "text-bg-success" : "text-bg-danger"}`}>{e.estado ? "Activo" : "Inactivo"}</span>
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="ver" titulo={`Ver a ${e.nombre_empleado} ${e.apellido_empleado}`} onClick={() => setDetalle(e)} />
                        {puede("empleados:modificar") && (
                          <>
                            <BotonAccion
                              tipo="editar"
                              titulo={`Modificar a ${e.nombre_empleado} ${e.apellido_empleado}`}
                              disabled={!cargos.datos}
                              onClick={() => (e.puede_gestionar ? setFormulario(e) : setError(SIN_NIVEL_EMPLEADO))}
                            />
                            <BotonAccion
                              tipo="eliminar"
                              icono="key"
                              titulo={`Restablecer la contraseña de ${e.user_auto}`}
                              onClick={() => (e.puede_gestionar ? setRestableciendo(e) : setError(SIN_NIVEL_EMPLEADO))}
                            />
                          </>
                        )}
                        {(e.estado ? puede("empleados:eliminar") : puede("empleados:modificar")) && (
                          <BotonAccion
                            tipo={e.estado ? "desactivar" : "activar"}
                            titulo={e.estado ? `Dar de baja a ${e.nombre_empleado} ${e.apellido_empleado}` : `Reactivar a ${e.nombre_empleado} ${e.apellido_empleado}`}
                            disabled={ocupado === e.id_empleado}
                            onClick={() => {
                              // Los mismos mensajes que empleados/views.py de Django
                              if (e.estado && e.es_yo) setError("No puedes darte de baja a ti mismo");
                              else if (!e.puede_gestionar) setError(SIN_NIVEL_EMPLEADO);
                              else cambiarEstado(e);
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && <Vacio columnas={6}>Ningún empleado coincide con los filtros.</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre="empleados" onPagina={paginado.irA} />
      </ListadoLayout>

      {formulario && cargos.datos && (
        <FormularioEmpleado empleado={formulario.nuevo ? null : formulario} cargos={cargos.datos} onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />
      )}
      {restableciendo && (
        <RestablecerClave
          empleado={restableciendo}
          onCerrar={() => setRestableciendo(null)}
          onListo={(mensaje) => {
            setRestableciendo(null);
            setAviso(mensaje);
          }}
        />
      )}
      {detalle && (
        <Modal titulo="Detalle del empleado" icono="person" onCerrar={() => setDetalle(null)} grande>
          <PerfilCabecera
            iniciales={`${detalle.nombre_empleado?.[0] || ""}${detalle.apellido_empleado?.[0] || ""}`.toUpperCase()}
            nombre={`${detalle.nombre_empleado} ${detalle.apellido_empleado}`}
            activo={detalle.estado}
            subtitulo={detalle.cargo_nombre || "Sin cargo"}
          />
          <SeccionDetalle icono="person" titulo="Datos personales" descripcion="Información básica del empleado.">
            <GrillaDatos>
              <Dato etiqueta="Usuario" icono="account_circle">{detalle.user_auto}</Dato>
              <Dato etiqueta="DNI" icono="badge">{detalle.dni}</Dato>
              <Dato etiqueta="Correo electrónico" icono="mail">{detalle.correo || "—"}</Dato>
              <Dato etiqueta="Teléfono" icono="call">{detalle.telefono || "—"}</Dato>
            </GrillaDatos>
          </SeccionDetalle>
          <SeccionDetalle icono="work" titulo="Datos laborales" descripcion="Información de su rol en el sistema.">
            <GrillaDatos>
              <Dato etiqueta="Cargo" icono="groups">{detalle.cargo_nombre || "Sin cargo"}</Dato>
              <Dato etiqueta="Fecha de ingreso" icono="calendar_month">{fecha(detalle.fecha_ingreso)}</Dato>
              {!detalle.estado && <Dato etiqueta="Fecha de baja" icono="event_busy">{fecha(detalle.fecha_baja)}</Dato>}
            </GrillaDatos>
          </SeccionDetalle>
        </Modal>
      )}
    </div>
  );
}
