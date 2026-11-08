// Listado de ingredientes
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Encabezado, Insignia, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { CabeceraDetalle, Subtarjeta, Subtarjetas } from "../../components/Detalle";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";
import { fecha, motivoParaNoEliminar, normalizar } from "../../utils/formato";

// Ejemplo: 1500 -> $1.500,00
const formatearCosto = (valor) => `$${Number(valor).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

// Las mismas unidades que el modelo Ingrediente de Django
const UNIDADES = [
  { valor: "kg", texto: "Kilogramo (kg)" },
  { valor: "g", texto: "Gramos (g)" },
  { valor: "l", texto: "Litros (l)" },
  { valor: "ml", texto: "Mililitros (ml)" },
  { valor: "u", texto: "Unidades (u)" },
];
const ESTADOS = [
  { valor: "si", texto: "Disponible" },
  { valor: "no", texto: "No disponible" },
];
const FILTROS_VACIOS = { buscar: "", unidades: [], estados: [] };

export default function Ingredientes() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const ingredientes = useCarga("/ingredientes/");
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null);

  const lista = useMemo(() => ingredientes.datos || [], [ingredientes.datos]);
  const filtrados = useMemo(() => {
    const texto = normalizar(filtros.buscar.trim());
    return lista.filter((i) => {
      if (filtros.estados.length && !filtros.estados.includes(i.estado_ingrediente ? "si" : "no")) return false;
      if (filtros.unidades.length && !filtros.unidades.includes(i.unidad_medida)) return false;
      return normalizar(i.nombre_ingrediente).includes(texto);
    });
  }, [lista, filtros]);
  const paginado = usePaginaLocal(filtrados, JSON.stringify(filtros));

  const cambiarEstado = async (ingrediente) => {
    const activo = ingrediente.estado_ingrediente;
    const respuesta = await confirmar({
      titulo: "¿Cambiar estado del ingrediente?",
      subtitulo: activo ? "Dejará de estar disponible." : "Volverá a estar disponible.",
      icono: "warning",
      tono: "peligro",
      resumen: { nombre: ingrediente.nombre_ingrediente, detalle: ingrediente.unidad_nombre, estado: { texto: activo ? "Disponible" : "No disponible", activo } },
      motivo: { placeholder: "Ej.: falta de stock, producto vencido, error de carga, etc." },
      importante: activo
        ? ["El ingrediente dejará de estar disponible para nuevas recetas.", "Los platos que lo usan también quedarán no disponibles.", "Podrás volver a habilitarlo luego."]
        : ["El ingrediente volverá a estar disponible para nuevas recetas.", "Los platos que lo requieren podrán prepararse nuevamente.", "Se notificará a los cocineros del cambio."],
      textoConfirmar: "Confirmar cambio",
      iconoConfirmar: "sync",
    });
    if (!respuesta) return;
    setError("");
    setOcupado(ingrediente.id_ingrediente);
    try {
      const { data } = await api.post(`/ingredientes/${ingrediente.id_ingrediente}/estado/`, {
        motivo: respuesta.motivo,
      });
      // Reemplaza solo el ingrediente que cambió, sin volver a pedir toda la lista
      ingredientes.setDatos((l) => l.map((item) => (item.id_ingrediente === data.id_ingrediente ? data : item)));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (ingrediente) => {
    const motivo = motivoParaNoEliminar(ingrediente, ingrediente.nombre_ingrediente, ingrediente.estado_ingrediente);
    if (motivo) return setError(motivo);
    if (!await confirmar(`¿Eliminar "${ingrediente.nombre_ingrediente}"?`)) return;
    setError("");
    setOcupado(ingrediente.id_ingrediente);
    try {
      await api.delete(`/ingredientes/${ingrediente.id_ingrediente}/`);
      ingredientes.setDatos((l) => l.filter((i) => i.id_ingrediente !== ingrediente.id_ingrediente));
      setAviso(`Se eliminó "${ingrediente.nombre_ingrediente}".`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const puedeEditar = puede("ingredientes:modificar");
  const puedeEliminar = puede("ingredientes:eliminar");

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Ingredientes" subtitulo="Administra los ingredientes e insumos de cocina." icono="eco">
        {puede("platos:leer") && (
          <Link className="btn btn-outline-secondary" to="/platos">
            <Icono nombre="arrow_back" /> Volver a platos
          </Link>
        )}
        {puede("ingredientes:escribir") && (
          <Link className="btn btn-marca" to="/ingredientes/nuevo">
            <Icono nombre="add" /> Nuevo ingrediente
          </Link>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || ingredientes.error} onListo={() => setError("")} />

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
              id="buscar-ingrediente"
              valor={borrador.buscar}
              onCambiar={(v) => setBorrador({ ...borrador, buscar: v })}
              placeholder="Nombre del ingrediente..."
            />
            <FiltroCasillas
              titulo="Unidad de medida"
              todos="Todas"
              opciones={UNIDADES}
              elegidos={borrador.unidades}
              onCambiar={(v) => setBorrador({ ...borrador, unidades: v })}
            />
            <FiltroCasillas titulo="Estado" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {ingredientes.cargando ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Costo unitario</th>
                  <th scope="col">Unidad de medida</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((i) => (
                  <tr key={i.id_ingrediente}>
                    <td className="fw-semibold">{i.nombre_ingrediente}</td>
                    <td className="text-nowrap">{formatearCosto(i.costo_unitario)}</td>
                    <td>{i.unidad_medida}</td>
                    <td>
                      <Insignia activo={i.estado_ingrediente} si="Disponible" no="No disponible" />
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="ver" titulo={`Ver ${i.nombre_ingrediente}`} onClick={() => setDetalle(i)} />
                        {puedeEditar && (
                          <>
                            <BotonAccion tipo="editar" titulo={`Modificar ${i.nombre_ingrediente}`} a={`/ingredientes/${i.id_ingrediente}/editar`} />
                            <BotonAccion
                              tipo={i.estado_ingrediente ? "desactivar" : "activar"}
                              titulo={
                                i.estado_ingrediente
                                  ? `Marcar ${i.nombre_ingrediente} como no disponible`
                                  : `Marcar ${i.nombre_ingrediente} como disponible`
                              }
                              disabled={ocupado === i.id_ingrediente}
                              onClick={() => cambiarEstado(i)}
                            />
                          </>
                        )}
                        {puedeEliminar && (
                          <BotonAccion
                            tipo="eliminar"
                            titulo={`Eliminar ${i.nombre_ingrediente}`}
                            disabled={ocupado === i.id_ingrediente}
                            onClick={() => eliminar(i)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && (
                  <Vacio columnas={5}>{lista.length ? "Ningún ingrediente coincide con los filtros." : "Todavía no hay ingredientes cargados."}</Vacio>
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre="ingredientes" onPagina={paginado.irA} />
      </ListadoLayout>

      {detalle && (
        <Modal titulo="Detalle del ingrediente" icono="eco" onCerrar={() => setDetalle(null)} grande>
          {detalle.imagen_ingrediente && <img src={detalle.imagen_ingrediente} alt={`Foto de ${detalle.nombre_ingrediente}`} className="foto-detalle" />}
          <CabeceraDetalle etiqueta="Nombre del ingrediente" titulo={detalle.nombre_ingrediente}>
            <Insignia activo={detalle.estado_ingrediente} si="Disponible" no="No disponible" />
          </CabeceraDetalle>
          <Subtarjetas>
            <Subtarjeta icono="sell" etiqueta="Costo unitario" destacada>
              {formatearCosto(detalle.costo_unitario)}
            </Subtarjeta>
            <Subtarjeta icono="straighten" etiqueta="Unidad de medida">
              {detalle.unidad_nombre}
            </Subtarjeta>
            {!detalle.estado_ingrediente && detalle.fecha_desactivacion && (
              <Subtarjeta icono="event_busy" etiqueta="No disponible desde">
                {fecha(detalle.fecha_desactivacion)}
              </Subtarjeta>
            )}
            {!detalle.estado_ingrediente && detalle.eliminable_desde && (
              <Subtarjeta icono="delete_forever" etiqueta="Se puede eliminar desde">
                {fecha(detalle.eliminable_desde)}
              </Subtarjeta>
            )}
            <Subtarjeta icono="description" etiqueta="Descripción" ancha>
              {detalle.descripcion_ingrediente || "Sin descripción."}
            </Subtarjeta>
          </Subtarjetas>
        </Modal>
      )}
    </div>
  );
}
