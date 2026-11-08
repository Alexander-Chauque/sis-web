import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Insignia, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { CabeceraDetalle, Subtarjeta, Subtarjetas } from "../../components/Detalle";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";
import { dinero, fecha, montoValido, motivoParaNoEliminar, normalizar, textoMonto } from "../../utils/formato";

function FormularioBebida({ bebida, tipos, onCerrar, onGuardado }) {
  const [nombre, setNombre] = useState(bebida?.nombre_bebida || "");
  const [precio, setPrecio] = useState(bebida ? String(Number(bebida.precio_bebida)) : "");
  const [tipo, setTipo] = useState(bebida ? String(bebida.id_tipo_bebida) : "");
  const [descripcion, setDescripcion] = useState(bebida?.descripcion_bebida || "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError("");
    if (!nombre.trim() || !tipo) return setError("Completá el nombre y el tipo.");
    if (!montoValido(precio)) return setError("Ingresá un precio mayor a 0, con hasta 2 decimales.");
    const cuerpo = {
      nombre_bebida: nombre.trim(),
      precio_bebida: textoMonto(precio),
      id_tipo_bebida: Number(tipo),
      descripcion_bebida: descripcion.trim(),
    };
    setGuardando(true);
    try {
      const { data } = bebida
        ? await api.patch(`/bebidas/${bebida.id_bebida}/`, cuerpo)
        : await api.post("/bebidas/", cuerpo);
      onGuardado(data, !bebida);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={bebida ? "Editar bebida" : "Nueva bebida"} onCerrar={onCerrar} onEnviar={guardar} enviando={guardando}>
      <Alerta>{error}</Alerta>
      <Campo id="bebida-nombre" etiqueta="Nombre *">
        <input id="bebida-nombre" className="form-control" maxLength={50} required placeholder="Ej. Limonada" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>
      <div className="row g-3">
        <Campo id="bebida-precio" etiqueta="Precio *" prefijo="$" className="col-6 mb-3">
          <input id="bebida-precio" className="form-control" inputMode="decimal" required value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </Campo>
        <Campo id="bebida-tipo" etiqueta="Tipo *" className="col-6 mb-3">
          <select id="bebida-tipo" className="form-select" required value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Elegí</option>
            {tipos
              .filter((t) => t.estado_tipo_bebida || String(t.id_tipo_bebida) === tipo)
              .map((t) => (
                <option key={t.id_tipo_bebida} value={t.id_tipo_bebida}>
                  {t.nombre_tipo_bebida}
                </option>
              ))}
          </select>
        </Campo>
      </div>
      <Campo id="bebida-descripcion" etiqueta="Descripción (opcional)" className="mb-0">
        <textarea id="bebida-descripcion" className="form-control" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
    </Modal>
  );
}

const ESTADOS = [
  { valor: "si", texto: "Disponible" },
  { valor: "no", texto: "No disponible" },
];
const FILTROS_VACIOS = { buscar: "", tipos: [], estados: [] };

export default function Bebidas() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const bebidas = useCarga("/bebidas/");
  const tipos = useCarga("/tipos-bebida/");
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [formulario, setFormulario] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null);

  const lista = useMemo(() => bebidas.datos || [], [bebidas.datos]);
  const filtradas = useMemo(() => {
    const texto = normalizar(filtros.buscar.trim());
    return lista.filter((b) => {
      if (filtros.estados.length && !filtros.estados.includes(b.disponible_bebida ? "si" : "no")) return false;
      if (filtros.tipos.length && !filtros.tipos.includes(String(b.id_tipo_bebida))) return false;
      return normalizar(b.nombre_bebida).includes(texto);
    });
  }, [lista, filtros]);
  const paginado = usePaginaLocal(filtradas, JSON.stringify(filtros));

  const reemplazar = (bebida) => bebidas.setDatos((l) => l.map((b) => (b.id_bebida === bebida.id_bebida ? bebida : b)));

  const cambiarEstado = async (bebida) => {
    const activo = bebida.disponible_bebida;
    const respuesta = await confirmar({
      titulo: "¿Cambiar estado de la bebida?",
      subtitulo: activo ? "Dejará de estar disponible." : "Volverá a estar disponible.",
      icono: "warning",
      tono: "peligro",
      resumen: { nombre: bebida.nombre_bebida, detalle: dinero(bebida.precio_bebida), estado: { texto: activo ? "Disponible" : "No disponible", activo } },
      motivo: { placeholder: "Ej.: falta de stock, producto vencido, error de carga, etc." },
      importante: activo
        ? ["La bebida dejará de estar disponible para nuevas comandas.", "Se conservará su información para el historial.", "Podrás volver a habilitarla luego."]
        : ["La bebida volverá a aparecer en la carta.", "Podrá ser agregada a nuevas comandas.", "Se notificará a los mozos del cambio."],
      textoConfirmar: "Confirmar cambio",
      iconoConfirmar: "sync",
    });
    if (!respuesta) return;
    setOcupado(bebida.id_bebida);
    setError("");
    try {
      const { data } = await api.post(`/bebidas/${bebida.id_bebida}/estado/`, { motivo: respuesta.motivo });
      reemplazar(data);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (bebida) => {
    const motivo = motivoParaNoEliminar(bebida, bebida.nombre_bebida, bebida.disponible_bebida, true);
    if (motivo) return setError(motivo);
    if (!await confirmar(`¿Eliminar "${bebida.nombre_bebida}"?`)) return;
    setOcupado(bebida.id_bebida);
    setError("");
    try {
      await api.delete(`/bebidas/${bebida.id_bebida}/`);
      bebidas.setDatos((l) => l.filter((b) => b.id_bebida !== bebida.id_bebida));
      setAviso(`Se eliminó "${bebida.nombre_bebida}".`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const alGuardar = (bebida, esNueva) => {
    if (esNueva) bebidas.setDatos((l) => [...l, bebida].sort((a, b) => a.nombre_bebida.localeCompare(b.nombre_bebida)));
    else reemplazar(bebida);
    setAviso(`Se guardó "${bebida.nombre_bebida}".`);
    setFormulario(null);
  };

  const puedeEditar = puede("bebidas:modificar");
  const puedeEliminar = puede("bebidas:eliminar");

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Bebidas" subtitulo="Administra las bebidas del menú del restaurante." icono="local_bar">
        <Link className="btn btn-outline-secondary" to="/tipos-bebida">
          <Icono nombre="category" /> Tipos de bebidas
        </Link>
        {puede("bebidas:escribir") && (
          <button type="button" className="btn btn-marca" onClick={() => setFormulario({ nuevo: true })}>
            <Icono nombre="add" /> Nueva bebida
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || bebidas.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros(borrador)}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              setFiltros(FILTROS_VACIOS);
            }}
          >
            <FiltroBuscar id="buscar-bebida" valor={borrador.buscar} onCambiar={(v) => setBorrador({ ...borrador, buscar: v })} placeholder="Nombre de bebida..." />
            <FiltroCasillas
              titulo="Tipo de bebida"
              opciones={(tipos.datos || []).map((t) => ({ valor: String(t.id_tipo_bebida), texto: t.nombre_tipo_bebida }))}
              elegidos={borrador.tipos}
              onCambiar={(v) => setBorrador({ ...borrador, tipos: v })}
            />
            <FiltroCasillas titulo="Estado" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {bebidas.cargando ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Precio</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((b) => (
                  <tr key={b.id_bebida}>
                    <td className="fw-semibold">{b.nombre_bebida}</td>
                    <td className="text-nowrap">{dinero(b.precio_bebida)}</td>
                    <td>{b.tipo_nombre}</td>
                    <td>
                      <Insignia activo={b.disponible_bebida} si="Disponible" no="No disponible" />
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="ver" titulo={`Ver ${b.nombre_bebida}`} onClick={() => setDetalle(b)} />
                        {puedeEditar && (
                          <>
                            <BotonAccion tipo="editar" titulo={`Modificar ${b.nombre_bebida}`} disabled={!tipos.datos} onClick={() => setFormulario(b)} />
                            <BotonAccion
                              tipo={b.disponible_bebida ? "desactivar" : "activar"}
                              titulo={b.disponible_bebida ? `Marcar ${b.nombre_bebida} como no disponible` : `Marcar ${b.nombre_bebida} como disponible`}
                              disabled={ocupado === b.id_bebida}
                              onClick={() => cambiarEstado(b)}
                            />
                          </>
                        )}
                        {puedeEliminar && (
                          <BotonAccion tipo="eliminar" titulo={`Eliminar ${b.nombre_bebida}`} disabled={ocupado === b.id_bebida} onClick={() => eliminar(b)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtradas.length && (
                  <Vacio columnas={5}>{lista.length ? "Ninguna bebida coincide con los filtros." : "Todavía no hay bebidas cargadas."}</Vacio>
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre="bebidas" onPagina={paginado.irA} />
      </ListadoLayout>

      {formulario && tipos.datos && (
        <FormularioBebida bebida={formulario.nuevo ? null : formulario} tipos={tipos.datos} onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />
      )}

      {detalle && (
        <Modal titulo="Detalle de la bebida" icono="local_bar" onCerrar={() => setDetalle(null)} grande>
          <CabeceraDetalle etiqueta="Nombre de la bebida" titulo={detalle.nombre_bebida}>
            <Insignia activo={detalle.disponible_bebida} si="Disponible" no="No disponible" />
          </CabeceraDetalle>
          <Subtarjetas>
            <Subtarjeta icono="sell" etiqueta="Precio" destacada>
              {dinero(detalle.precio_bebida)}
            </Subtarjeta>
            <Subtarjeta icono="layers" etiqueta="Tipo de bebida">
              {detalle.tipo_nombre}
            </Subtarjeta>
            {!detalle.disponible_bebida && detalle.fecha_desactivacion && (
              <Subtarjeta icono="event_busy" etiqueta="No disponible desde">
                {fecha(detalle.fecha_desactivacion)}
              </Subtarjeta>
            )}
            {!detalle.disponible_bebida && detalle.eliminable_desde && (
              <Subtarjeta icono="delete_forever" etiqueta="Se puede eliminar desde">
                {fecha(detalle.eliminable_desde)}
              </Subtarjeta>
            )}
            <Subtarjeta icono="description" etiqueta="Descripción" ancha>
              {detalle.descripcion_bebida || "Sin descripción."}
            </Subtarjeta>
          </Subtarjetas>
        </Modal>
      )}
    </div>
  );
}
