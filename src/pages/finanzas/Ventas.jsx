// Ventas, con el diseño de Django: tarjeta para registrar la venta arriba e historial abajo.
import { useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Encabezado, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { Icono } from "../../components/Icono";
import { PaginacionNumeros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import { dinero, fechaHora, fechaISO, montoValido, OPCIONES_POR_PAGINA, textoMonto } from "../../utils/formato";

// Campo con un ícono a la izquierda, como los de la pantalla de ventas de Django
function CampoConIcono({ id, etiqueta, icono, children }) {
  return (
    <div className="col-12 col-md-6">
      <label htmlFor={id} className="form-label">
        {etiqueta}
      </label>
      <div className="campo-con-icono">
        <Icono nombre={icono} />
        {children}
      </div>
    </div>
  );
}

function RegistrarVenta({ pendientes, metodos, onRegistrada }) {
  const [comanda, setComanda] = useState(pendientes.length === 1 ? String(pendientes[0].id_comanda) : "");
  const [metodo, setMetodo] = useState(metodos.length === 1 ? String(metodos[0].id_metodo_pago) : "");
  const [recibido, setRecibido] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const elegida = pendientes.find((c) => String(c.id_comanda) === comanda);
  const vuelto = elegida && montoValido(recibido, { permitirCero: true }) ? Number(textoMonto(recibido)) - Number(elegida.saldo) : null;

  const registrar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (!elegida || !metodo) return setError("Elegí la comanda y el método de pago.");
    if (vuelto === null) return setError("Ingresá el monto recibido, con hasta 2 decimales.");
    if (vuelto < 0) return setError("El monto recibido es menor al total de la comanda.");
    setEnviando(true);
    try {
      const { data } = await api.post("/ventas/", { comanda: Number(comanda), metodo_pago: Number(metodo), monto_recibido: textoMonto(recibido) });
      setComanda("");
      setRecibido("");
      onRegistrada(data);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={registrar}>
      <Notificar texto={error} onListo={() => setError("")} />
      <div className="row g-3">
        <CampoConIcono id="venta-comanda" etiqueta="Comanda pendiente" icono="receipt_long">
          <select id="venta-comanda" required value={comanda} onChange={(e) => setComanda(e.target.value)}>
            <option value="">{pendientes.length ? "Elegí una comanda" : "No hay comandas para cobrar"}</option>
            {pendientes.map((c) => (
              <option key={c.id_comanda} value={c.id_comanda}>
                #{c.id_comanda} · Mesa {c.mesa} · {dinero(c.saldo)}
              </option>
            ))}
          </select>
        </CampoConIcono>
        <CampoConIcono id="venta-metodo" etiqueta="Método de pago" icono="credit_card">
          <select id="venta-metodo" required value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="">Elegí</option>
            {metodos.map((m) => (
              <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                {m.nombre_metodo_pago}
              </option>
            ))}
          </select>
        </CampoConIcono>
        <CampoConIcono id="venta-total" etiqueta="Total de la venta" icono="payments">
          <input id="venta-total" readOnly value={elegida ? dinero(elegida.saldo) : ""} placeholder="Se completa al elegir la comanda" />
        </CampoConIcono>
        <CampoConIcono id="venta-recibido" etiqueta="Monto recibido" icono="attach_money">
          <input id="venta-recibido" inputMode="decimal" required placeholder="0,00" value={recibido} onChange={(e) => setRecibido(e.target.value)} />
        </CampoConIcono>
        <CampoConIcono id="venta-vuelto" etiqueta="Vuelto estimado" icono="currency_exchange">
          <input
            id="venta-vuelto"
            readOnly
            className={vuelto !== null && vuelto < 0 ? "text-danger" : ""}
            value={vuelto === null ? "" : vuelto < 0 ? "Falta dinero" : dinero(vuelto)}
            placeholder="—"
          />
        </CampoConIcono>
        <div className="col-12 col-md-6 d-flex align-items-end">
          <button type="submit" className="btn btn-marca w-100" disabled={enviando || !pendientes.length}>
            <Icono nombre="point_of_sale" /> {enviando ? "Registrando..." : "Registrar venta"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function Ventas() {
  const { puede } = useAuth();
  const [filtros, setFiltros] = useState({ fecha_desde: "", fecha_hasta: "", pagina: 1, por_pagina: 10 });
  const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
  const ventas = useCarga("/ventas/", consulta);
  const [aviso, setAviso] = useState("");

  const datos = ventas.datos;
  const cambiar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor, pagina: campo === "pagina" ? valor : 1 }));

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Gestión de ventas" subtitulo="Registrar pagos y consultar las ventas realizadas." icono="payments">
        {puede("caja:leer") && (
          <Link className="btn btn-outline-secondary" to="/finanzas/metodos-pago">
            <Icono nombre="category" /> Métodos de pago
          </Link>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={ventas.error} />
      {datos && !datos.caja_abierta && (
        <Alerta tipo="warning">
          No hay una caja abierta: no se pueden registrar ventas. {puede("caja:leer") && <Link to="/finanzas/cajas">Ir a cajas</Link>}
        </Alerta>
      )}
      {datos?.caja_abierta && !datos.metodos_pago.length && <Alerta tipo="warning">No hay métodos de pago activos.</Alerta>}

      {puede("ventas:escribir") && datos?.caja_abierta && (
        <section className="tarjeta-seccion">
          <div className="tarjeta-seccion-titulo">
            <Icono nombre="point_of_sale" />
            <h2>Registrar venta</h2>
          </div>
          <div className="tarjeta-seccion-cuerpo">
            <RegistrarVenta
              key={datos.comandas_pendientes.map((c) => c.id_comanda).join(",")}
              pendientes={datos.comandas_pendientes}
              metodos={datos.metodos_pago}
              onRegistrada={(v) => {
                setAviso(`Venta #${v.id_venta} registrada. Vuelto: ${dinero(v.vuelto)}.`);
                ventas.recargar();
              }}
            />
          </div>
        </section>
      )}

      <section className="tarjeta-seccion">
        <div className="tarjeta-seccion-titulo">
          <Icono nombre="history" />
          <h2>Historial de ventas</h2>
          <div className="tarjeta-seccion-extra">
            <label className="mostrar-registros">
              Desde
              <input type="date" className="form-control form-control-sm" max={filtros.fecha_hasta || fechaISO()} value={filtros.fecha_desde} onChange={(e) => cambiar("fecha_desde", e.target.value)} />
            </label>
            <label className="mostrar-registros">
              Hasta
              <input type="date" className="form-control form-control-sm" min={filtros.fecha_desde || undefined} max={fechaISO()} value={filtros.fecha_hasta} onChange={(e) => cambiar("fecha_hasta", e.target.value)} />
            </label>
            <label className="mostrar-registros">
              Registros por página
              <select value={filtros.por_pagina} onChange={(e) => cambiar("por_pagina", Number(e.target.value))}>
                {OPCIONES_POR_PAGINA.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="tarjeta-seccion-cuerpo">
          {!datos ? (
            ventas.cargando && <Cargando />
          ) : (
            <>
              <div className="table-responsive tabla-con-cabecera">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">N.º de venta</th>
                      <th scope="col">Fecha</th>
                      <th scope="col">Comanda</th>
                      <th scope="col">Método de pago</th>
                      <th scope="col">Total</th>
                      <th scope="col">Monto recibido</th>
                      <th scope="col">Vuelto</th>
                      <th scope="col">Empleado</th>
                      <th scope="col">Caja</th>
                    </tr>
                  </thead>
                  <tbody className={ventas.cargando ? "opacity-50" : ""}>
                    {datos.resultados.map((v) => (
                      <tr key={v.id_venta}>
                        <td className="fw-semibold">#{v.id_venta}</td>
                        <td className="text-nowrap">{fechaHora(v.fecha_venta)}</td>
                        <td>
                          {puede("comandas:leer") ? <Link to={`/comandas/${v.comanda}`}>#{v.comanda}</Link> : `#${v.comanda}`}
                          <span className="small text-secondary"> · Mesa {v.mesa}</span>
                        </td>
                        <td>{v.metodo}</td>
                        <td className="text-nowrap fw-semibold">{dinero(v.total_venta)}</td>
                        <td className="text-nowrap">{dinero(v.monto_recibido)}</td>
                        <td className="text-nowrap">{dinero(v.vuelto)}</td>
                        <td>{v.empleado || "—"}</td>
                        <td>{puede("caja:leer") ? <Link to={`/finanzas/cajas/${v.caja}`}>#{v.caja}</Link> : `#${v.caja}`}</td>
                      </tr>
                    ))}
                    {!datos.resultados.length && <Vacio columnas={9}>No hay ventas registradas.</Vacio>}
                  </tbody>
                </table>
              </div>
              <PaginacionNumeros pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} nombre="ventas" onPagina={(p) => cambiar("pagina", p)} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
