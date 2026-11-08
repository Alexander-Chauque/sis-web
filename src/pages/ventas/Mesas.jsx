// Listado de mesas: filtros a la izquierda y tabla a la derecha.
import { useMemo, useState } from "react";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";

const UBICACIONES = [
  { valor: "salon", nombre: "Salón" },
  { valor: "patio", nombre: "Patio" },
];
const ESTADOS = [
  { valor: "libre", texto: "Disponible" },
  { valor: "ocupada", texto: "Ocupada" },
];
const FILTROS_VACIOS = { buscar: "", ubicaciones: [], estados: [] };

function FormularioMesa({ mesa, onCerrar, onGuardado }) {
  const [numero, setNumero] = useState(mesa ? String(mesa.numero_mesa) : "");
  const [ubicacion, setUbicacion] = useState(mesa?.ubicacion || "salon");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError("");
    if (!/^\d+$/.test(numero.trim()) || Number(numero) < 1) return setError("Ingresá un número de mesa mayor a 0.");
    setGuardando(true);
    const cuerpo = { numero_mesa: Number(numero), ubicacion };
    try {
      const { data } = mesa ? await api.patch(`/mesas/${mesa.id_mesa}/`, cuerpo) : await api.post("/mesas/", cuerpo);
      onGuardado(data, !mesa);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={mesa ? `Editar mesa ${mesa.numero_mesa}` : "Nueva mesa"} onCerrar={onCerrar} onEnviar={guardar} enviando={guardando}>
      <Alerta>{error}</Alerta>
      <div className="row g-3">
        <Campo id="mesa-numero" etiqueta="Número *" className="col-6">
          <input id="mesa-numero" type="number" min={1} className="form-control" required value={numero} onChange={(e) => setNumero(e.target.value)} />
        </Campo>
        <Campo id="mesa-ubicacion" etiqueta="Ubicación *" className="col-6">
          <select id="mesa-ubicacion" className="form-select" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}>
            {UBICACIONES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
    </Modal>
  );
}

