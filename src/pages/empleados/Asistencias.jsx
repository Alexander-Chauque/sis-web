// Asistencias y tipos de turno
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroFechas, FiltroLista, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";
import { fecha, fechaISO, normalizar } from "../../utils/formato";

const FILTROS_VACIOS = { buscar: "", tipo: "", fecha_desde: "", fecha_hasta: "" };

export default function Asistencias() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState({ ...FILTROS_VACIOS, pagina: 1, por_pagina: 10 });
  const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
  const asistencias = useCarga("/asistencias/", consulta);
  const [ventana, setVentana] = useState(null); 
  const [empleado, setEmpleado] = useState("");
  const [tipo, setTipo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const datos = asistencias.datos;

  const abrir = (asistencia) => {
    setVentana(asistencia || { nueva: true });
    setEmpleado("");
    setTipo(asistencia ? String(asistencia.tipo) : "");
    setError("");
  };

  const guardar = async () => {
    setError("");
    if ((ventana.nueva && !empleado) || !tipo) return setError("Elegí el empleado y el turno.");
    setEnviando(true);
    try {
      if (ventana.nueva) await api.post("/asistencias/", { empleado: Number(empleado), tipo: Number(tipo) });
      else await api.patch(`/asistencias/${ventana.id_asistencia}/`, { tipo: Number(tipo) });
      setAviso(ventana.nueva ? "Asistencia registrada correctamente." : "Asistencia actualizada correctamente.");
      setVentana(null);
      asistencias.recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const anular = async (a) => {
    // Textos del modal "¿Anular Asistencia?"
    const respuesta = await confirmar({
      titulo: "¿Anular asistencia?",
      subtitulo: "El registro de presentismo se quitará del historial del día.",
      icono: "warning",
      tono: "peligro",
      peligro: true,
      resumen: { nombre: a.empleado_nombre, detalle: `${fecha(a.fecha_asistencia)} · ${a.tipo_nombre}` },
      importante: ["Se podrá volver a registrar la asistencia de ese día.", { texto: "Esta acción no se puede deshacer.", fuerte: true }],
      textoConfirmar: "Sí, anular",
      iconoConfirmar: "delete",
    });
    if (!respuesta) return;
    try {
      await api.delete(`/asistencias/${a.id_asistencia}/`);
      setAviso("Asistencia anulada correctamente.");
      asistencias.recargar();
    } catch (e) {
      setAviso("");
      setError(mensajeDeError(e));
    }
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Asistencias" subtitulo="Registro de presentismo y turnos del personal." icono="calendar_month">
        <Link className="btn btn-outline-secondary" to="/turnos">
          <Icono nombre="schedule" /> Tipos de turno
        </Link>
        {puede("empleados:escribir") && datos && (
          <button type="button" className="btn btn-marca" disabled={!datos.tipos.length} onClick={() => abrir(null)}>
            <Icono nombre="add" /> Registrar asistencia
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={!ventana && (error || asistencias.error)} onListo={() => setError("")} />
      {datos && !datos.tipos.length && <Alerta tipo="warning">Primero creá los turnos en “Tipos de turno”.</Alerta>}

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros((f) => ({ ...f, ...borrador, buscar: borrador.buscar.trim(), pagina: 1 }))}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              setFiltros((f) => ({ ...f, ...FILTROS_VACIOS, pagina: 1 }));
            }}
          >
            <FiltroBuscar
              id="buscar-asistencia"
              etiqueta="Buscar empleado"
              valor={borrador.buscar}
              onCambiar={(v) => setBorrador({ ...borrador, buscar: v })}
              placeholder="Nombre del empleado..."
            />
            <FiltroFechas
              desde={borrador.fecha_desde}
              hasta={borrador.fecha_hasta}
              maximo={fechaISO()}
              onCambiar={({ desde, hasta }) => setBorrador({ ...borrador, fecha_desde: desde, fecha_hasta: hasta })}
            />
            <FiltroLista
              id="filtro-turno"
              titulo="Tipo de turno"
              opciones={(datos?.tipos || []).map((t) => ({ valor: String(t.id_tipo_asistencia), texto: t.nombre }))}
              valor={borrador.tipo}
              onCambiar={(v) => setBorrador({ ...borrador, tipo: v })}
            />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={filtros.por_pagina} onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, pagina: 1 }))} />
        {!datos ? (
          asistencias.cargando && <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Empleado</th>
                  <th scope="col">Turno</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className={asistencias.cargando ? "opacity-50" : ""}>
                {datos.resultados.map((a) => (
                  <tr key={a.id_asistencia}>
                    <td className="fw-semibold">{a.id_asistencia}</td>
                    <td>{fecha(a.fecha_asistencia)}</td>
                    <td>{a.empleado_nombre}</td>
                    <td>
                      <span className="badge text-bg-success">{a.tipo_nombre}</span>
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        {puede("empleados:modificar") && <BotonAccion tipo="editar" titulo={`Editar el turno de ${a.empleado_nombre}`} onClick={() => abrir(a)} />}
                        {puede("empleados:eliminar") && (
                          <BotonAccion tipo="desactivar" icono="block" titulo={`Anular la asistencia de ${a.empleado_nombre}`} onClick={() => anular(a)} />
                        )}
                        {!puede("empleados:modificar") && !puede("empleados:eliminar") && <span className="small text-secondary">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!datos.resultados.length && <Vacio columnas={5}>No hay asistencias con estos filtros.</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        {datos && (
          <PaginacionNumeros
            pagina={datos.pagina}
            porPagina={datos.por_pagina}
            total={datos.total}
            nombre="asistencias"
            onPagina={(p) => setFiltros((f) => ({ ...f, pagina: p }))}
          />
        )}
      </ListadoLayout>

      {ventana && datos && (
        <Modal
          titulo={ventana.nueva ? `Asistencia del ${fecha(datos.hoy)}` : `Turno de ${ventana.empleado_nombre}`}
          onCerrar={() => setVentana(null)}
          onEnviar={guardar}
          enviando={enviando}
        >
          <Alerta>{error}</Alerta>
          {ventana.nueva && (
            <Campo id="asis-empleado" etiqueta="Empleado *">
              <select id="asis-empleado" className="form-select" required value={empleado} onChange={(e) => setEmpleado(e.target.value)}>
                <option value="">Elegí</option>
                {datos.empleados_activos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <Campo id="asis-tipo" etiqueta="Turno *" className="mb-0">
            <select id="asis-tipo" className="form-select" required value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Elegí</option>
              {datos.tipos.map((t) => (
                <option key={t.id_tipo_asistencia} value={t.id_tipo_asistencia}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </Modal>
      )}
    </div>
  );
}

export function TiposAsistencia() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const tipos = useCarga("/tipos-asistencia/");
  const [borrador, setBorrador] = useState("");
  const [buscar, setBuscar] = useState("");
  const [ventana, setVentana] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const datos = tipos.datos;
  const filtrados = useMemo(
    () => (datos?.tipos || []).filter((t) => normalizar(`${t.nombre} ${t.desc_tipo_asistencia || ""}`).includes(normalizar(buscar.trim()))),
    [datos, buscar],
  );
  const paginado = usePaginaLocal(filtrados, buscar);

  const abrir = (tipo) => {
    setVentana(tipo || { nuevo: true });
    setNombre(tipo?.nombre_tipo_asis || "");
    setDescripcion(tipo?.desc_tipo_asistencia || "");
    setError("");
  };

  const guardar = async () => {
    setError("");
    if (!nombre) return setError("Elegí el turno.");
    const cuerpo = { nombre_tipo_asis: nombre, desc_tipo_asistencia: descripcion.trim() };
    setEnviando(true);
    try {
      if (ventana.nuevo) await api.post("/tipos-asistencia/", cuerpo);
      else await api.patch(`/tipos-asistencia/${ventana.id_tipo_asistencia}/`, cuerpo);
      setAviso("Turno guardado.");
      setVentana(null);
      tipos.recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (tipo) => {
    // Textos del modal "¿Eliminar Turno?"
    const respuesta = await confirmar({
      titulo: "¿Eliminar turno?",
      subtitulo: "El turno dejará de estar disponible para registrar asistencias.",
      icono: "delete",
      tono: "peligro",
      peligro: true,
      resumen: { nombre: tipo.nombre, detalle: tipo.desc_tipo_asistencia || "Sin descripción" },
      motivo: { etiqueta: "Motivo de la eliminación", placeholder: "Ej.: turno unificado, ya no se utiliza, etc." },
      importante: [
        "Si el turno tiene asistencias registradas, el sistema no permitirá eliminarlo.",
        "Esta acción quedará registrada en el historial de auditoría.",
        { texto: "Esta acción no se puede deshacer.", fuerte: true },
      ],
      textoConfirmar: "Sí, eliminar",
      iconoConfirmar: "delete",
    });
    if (!respuesta) return;
    setError("");
    try {
      await api.delete(`/tipos-asistencia/${tipo.id_tipo_asistencia}/`);
      setAviso("Turno eliminado.");
      tipos.recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  const libres = datos ? datos.opciones.filter((o) => !datos.tipos.some((t) => t.nombre_tipo_asis === o.valor)) : [];

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Tipos de Turno" subtitulo="Gestioná los turnos disponibles (Completo / Medio)." icono="schedule">
        <Link className="btn btn-outline-secondary" to="/asistencias">
          <Icono nombre="arrow_back" /> Volver a Asistencias
        </Link>
        {puede("empleados:escribir") && libres.length > 0 && (
          <button type="button" className="btn btn-marca" onClick={() => abrir(null)}>
            <Icono nombre="add" /> Nuevo turno
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={!ventana && (error || tipos.error)} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setBuscar(borrador)}
            onLimpiar={() => {
              setBorrador("");
              setBuscar("");
            }}
          >
            <FiltroBuscar id="buscar-turno" etiqueta="Buscar turno" valor={borrador} onCambiar={setBorrador} placeholder="Nombre del turno..." />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {tipos.cargando && !datos ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Nombre del turno</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((t) => (
                  <tr key={t.id_tipo_asistencia}>
                    <td className="fw-semibold">{t.id_tipo_asistencia}</td>
                    <td className="fw-semibold">{t.nombre}</td>
                    <td className="text-secondary">{t.desc_tipo_asistencia || "—"}</td>
                    <td>
                      <div className="acciones-tabla">
                        {puede("empleados:modificar") && <BotonAccion tipo="editar" titulo={`Modificar ${t.nombre}`} onClick={() => abrir(t)} />}
                        {puede("empleados:eliminar") && <BotonAccion tipo="desactivar" icono="delete" titulo={`Eliminar ${t.nombre}`} onClick={() => eliminar(t)} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && <Vacio columnas={4}>{datos?.tipos.length ? "Ningún turno coincide con la búsqueda." : "Todavía no hay turnos."}</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre="turnos" onPagina={paginado.irA} />
      </ListadoLayout>

      {ventana && datos && (
        <Modal titulo={ventana.nuevo ? "Nuevo turno" : `Editar ${ventana.nombre}`} onCerrar={() => setVentana(null)} onEnviar={guardar} enviando={enviando}>
          <Alerta>{error}</Alerta>
          <Campo id="turno-nombre" etiqueta="Turno *">
            <select id="turno-nombre" className="form-select" required value={nombre} onChange={(e) => setNombre(e.target.value)}>
              <option value="">Elegí</option>
              {datos.opciones
                .filter((o) => o.valor === ventana.nombre_tipo_asis || libres.includes(o))
                .map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.nombre}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo id="turno-descripcion" etiqueta="Descripción (opcional)" className="mb-0">
            <textarea id="turno-descripcion" className="form-control" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Campo>
        </Modal>
      )}
    </div>
  );
}
