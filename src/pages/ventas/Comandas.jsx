import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Encabezado, InsigniaComanda, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, FiltroFechas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { api, mensajeDeError } from "../../services/api";
import { dinero, ESTADOS_COMANDA, fechaHora, fechaISO, opcionesAnularComanda } from "../../utils/formato";

const ESTADOS = Object.entries(ESTADOS_COMANDA)
  .filter(([valor]) => valor !== "cancelado")
  .map(([valor, { nombre }]) => ({ valor, texto: nombre }));

const lista = (texto) => (texto ? texto.split(",").filter(Boolean) : []);

// Panel de filtros. Se crea de nuevo cuando cambia la dirección, para mostrar lo aplicado.
function Filtros({ aplicados, mesas, onAplicar }) {
  const [borrador, setBorrador] = useState({
    buscar: aplicados.buscar,
    estados: lista(aplicados.estado),
    mesas: lista(aplicados.mesa),
    desde: aplicados.fecha_desde,
    hasta: aplicados.fecha_hasta,
  });
  return (
    <PanelFiltros
      onAplicar={() =>
        onAplicar({
          buscar: borrador.buscar.trim(),
          estado: borrador.estados.join(","),
          mesa: borrador.mesas.join(","),
          fecha_desde: borrador.desde,
          fecha_hasta: borrador.hasta,
        })
      }
      onLimpiar={() => onAplicar({})}
    >
      <FiltroBuscar id="buscar-comanda" valor={borrador.buscar} onCambiar={(v) => setBorrador({ ...borrador, buscar: v })} placeholder="N.º de comanda o mozo..." />
      <FiltroCasillas titulo="Estado" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
      {!!mesas.length && (
        <FiltroCasillas
          titulo="Mesa"
          todos="Todas"
          largo
          opciones={mesas.map((m) => ({ valor: String(m.id_mesa), texto: `Mesa ${m.numero_mesa}` }))}
          elegidos={borrador.mesas}
          onCambiar={(v) => setBorrador({ ...borrador, mesas: v })}
        />
      )}
      <FiltroFechas desde={borrador.desde} hasta={borrador.hasta} maximo={fechaISO()} onCambiar={({ desde, hasta }) => setBorrador({ ...borrador, desde, hasta })} />
    </PanelFiltros>
  );
}

// Opciones del menú "Cambiar estado"
const ESTADOS_MENU = [
  { valor: "pendiente", texto: "Pendiente", punto: "pendiente" },
  { valor: "en_preparacion", texto: "En preparación", punto: "preparacion" },
  { valor: "entregado", texto: "Entregado", punto: "entregado" },
];

const CAMPOS = ["buscar", "estado", "mesa", "fecha_desde", "fecha_hasta", "pagina", "por_pagina"];