export default function Mesas() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const mesas = useCarga("/mesas/");
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [formulario, setFormulario] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null);

  const lista = useMemo(() => mesas.datos || [], [mesas.datos]);
  const filtradas = useMemo(() => {
    const texto = filtros.buscar.trim();
    return lista.filter((m) => {
      if (filtros.estados.length && !filtros.estados.includes(m.estado_mesa ? "libre" : "ocupada")) return false;
      if (filtros.ubicaciones.length && !filtros.ubicaciones.includes(m.ubicacion)) return false;
      return !texto || String(m.numero_mesa).includes(texto);
    });
  }, [lista, filtros]);
  const paginado = usePaginaLocal(filtradas, JSON.stringify(filtros));

  const reemplazar = (mesa) => mesas.setDatos((l) => l.map((m) => (m.id_mesa === mesa.id_mesa ? mesa : m)));

  const cambiarEstado = async (mesa) => {
    const accion = mesa.estado_mesa ? "marcar como ocupada" : "liberar";
    // Con una comanda activa no se puede liberar: como en Django, no se pregunta nada
    // y se muestra directamente el mensaje que devuelve el servidor
    const conComanda = !mesa.estado_mesa && mesa.comanda_abierta;
    if (!conComanda && !(await confirmar(`¿Querés ${accion} la mesa ${mesa.numero_mesa}?`))) return;
    setOcupado(mesa.id_mesa);
    setError("");
    try {
      const { data } = await api.post(`/mesas/${mesa.id_mesa}/estado/`);
      reemplazar(data);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (mesa) => {
    if (mesa.comanda_abierta) {
      setError(`No se puede eliminar la mesa ${mesa.numero_mesa} porque tiene comandas registradas.`);
      return;
    }
    if (!await confirmar(`¿Eliminar la mesa ${mesa.numero_mesa}?`)) return;
    setOcupado(mesa.id_mesa);
    setError("");
    try {
      await api.delete(`/mesas/${mesa.id_mesa}/`);
      mesas.setDatos((l) => l.filter((m) => m.id_mesa !== mesa.id_mesa));
      setAviso(`Se eliminó la mesa ${mesa.numero_mesa}.`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const alGuardar = (mesa, esNueva) => {
    if (esNueva) mesas.setDatos((l) => [...l, mesa].sort((a, b) => a.numero_mesa - b.numero_mesa));
    else reemplazar(mesa);
    setAviso(`Se guardó la mesa ${mesa.numero_mesa}.`);
    setFormulario(null);
  };

  const puedeEditar = puede("mesas:modificar");

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Mesas" subtitulo="Controla el estado de las mesas del restaurante.">
        {puede("mesas:escribir") && (
          <button type="button" className="btn btn-marca" onClick={() => setFormulario({ nueva: true })}>
            <Icono nombre="add" /> Nueva mesa
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || mesas.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => {
              setFiltros(borrador);
              mesas.recargar();
            }}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              setFiltros(FILTROS_VACIOS);
            }}
          >
            <FiltroBuscar id="buscar-mesa" valor={borrador.buscar} onCambiar={(v) => setBorrador({ ...borrador, buscar: v })} placeholder="Número de mesa..." />
            <FiltroCasillas
              titulo="Ubicación"
              todos="Todas"
              opciones={UBICACIONES.map((u) => ({ valor: u.valor, texto: u.nombre }))}
              elegidos={borrador.ubicaciones}
              onCambiar={(v) => setBorrador({ ...borrador, ubicaciones: v })}
            />
            <FiltroCasillas titulo="Estado" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {mesas.cargando && !mesas.datos ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Ubicación</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((m) => (
                  <tr key={m.id_mesa}>
                    <td className="fw-semibold">Mesa {m.numero_mesa}</td>
                    <td>{m.ubicacion_nombre}</td>
                    <td>
                      <span className={`badge ${m.estado_mesa ? "text-bg-success" : "text-bg-danger"}`}>{m.estado_mesa ? "Disponible" : "Ocupada"}</span>
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        {m.comanda_abierta && puede("comandas:leer") && (
                          <BotonAccion tipo="ver" icono="receipt" titulo={`Ver comanda #${m.comanda_abierta}`} a={`/comandas/${m.comanda_abierta}`} />
                        )}
                        {!m.comanda_abierta && m.estado_mesa && puede("comandas:escribir") && (
                          <BotonAccion tipo="activar" icono="add" titulo={`Nueva comanda en la mesa ${m.numero_mesa}`} a={`/comandas/nueva?mesa=${m.id_mesa}`} />
                        )}
                        {puedeEditar && (
                          <>
                            <BotonAccion tipo="editar" titulo={`Editar mesa ${m.numero_mesa}`} onClick={() => setFormulario(m)} />
                            <BotonAccion
                              tipo={m.estado_mesa ? "desactivar" : "activar"}
                              titulo={m.estado_mesa ? `Ocupar mesa ${m.numero_mesa}` : `Liberar mesa ${m.numero_mesa}`}
                              disabled={ocupado === m.id_mesa}
                              onClick={() => cambiarEstado(m)}
                            />
                          </>
                        )}
                        {puede("comandas:leer") && (
                          <BotonAccion tipo="eliminar" icono="receipt_long" titulo={`Ver comandas de la mesa ${m.numero_mesa}`} a={`/comandas?mesa=${m.id_mesa}`} />
                        )}
                        {puede("mesas:eliminar") && (
                          <BotonAccion tipo="desactivar" icono="delete" titulo={`Eliminar mesa ${m.numero_mesa}`} disabled={ocupado === m.id_mesa} onClick={() => eliminar(m)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtradas.length && <Vacio columnas={4}>{lista.length ? "Ninguna mesa coincide con los filtros." : "Todavía no hay mesas."}</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre="mesas" onPagina={paginado.irA} />
      </ListadoLayout>

      {formulario && <FormularioMesa mesa={formulario.nueva ? null : formulario} onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />}
    </div>
  );
}
