import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, InsigniaComanda, Modal } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { api, mensajeDeError } from "../../services/api";
import { dinero, fechaHora, montoValido, opcionesAnularComanda, textoMonto } from "../../utils/formato";

// Los mismos métodos que acepta el modelo Pago de Django
const METODOS_PAGO = [
  { valor: "efectivo", nombre: "Efectivo" },
  { valor: "tarjeta", nombre: "Tarjeta de débito/crédito" },
  { valor: "transferencia", nombre: "Transferencia" },
  { valor: "mercadopago", nombre: "Mercado Pago" },
];
const ESTADOS_ABIERTOS = [
  { valor: "pendiente", nombre: "Pendiente" },
  { valor: "en_preparacion", nombre: "En preparación" },
  { valor: "entregado", nombre: "Entregado" },
];

function Cobro({ comanda, onCerrar, onListo }) {
  const [tipo, setTipo] = useState("total");
  const [metodo, setMetodo] = useState("efectivo");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setError("");
    if (tipo === "parcial" && !montoValido(monto)) return setError("Ingresá un monto mayor a 0, con hasta 2 decimales.");
    if (tipo === "parcial" && Number(textoMonto(monto)) > Number(comanda.saldo_pendiente)) {
      return setError(`El monto no puede superar el saldo de ${dinero(comanda.saldo_pendiente)}.`);
    }
    setEnviando(true);
    try {
      const { data } = await api.post(`/comandas/${comanda.id_comanda}/pago/`, {
        tipo_pago: tipo,
        metodo_pago: metodo,
        monto: tipo === "parcial" ? textoMonto(monto) : undefined,
      });
      onListo(data);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={`Cobrar comanda #${comanda.id_comanda}`} onCerrar={onCerrar} onEnviar={enviar} enviando={enviando} textoEnviar="Registrar pago">
      <Alerta>{error}</Alerta>
      <p className="fs-5">
        Saldo pendiente: <strong>{dinero(comanda.saldo_pendiente)}</strong>
      </p>
      <fieldset className="mb-3">
        <legend className="form-label fs-6">¿Cuánto paga?</legend>
        {[
          ["total", "Todo el saldo"],
          ["parcial", "Una parte"],
        ].map(([valor, nombre]) => (
          <div className="form-check form-check-inline" key={valor}>
            <input className="form-check-input" type="radio" name="tipo-pago" id={`tipo-${valor}`} checked={tipo === valor} onChange={() => setTipo(valor)} />
            <label className="form-check-label" htmlFor={`tipo-${valor}`}>
              {nombre}
            </label>
          </div>
        ))}
      </fieldset>
      {tipo === "parcial" && (
        <Campo id="monto-pago" etiqueta="Monto *" prefijo="$">
          <input id="monto-pago" className="form-control" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </Campo>
      )}
      <Campo id="metodo-pago" etiqueta="Método de pago *" className="mb-0">
        <select id="metodo-pago" className="form-select" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          {METODOS_PAGO.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.nombre}
            </option>
          ))}
        </select>
      </Campo>
    </Modal>
  );
}

