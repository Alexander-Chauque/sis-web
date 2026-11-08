// Pantalla común para listas simples con nombre, descripción y estado, con el diseño de Django.
// La usan las categorías de platos, los tipos de bebida, las categorías de gasto y los métodos de pago.
// Cada una se configura en catalogos.js.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../components/Cargando";
import { Alerta, Campo, Encabezado, Insignia, Modal, Vacio } from "../components/Comunes";
import { Notificar } from "../components/Mensajes";
import { CabeceraDetalle, Subtarjeta, Subtarjetas } from "../components/Detalle";
import { Icono } from "../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../components/Listado";
import { useAuth } from "../context/AuthContext";
import { useCarga } from "../hooks/useCarga";
import { useConfirmar } from "../hooks/useConfirmar";
import { usePaginaLocal } from "../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../services/api";
import { normalizar } from "../utils/formato";

const ESTADOS = [
  { valor: "si", texto: "Activo" },
  { valor: "no", texto: "Inactivo" },
];
const FILTROS_VACIOS = { buscar: "", estados: [] };

export default function Catalogo({ config }) {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const { datos, cargando, error: errorCarga, setDatos } = useCarga(config.ruta);
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState(null); // null: cerrado; {}: nuevo; fila: edición
  const [detalle, setDetalle] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState(null);

  const lista = useMemo(() => datos || [], [datos]);
  const filtrados = useMemo(() => {
    const texto = normalizar(filtros.buscar.trim());
    return lista.filter((fila) => {
      if (filtros.estados.length && !filtros.estados.includes(fila[config.estado] ? "si" : "no")) return false;
      return normalizar(fila[config.nombre]).includes(texto);
    });
  }, [lista, filtros, config]);
  const paginado = usePaginaLocal(filtrados, JSON.stringify(filtros));

  const abrir = (fila) => {
    setEditando(fila || {});
    setNombre(fila?.[config.nombre] || "");
    setDescripcion(fila?.[config.descripcion] || "");
    setError("");
  };

  const reemplazar = (fila) =>
    setDatos((anterior) => anterior.map((item) => (item[config.id] === fila[config.id] ? fila : item)));

  const guardar = async () => {
    if (!nombre.trim()) {
      setError("Ingresá el nombre.");
      return;
    }
    setGuardando(true);
    setError("");
    const cuerpo = { [config.nombre]: nombre.trim(), [config.descripcion]: descripcion.trim() };
    try {
      if (editando[config.id]) {
        const { data } = await api.patch(`${config.ruta}${editando[config.id]}/`, cuerpo);
        reemplazar(data);
      } else {
        const { data } = await api.post(config.ruta, cuerpo);
        setDatos((anterior) => [...anterior, data].sort((a, b) => a[config.nombre].localeCompare(b[config.nombre])));
      }
      setAviso(`Se guardó "${cuerpo[config.nombre]}".`);
      setEditando(null);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (fila) => {
    const accion = fila[config.estado] ? "desactivar" : "activar";
    if (!await confirmar(`¿Querés ${accion} "${fila[config.nombre]}"?`)) return;
    setOcupado(fila[config.id]);
    setAviso("");
    try {
      const { data } = await api.post(`${config.ruta}${fila[config.id]}/estado/`);
      reemplazar(data);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (fila) => {
    if (!await confirmar(`¿Eliminar "${fila[config.nombre]}"?`)) return;
    setOcupado(fila[config.id]);
    setError("");
    try {
      await api.delete(`${config.ruta}${fila[config.id]}/`);
      setDatos((anterior) => anterior.filter((item) => item[config.id] !== fila[config.id]));
      setAviso(`Se eliminó "${fila[config.nombre]}".`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const puedeEditar = puede(`${config.modulo}:modificar`);
  const puedeEliminar = puede(`${config.modulo}:eliminar`);
  const { volver } = config;

  return (
    <div className="contenedor-listado">
      <Encabezado titulo={config.titulo} subtitulo={config.subtitulo}>
        {volver && puede(volver.permiso) && (
          <Link className="btn btn-outline-secondary" to={volver.a}>
            <Icono nombre="arrow_back" /> {volver.texto}
          </Link>
        )}
        {puede(`${config.modulo}:escribir`) && (
          <button type="button" className="btn btn-marca" onClick={() => abrir(null)}>
            <Icono nombre="add" /> {config.nuevo}
          </button>
        )}
      </Encabezado>

      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={!editando && (error || errorCarga)} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros(borrador)}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              setFiltros(FILTROS_VACIOS);
            }}
          >
            <FiltroBuscar
              id="buscar-catalogo"
              etiqueta={config.etiquetaBuscar || "Buscar"}
              valor={borrador.buscar}
              onCambiar={(v) => setBorrador({ ...borrador, buscar: v })}
              placeholder="Nombre..."
            />
            <FiltroCasillas titulo="Estado" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {cargando ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((fila) => {
                  const usos = fila[config.contador.campo] || 0;
                  const bloqueado = config.contador.bloquea && usos > 0;
                  return (
                    <tr key={fila[config.id]}>
                      <td className="fw-semibold">{fila[config.nombre]}</td>
                      <td className="text-secondary">{fila[config.descripcion] || "—"}</td>
                      <td>
                        <Insignia activo={fila[config.estado]} />
                      </td>
                      <td>
                        <div className="acciones-tabla">
                          <BotonAccion tipo="ver" titulo={`Ver ${fila[config.nombre]}`} onClick={() => setDetalle(fila)} />
                          {puedeEditar && (
                            <>
                              <BotonAccion
                                tipo="editar"
                                titulo={`Modificar ${fila[config.nombre]}`}
                                onClick={() => (bloqueado ? setError(config.mensajeEditar) : abrir(fila))}
                              />
                              <BotonAccion
                                tipo={fila[config.estado] ? "desactivar" : "activar"}
                                titulo={fila[config.estado] ? `Desactivar ${fila[config.nombre]}` : `Activar ${fila[config.nombre]}`}
                                disabled={ocupado === fila[config.id]}
                                onClick={() => cambiarEstado(fila)}
                              />
                            </>
                          )}
                          {puedeEliminar && (
                            <BotonAccion
                              tipo="eliminar"
                              titulo={`Eliminar ${fila[config.nombre]}`}
                              disabled={ocupado === fila[config.id]}
                              onClick={() => (usos > 0 ? setError(config.mensajeEliminar(fila[config.nombre])) : eliminar(fila))}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && (
                  <Vacio columnas={4}>{lista.length ? "Nada coincide con los filtros." : "Todavía no hay registros."}</Vacio>
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre={config.plural} onPagina={paginado.irA} />
      </ListadoLayout>

      {detalle && (
        <Modal titulo={`Detalle de ${config.singular}`} icono="category" onCerrar={() => setDetalle(null)} grande>
          <CabeceraDetalle etiqueta="Nombre" titulo={detalle[config.nombre]}>
            <Insignia activo={detalle[config.estado]} />
          </CabeceraDetalle>
          <Subtarjetas>
            <Subtarjeta icono="toggle_on" etiqueta="Estado">
              {detalle[config.estado] ? "Activo" : "Inactivo"}
            </Subtarjeta>
            <Subtarjeta icono="tag" etiqueta={config.contador.titulo} destacada>
              {detalle[config.contador.campo] || 0}
            </Subtarjeta>
            <Subtarjeta icono="description" etiqueta="Descripción" ancha>
              {detalle[config.descripcion] || "Sin descripción."}
            </Subtarjeta>
          </Subtarjetas>
        </Modal>
      )}

      {editando && (
        <Modal
          titulo={editando[config.id] ? `Editar ${config.singular}` : config.nuevo}
          onCerrar={() => setEditando(null)}
          onEnviar={guardar}
          enviando={guardando}
        >
          <Alerta>{error}</Alerta>
          <Campo id="catalogo-nombre" etiqueta="Nombre *">
            <input
              id="catalogo-nombre"
              className="form-control"
              maxLength={50}
              required
              placeholder={config.ejemplo}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Campo>
          <Campo id="catalogo-descripcion" etiqueta="Descripción (opcional)" className="mb-0">
            <textarea id="catalogo-descripcion" className="form-control" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Campo>
        </Modal>
      )}
    </div>
  );
}
