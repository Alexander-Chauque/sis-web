import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Insignia, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { CabeceraDetalle, SeccionDetalle, Subtarjeta, Subtarjetas } from "../../components/Detalle";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";
import { dinero, fecha, montoValido, motivoParaNoEliminar, normalizar, textoMonto } from "../../utils/formato";

const ESTADOS = [
  { valor: "si", texto: "Disponible" },
  { valor: "no", texto: "No disponible" },
];
const FILTROS_VACIOS = { buscar: "", categorias: [], estados: [] };

function FormularioPlato({ plato, categorias, ingredientes, onCerrar, onGuardado }) {
  const [nombre, setNombre] = useState(plato?.nombre_plato || "");
  const [precio, setPrecio] = useState(plato ? String(Number(plato.precio_plato)) : "");
  const [categoria, setCategoria] = useState(plato?.categoria ? String(plato.categoria) : "");
  const [descripcion, setDescripcion] = useState(plato?.descripcion_plato || "");
  const [elegidos, setElegidos] = useState(() => new Set((plato?.ingredientes || []).map((i) => i.id_ingrediente)));
  const [buscar, setBuscar] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Los que ya usaba el plato se muestran aunque estén inactivos, para poder quitarlos
  const usados = useMemo(() => new Set((plato?.ingredientes || []).map((i) => i.id_ingrediente)), [plato]);
  const opciones = ingredientes.filter(
    (i) =>
      (i.estado_ingrediente || usados.has(i.id_ingrediente)) &&
      normalizar(i.nombre_ingrediente).includes(normalizar(buscar.trim())),
  );

  const alternar = (id) =>
    setElegidos((anterior) => {
      const nuevo = new Set(anterior);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  const guardar = async () => {
    setError("");
    if (!nombre.trim() || !categoria) return setError("Completá el nombre y la categoría.");
    if (!montoValido(precio)) return setError("Ingresá un precio mayor a 0, con hasta 2 decimales.");
    if (!elegidos.size) return setError("Seleccioná al menos un ingrediente.");
    const cuerpo = {
      nombre_plato: nombre.trim(),
      precio_plato: textoMonto(precio),
      categoria: Number(categoria),
      descripcion_plato: descripcion.trim(),
      ingredientes_ids: [...elegidos],
    };
    setGuardando(true);
    try {
      const { data } = plato
        ? await api.patch(`/platos/${plato.id_plato}/`, cuerpo)
        : await api.post("/platos/", cuerpo);
      onGuardado(data, !plato);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={plato ? "Editar plato" : "Nuevo plato"} onCerrar={onCerrar} onEnviar={guardar} enviando={guardando} grande>
      <Alerta>{error}</Alerta>
      <div className="row g-3">
        <Campo id="plato-nombre" etiqueta="Nombre *" className="col-12 col-md-6">
          <input id="plato-nombre" className="form-control" maxLength={100} required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo id="plato-precio" etiqueta="Precio *" prefijo="$" className="col-6 col-md-3">
          <input id="plato-precio" className="form-control" inputMode="decimal" required value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </Campo>
        <Campo id="plato-categoria" etiqueta="Categoría *" className="col-6 col-md-3">
          <select id="plato-categoria" className="form-select" required value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Elegí</option>
            {categorias
              .filter((c) => c.estado_categoria_plato || String(c.id_categoria_plato) === categoria)
              .map((c) => (
                <option key={c.id_categoria_plato} value={c.id_categoria_plato}>
                  {c.nombre_categoria_plato}
                </option>
              ))}
          </select>
        </Campo>
        <Campo id="plato-descripcion" etiqueta="Descripción (opcional)" className="col-12">
          <textarea id="plato-descripcion" className="form-control" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
      </div>
      <fieldset className="mt-2">
        <legend className="tarjeta-titulo">
          <Icono nombre="eco" />
          <span className="tarjeta-titulo-texto">
            Ingredientes <span className="req">*</span>
          </span>
          <span className="contador-seleccionados">{elegidos.size} seleccionados</span>
        </legend>
        <div className="buscador-ingredientes">
          <Icono nombre="search" />
          <input type="search" placeholder="Buscar ingrediente por nombre..." aria-label="Buscar ingrediente" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
        <div className="grilla-ingredientes">
          {opciones.map((i) => (
            <label className="ingrediente-item" key={i.id_ingrediente}>
              <input type="checkbox" checked={elegidos.has(i.id_ingrediente)} onChange={() => alternar(i.id_ingrediente)} />
              <span className="ingrediente-info">
                <Icono nombre="grocery" className="icono-ingrediente" />
                <span className="textos-ingrediente">
                  <span className="nombre-ingrediente">{i.nombre_ingrediente}</span>
                  <span className="unidad-ingrediente">{i.estado_ingrediente ? i.unidad_medida || "" : "No disponible"}</span>
                </span>
              </span>
            </label>
          ))}
          {!opciones.length && <p className="text-secondary small mb-0">No hay ingredientes para mostrar.</p>}
        </div>
      </fieldset>
    </Modal>
  );
}

export default function Platos() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const platos = useCarga("/platos/");
  const puedeEscribir = puede("platos:escribir");
  const puedeEditar = puede("platos:modificar");
  const puedeEliminar = puede("platos:eliminar");
  // Las opciones del formulario de plato dependen de los permisos, para que no se pueda crear un plato con ingredientes que no se pueden ver
  const categorias = useCarga("/categorias/");
  const ingredientes = useCarga(puedeEscribir || puedeEditar ? "/platos/ingredientes/" : null);
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [formulario, setFormulario] = useState(null); // null, {nuevo: true} o el plato
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null);

  const lista = useMemo(() => platos.datos || [], [platos.datos]);
  const filtrados = useMemo(() => {
    const texto = normalizar(filtros.buscar.trim());
    return lista.filter((p) => {
      if (filtros.estados.length && !filtros.estados.includes(p.estado_plato ? "si" : "no")) return false;
      if (filtros.categorias.length && !filtros.categorias.includes(String(p.categoria))) return false;
      return normalizar(p.nombre_plato).includes(texto);
    });
  }, [lista, filtros]);
  const paginado = usePaginaLocal(filtrados, JSON.stringify(filtros));

  const reemplazar = (plato) => platos.setDatos((l) => l.map((p) => (p.id_plato === plato.id_plato ? plato : p)));

  const cambiarEstado = async (plato) => {
    const activo = plato.estado_plato;
    const respuesta = await confirmar({
      titulo: "¿Cambiar estado del plato?",
      subtitulo: activo ? "Dejará de estar disponible." : "Volverá a estar disponible.",
      icono: "warning",
      tono: "peligro",
      resumen: { nombre: plato.nombre_plato, detalle: dinero(plato.precio_plato), estado: { texto: activo ? "Disponible" : "No disponible", activo } },
      motivo: { placeholder: "Ej.: falta de ingredientes, retiro temporal del menú, error de carga, etc." },
      importante: activo
        ? ["El plato dejará de estar disponible para nuevas comandas.", "Se conservará su información para el historial.", "Podrás volver a habilitarlo luego."]
        : ["El plato volverá a aparecer en la carta.", "Podrá ser agregado a nuevas comandas.", "Se notificará a los mozos del cambio."],
      textoConfirmar: "Confirmar cambio",
      iconoConfirmar: "sync",
    });
    if (!respuesta) return;
    setOcupado(plato.id_plato);
    setError("");
    try {
      const { data } = await api.post(`/platos/${plato.id_plato}/estado/`, { motivo: respuesta.motivo });
      reemplazar(data);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (plato) => {
    const motivo = motivoParaNoEliminar(plato, plato.nombre_plato, plato.estado_plato);
    if (motivo) return setError(motivo);
    if (!await confirmar(`¿Eliminar "${plato.nombre_plato}"?`)) return;
    setOcupado(plato.id_plato);
    setError("");
    try {
      await api.delete(`/platos/${plato.id_plato}/`);
      platos.setDatos((l) => l.filter((p) => p.id_plato !== plato.id_plato));
      setAviso(`Se eliminó "${plato.nombre_plato}".`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const alGuardar = (plato, esNuevo) => {
    if (esNuevo) platos.setDatos((l) => [...l, plato].sort((a, b) => a.nombre_plato.localeCompare(b.nombre_plato)));
    else reemplazar(plato);
    setAviso(`Se guardó "${plato.nombre_plato}".`);
    setFormulario(null);
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Platos" subtitulo="Administra los platos del menú del restaurante." icono="restaurant">
        {puede("categorias:leer") && (
          <Link className="btn btn-outline-secondary" to="/categorias">
            <Icono nombre="category" /> Categorías
          </Link>
        )}
        {puede("ingredientes:leer") && (
          <Link className="btn btn-outline-secondary" to="/ingredientes">
            <Icono nombre="eco" /> Ingredientes
          </Link>
        )}
        {puedeEscribir && (
          <button type="button" className="btn btn-marca" onClick={() => setFormulario({ nuevo: true })}>
            <Icono nombre="add" /> Nuevo plato
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || platos.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros(borrador)}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              setFiltros(FILTROS_VACIOS);
            }}
          >
            <FiltroBuscar id="buscar-plato" valor={borrador.buscar} onCambiar={(v) => setBorrador({ ...borrador, buscar: v })} placeholder="Nombre del plato..." />
            <FiltroCasillas
              titulo="Categoría"
              todos="Todas"
              opciones={(categorias.datos || []).map((c) => ({ valor: String(c.id_categoria_plato), texto: c.nombre_categoria_plato }))}
              elegidos={borrador.categorias}
              onCambiar={(v) => setBorrador({ ...borrador, categorias: v })}
            />
            <FiltroCasillas titulo="Estado" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {platos.cargando ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Precio</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((p) => (
                  <tr key={p.id_plato}>
                    <td className="fw-semibold">{p.nombre_plato}</td>
                    <td className="text-nowrap">{dinero(p.precio_plato)}</td>
                    <td>{p.categoria_nombre}</td>
                    <td>
                      <Insignia activo={p.estado_plato} si="Disponible" no="No disponible" />
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="ver" titulo={`Ver ${p.nombre_plato}`} onClick={() => setDetalle(p)} />
                        {puedeEditar && (
                          <>
                            <BotonAccion tipo="editar" titulo={`Modificar ${p.nombre_plato}`} disabled={!ingredientes.datos} onClick={() => setFormulario(p)} />
                            <BotonAccion
                              tipo={p.estado_plato ? "desactivar" : "activar"}
                              titulo={p.estado_plato ? `Marcar ${p.nombre_plato} como no disponible` : `Marcar ${p.nombre_plato} como disponible`}
                              disabled={ocupado === p.id_plato}
                              onClick={() => cambiarEstado(p)}
                            />
                          </>
                        )}
                        {puedeEliminar && (
                          <BotonAccion tipo="eliminar" titulo={`Eliminar ${p.nombre_plato}`} disabled={ocupado === p.id_plato} onClick={() => eliminar(p)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && (
                  <Vacio columnas={5}>{lista.length ? "Ningún plato coincide con los filtros." : "Todavía no hay platos cargados."}</Vacio>
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre="platos" onPagina={paginado.irA} />
      </ListadoLayout>

      {formulario && ingredientes.datos && (
        <FormularioPlato
          plato={formulario.nuevo ? null : formulario}
          categorias={categorias.datos || []}
          ingredientes={ingredientes.datos}
          onCerrar={() => setFormulario(null)}
          onGuardado={alGuardar}
        />
      )}
      {formulario && !ingredientes.datos && <Alerta>{ingredientes.error || "Cargando ingredientes..."}</Alerta>}

      {detalle && (
        <Modal titulo="Detalle del plato" icono="restaurant_menu" onCerrar={() => setDetalle(null)} grande>
          <CabeceraDetalle etiqueta="Nombre del plato" titulo={detalle.nombre_plato}>
            <Insignia activo={detalle.estado_plato} si="Disponible" no="No disponible" />
          </CabeceraDetalle>
          <Subtarjetas>
            <Subtarjeta icono="sell" etiqueta="Precio" destacada>
              {dinero(detalle.precio_plato)}
            </Subtarjeta>
            <Subtarjeta icono="layers" etiqueta="Categoría">
              {detalle.categoria_nombre}
            </Subtarjeta>
            {!detalle.estado_plato && detalle.fecha_desactivacion && (
              <Subtarjeta icono="event_busy" etiqueta="No disponible desde">
                {fecha(detalle.fecha_desactivacion)}
              </Subtarjeta>
            )}
            {!detalle.estado_plato && detalle.eliminable_desde && (
              <Subtarjeta icono="delete_forever" etiqueta="Se puede eliminar desde">
                {fecha(detalle.eliminable_desde)}
              </Subtarjeta>
            )}
            <Subtarjeta icono="description" etiqueta="Descripción" ancha>
              {detalle.descripcion_plato || "Sin descripción."}
            </Subtarjeta>
          </Subtarjetas>
          <div className="mt-4">
            <SeccionDetalle icono="restaurant" titulo="Ingredientes" extra={<span className="contador-seleccionados">{detalle.ingredientes.length} ingredientes</span>}>
              <table className="tabla-detalle">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Ingrediente</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.ingredientes.map((i, n) => (
                    <tr key={i.id_ingrediente}>
                      <td className="text-secondary">{n + 1}</td>
                      <td>
                        <span className="celda-con-icono">
                          <Icono nombre="grocery" className="icono-naranja" />
                          {i.nombre_ingrediente}
                        </span>
                      </td>
                      <td>
                        <Insignia activo={i.estado_ingrediente} si="Disponible" no="Sin stock" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SeccionDetalle>
          </div>
        </Modal>
      )}
    </div>
  );
}