export default function DetalleComanda() {
  const { id } = useParams();
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const navegar = useNavigate();
  const { datos: comanda, cargando, error: errorCarga, setDatos } = useCarga(`/comandas/${id}/`);
  const [parametros] = useSearchParams();
  // Desde "Cambiar estado > Pagado" de la lista se llega con ?cobrar=1: abre el cobro directamente
  const [ventana, setVentana] = useState(() => (parametros.get("cobrar") ? "cobro" : null)); // "cobro" o null
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (cargando) return <Cargando />;
  if (!comanda) return <Alerta>{errorCarga}</Alerta>;

  const cambiarEstado = async (estado, motivoAnulacion) => {
    setError("");
    setEnviando(true);
    try {
      const { data } = await api.post(`/comandas/${id}/estado/`, { estado, motivo: motivoAnulacion });
      setDatos(data);
      setVentana(null);
      setAviso(`Estado actualizado: ${data.estado_nombre}.`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  // Misma ventana que "Anular comanda" de la lista, con el motivo obligatorio
  const anular = async () => {
    const respuesta = await confirmar(opcionesAnularComanda(comanda));
    if (respuesta) cambiarEstado("anulado", respuesta.motivo);
  };

  const eliminar = async () => {
    if (!await confirmar(`¿Eliminar la comanda #${id}? La mesa quedará libre.`)) return;
    setEnviando(true);
    try {
      await api.delete(`/comandas/${id}/`);
      navegar("/comandas");
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  const puedeModificar = puede("comandas:modificar");

  return (
    <>
      <Encabezado titulo={`Comanda #${comanda.id_comanda}`} subtitulo={`Mesa ${comanda.mesa_numero} · ${comanda.mozo} · ${fechaHora(comanda.fecha_hora)}`}>
        <Link className="btn btn-outline-secondary" to={`/comandas/${id}/tickets`}>
          Tickets
        </Link>
        <Link className="btn btn-outline-secondary" to={`/comandas/${id}/comprobante`}>
          Comprobante
        </Link>
        {puedeModificar && comanda.esta_abierta && (
          <Link className="btn btn-outline-secondary" to={`/comandas/${id}/editar`}>
            Editar productos
          </Link>
        )}
        {puedeModificar && comanda.esta_abierta && Number(comanda.saldo_pendiente) > 0 && (
          <button type="button" className="btn btn-marca" onClick={() => setVentana("cobro")}>
            Cobrar
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={!ventana && error} onListo={() => setError("")} />

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col" className="text-end">Cant.</th>
                    <th scope="col" className="text-end">Precio</th>
                    <th scope="col" className="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {comanda.items.map((item, n) => (
                    <tr key={`${item.tipo}-${item.id ?? `eliminado-${n}`}`}>
                      <td>
                        {item.nombre}
                        {!item.disponible && <span className="small text-danger"> (ya no disponible)</span>}
                      </td>
                      <td className="text-end">{item.cantidad}</td>
                      <td className="text-end text-nowrap">{dinero(item.precio)}</td>
                      <td className="text-end text-nowrap">{dinero(Number(item.precio) * item.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} className="text-end">Total</th>
                    <th className="text-end text-nowrap">{dinero(comanda.total_comanda)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          {comanda.observaciones_comanda && (
            <div className="card shadow-sm mt-3">
              <div className="card-body">
                <h2 className="h6">Observaciones</h2>
                <p className="mb-0">{comanda.observaciones_comanda}</p>
              </div>
            </div>
          )}
        </div>

        <div className="col-12 col-lg-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Estado</span>
                <InsigniaComanda estado={comanda.estado_comanda} nombre={comanda.estado_nombre} />
              </div>
              {comanda.motivo_anulacion && <p className="small text-danger">Motivo de anulación: {comanda.motivo_anulacion}</p>}
              <dl className="row mb-0">
                <dt className="col-6 fw-normal">Total</dt>
                <dd className="col-6 text-end">{dinero(comanda.total_comanda)}</dd>
                <dt className="col-6 fw-normal">Pagado</dt>
                <dd className="col-6 text-end">{dinero(comanda.total_pagado)}</dd>
                <dt className="col-6">Saldo</dt>
                <dd className="col-6 text-end fw-bold mb-0">{dinero(comanda.saldo_pendiente)}</dd>
              </dl>
              {puedeModificar && comanda.esta_abierta && (
                <div className="mt-3">
                  <label htmlFor="nuevo-estado" className="form-label small">Cambiar estado</label>
                  <div className="d-flex gap-2">
                    <select
                      id="nuevo-estado"
                      className="form-select form-select-sm"
                      value={comanda.estado_comanda}
                      disabled={enviando}
                      onChange={(e) => cambiarEstado(e.target.value)}
                    >
                      {ESTADOS_ABIERTOS.map((e) => (
                        <option key={e.valor} value={e.valor}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h2 className="h6">Pagos</h2>
              {!comanda.pagos.length && <p className="text-secondary small mb-0">Sin pagos registrados.</p>}
              <ul className="list-unstyled mb-0">
                {comanda.pagos.map((p) => (
                  <li key={p.id_pago} className="d-flex justify-content-between small border-bottom py-1">
                    <span>
                      {p.metodo}
                      <span className="d-block text-secondary">{fechaHora(p.fecha_hora)}</span>
                    </span>
                    <strong>{dinero(p.monto)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {comanda.puede_modificarse && (puedeModificar || puede("comandas:eliminar")) && (
            <div className="d-flex gap-2">
              {puedeModificar && (
                <button type="button" className="btn btn-outline-danger flex-fill" onClick={anular}>
                  Anular
                </button>
              )}
              {puede("comandas:eliminar") && (
                <button type="button" className="btn btn-danger flex-fill" disabled={enviando} onClick={eliminar}>
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {ventana === "cobro" && comanda.esta_abierta && Number(comanda.saldo_pendiente) > 0 && puedeModificar && (
        <Cobro
          comanda={comanda}
          onCerrar={() => setVentana(null)}
          onListo={(data) => {
            setDatos(data);
            setVentana(null);
            setAviso(data.estado_comanda === "pagado" ? "Comanda pagada en su totalidad. La mesa quedó libre." : `Pago registrado. Saldo: ${dinero(data.saldo_pendiente)}.`);
          }}
        />
      )}
    </>
  );
}
