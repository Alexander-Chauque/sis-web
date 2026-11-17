import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Encabezado, InsigniaComanda, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { Cobro } from "./Cobro";
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
  const confirmar = useConfirmar();
  const [error, setError] = useState("");
  // Al volver de registrar o editar una comanda llega el aviso de que se guardó
  const { state } = useLocation();
  const [aviso, setAviso] = useState(state?.aviso || "");
  const resaltar = state?.resaltar;
  const [enviando, setEnviando] = useState(false);
  const [cobrando, setCobrando] = useState(null); // comanda con el modal de pago abierto

  // Anular desde el listado: pide el motivo y libera la mesa
  const anular = async (comanda) => {
    const respuesta = await confirmar(opcionesAnularComanda(comanda));
    if (respuesta) cambiarEstado(comanda, "anulado", respuesta.motivo);
  };

  const cambiarEstado = async (comanda, estado, motivoAnulacion) => {
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
                  <tr key={c.id_comanda} className={c.id_comanda === resaltar ? "fila-resaltada" : undefined}>
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
                        {/* Entregar el pedido en la mesa: después ya se puede cobrar */}
                        {puedeModificar && ["pendiente", "en_preparacion"].includes(c.estado_comanda) && (
                          <button
                            type="button"
                            className="btn-icon btn-entregar"
                            title={`Marcar la comanda #${c.id_comanda} como entregada`}
                            aria-label={`Marcar la comanda #${c.id_comanda} como entregada`}
                            disabled={enviando}
                            onClick={() => cambiarEstado(c, "entregado")}
                          >
                            <Icono nombre="room_service" />
                          </button>
                        )}
                        {/* Cobrar en el lugar, solo lo que ya se entregó (como en Django) */}
                        {puedeModificar && c.estado_comanda === "entregado" && Number(c.saldo_pendiente) > 0 && (
                          <button type="button" className="btn-icon btn-cobrar" title={`Cobrar la comanda #${c.id_comanda}`} aria-label={`Cobrar la comanda #${c.id_comanda}`} onClick={() => setCobrando(c)}>
                            <Icono nombre="payments" />
                          </button>
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
                        {c.esta_abierta && puedeModificar && Number(c.total_pagado) === 0 ? (
                          <BotonAccion tipo="desactivar" icono="block" titulo={`Anular la comanda #${c.id_comanda}`} disabled={enviando} onClick={() => anular(c)} />
                        ) : (
                          <span
                            className="btn-icon btn-bloqueado"
                            title={!c.esta_abierta ? "Comanda cerrada" : Number(c.total_pagado) > 0 ? "Tiene pagos: no se puede anular" : "Sin permiso para anular"}
                          >
                            <Icono nombre="block" />
                          </span>
                        )}
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

      {cobrando && (
        <Cobro
          comanda={cobrando}
          onCerrar={() => setCobrando(null)}
        />
      )}

    </div>
  );
}