export default function Comandas() {
  const { puede } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const aplicados = Object.fromEntries(CAMPOS.map((f) => [f, parametros.get(f) || ""]));
  const consulta = Object.fromEntries(Object.entries(aplicados).filter(([, v]) => v));
  const comandas = useCarga("/comandas/consulta/", consulta);
  const mesas = useCarga(puede("mesas:leer") ? "/mesas/" : null);

  const cambiar = (cambios, mantenerPagina = false) => {
    const nuevos = { ...consulta, ...cambios };
    if (!mantenerPagina) delete nuevos.pagina; // Un filtro nuevo vuelve a la primera página
    Object.keys(nuevos).forEach((k) => !nuevos[k] && delete nuevos[k]);
    setParametros(nuevos);
  };

  const aplicarFiltros = (filtros) => {
    const nuevos = { ...filtros };
    if (consulta.por_pagina) nuevos.por_pagina = consulta.por_pagina;
    Object.keys(nuevos).forEach((k) => !nuevos[k] && delete nuevos[k]);
    setParametros(nuevos);
  };

  const datos = comandas.datos;
  const porPagina = datos?.por_pagina || Number(aplicados.por_pagina) || 10;
  const puedeModificar = puede("comandas:modificar");
  const navegar = useNavigate();
  const [menu, setMenu] = useState(null); // {comanda, top, right, arriba}
  const confirmar = useConfirmar();
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!menu) return undefined;
    const cerrar = () => setMenu(null);
    const alPresionar = (e) => e.key === "Escape" && cerrar();
    const alTocar = (e) => !e.target.closest(".menu-estado") && !e.target.closest(".btn-estado") && cerrar();
    document.addEventListener("mousedown", alTocar);
    document.addEventListener("keydown", alPresionar);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", alTocar);
      document.removeEventListener("keydown", alPresionar);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [menu]);

  const abrirMenu = (evento, comanda) => {
    if (menu?.comanda.id_comanda === comanda.id_comanda) return setMenu(null);
    const caja = evento.currentTarget.getBoundingClientRect();
    const arriba = window.innerHeight - caja.bottom < 260;
    setMenu({ comanda, top: arriba ? caja.top - 5 : caja.bottom + 5, right: window.innerWidth - caja.right, arriba });
  };

  const cambiarEstado = async (comanda, estado, motivoAnulacion) => {
    setMenu(null);
    setError("");
    setEnviando(true);
    try {
      const { data } = await api.post(`/comandas/${comanda.id_comanda}/estado/`, { estado, motivo: motivoAnulacion });
      setAviso(`Comanda #${comanda.id_comanda}: ${data.estado_nombre}.`);
      comandas.recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Comandas" subtitulo="Gestiona los pedidos y comandas del restaurante.">
        {puede("comandas:escribir") && (
          <Link className="btn btn-marca" to="/comandas/nueva">
            <Icono nombre="add" /> Nueva comanda
          </Link>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || comandas.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <Filtros
            key={["buscar", "estado", "mesa", "fecha_desde", "fecha_hasta"].map((c) => aplicados[c]).join("|")}
            aplicados={aplicados}
            mesas={mesas.datos || []}
            onAplicar={aplicarFiltros}
          />
        }
      >
        <CabeceraResultados porPagina={porPagina} onPorPagina={(n) => cambiar({ por_pagina: String(n) })} />
        {!datos ? (
          comandas.cargando && <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Mesa</th>
                  <th scope="col">Mozo</th>
                  <th scope="col">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className={comandas.cargando ? "opacity-50" : ""}>
                {datos.resultados.map((c) => (
                  <tr key={c.id_comanda}>
                    <td className="fw-semibold">{c.id_comanda}</td>
                    <td>Mesa {c.mesa_numero}</td>
                    <td>{c.mozo}</td>
                    <td className="text-nowrap">
                      {dinero(c.total_comanda)}
                      {/* Con pagos parciales*/}
                      {c.estado_comanda !== "pagado" && Number(c.total_pagado) > 0 && (
                        <small className="d-block text-secondary">Saldo: {dinero(c.saldo_pendiente)}</small>
                      )}
                    </td>
                    <td>
                      <InsigniaComanda estado={c.estado_comanda} nombre={c.estado_nombre} />
                    </td>
                    <td className="text-nowrap">{fechaHora(c.fecha_hora)}</td>
                    <td>
                      <div className="acciones-tabla">
                        {c.esta_abierta && puedeModificar ? (
                          <button
                            type="button"
                            className="btn-icon btn-estado"
                            title="Cambiar estado"
                            aria-label={`Cambiar el estado de la comanda #${c.id_comanda}`}
                            aria-haspopup="menu"
                            aria-expanded={menu?.comanda.id_comanda === c.id_comanda}
                            onClick={(e) => abrirMenu(e, c)}
                          >
                            <Icono nombre="published_with_changes" />
                          </button>
                        ) : (
                          <span className="btn-icon btn-bloqueado" title={c.esta_abierta ? "Sin permiso para cambiar el estado" : "Comanda cerrada"}>
                            <Icono nombre="lock" />
                          </span>
                        )}
                        <BotonAccion tipo="ver" titulo={`Ver detalle de la comanda #${c.id_comanda}`} a={`/comandas/${c.id_comanda}`} />
                        {c.esta_abierta && puedeModificar ? (
                          <BotonAccion tipo="editar" titulo={`Editar la comanda #${c.id_comanda}`} a={`/comandas/${c.id_comanda}/editar`} />
                        ) : (
                          <span className="btn-icon btn-bloqueado" title="No se puede editar: la comanda está cerrada">
                            <Icono nombre="edit_off" />
                          </span>
                        )}
                        <BotonAccion tipo="eliminar" icono="receipt" titulo={`Comprobante de la comanda #${c.id_comanda}`} a={`/comandas/${c.id_comanda}/comprobante`} />
                        <BotonAccion tipo="activar" icono="print" titulo={`Ticket de cocina de la comanda #${c.id_comanda}`} a={`/comandas/${c.id_comanda}/tickets`} />
                      </div>
                    </td>
                  </tr>
                ))}
                {!datos.resultados.length && <Vacio columnas={7}>No hay comandas con estos filtros.</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        {datos && (
          <PaginacionNumeros pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} nombre="comandas" onPagina={(p) => cambiar({ pagina: String(p) }, true)} />
        )}
      </ListadoLayout>

      {menu && (
        <div
          className={`menu-estado ${menu.arriba ? "menu-estado-arriba" : ""}`}
          role="menu"
          style={{ top: menu.top, right: menu.right }}
        >
          {ESTADOS_MENU.map((e) => (
            <button
              key={e.valor}
              type="button"
              role="menuitem"
              className="menu-estado-item"
              disabled={enviando || menu.comanda.estado_comanda === e.valor}
              onClick={() => cambiarEstado(menu.comanda, e.valor)}
            >
              <span className={`punto-estado ${e.punto}`} /> {e.texto}
            </button>
          ))}
          {/* El cobro se hace desde el detalle, donde está la ventana de pago */}
          <button type="button" role="menuitem" className="menu-estado-item" onClick={() => navegar(`/comandas/${menu.comanda.id_comanda}?cobrar=1`)}>
            <span className="punto-estado pagado" /> Pagado
          </button>
          <hr className="menu-estado-separador" />
          <button
            type="button"
            role="menuitem"
            className="menu-estado-item texto-peligro"
            disabled={Number(menu.comanda.total_pagado) > 0}
            title={Number(menu.comanda.total_pagado) > 0 ? "La comanda tiene pagos registrados" : undefined}
            onClick={async () => {
              const comanda = menu.comanda;
              setMenu(null);
              const respuesta = await confirmar(opcionesAnularComanda(comanda));
              if (respuesta) cambiarEstado(comanda, "anulado", respuesta.motivo);
            }}
          >
            <span className="punto-estado anulado" /> Anular comanda
          </button>
        </div>
      )}

    </div>
  );
}
