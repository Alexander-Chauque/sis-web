// Detalle de una comanda, igual al de Django (comanda_detalle.html):
// estado, datos de la mesa, productos con sus notas, total y observaciones.
import { useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Encabezado } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import { Cobro } from "./Cobro";

// Insignia de estado de Django: color e ícono por estado
const ESTADOS = {
  pagado: { clase: "badge-pagado", icono: "check_circle", texto: "PAGADO" },
  en_preparacion: { clase: "badge-preparacion", icono: "soup_kitchen", texto: "EN PREPARACIÓN" },
  entregado: { clase: "badge-entregado", icono: "room_service", texto: "ENTREGADO" },
  anulado: { clase: "badge-anulado", icono: "cancel", texto: "ANULADO" },
  pendiente: { clase: "badge-pendiente", icono: "pending", texto: "PENDIENTE" },
};

const pesos = (valor) => `$ ${Math.round(Number(valor) || 0)}`;
const fechaYHora = (valor) => {
  const f = new Date(valor);
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${f.getFullYear()} · ${f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};

export default function DetalleComanda() {
  const { id } = useParams();
  const { puede } = useAuth();
  const { datos: comanda, cargando, error: errorCarga, setDatos } = useCarga(`/comandas/${id}/`);
  const [parametros] = useSearchParams();
  // Con ?cobrar=1 se abre el cobro directamente
  const [cobrando, setCobrando] = useState(() => !!parametros.get("cobrar"));
  const [error, setError] = useState("");
  // Al volver del comprobante después de cobrar llega el aviso del cobro
  const { state } = useLocation();
  const [aviso, setAviso] = useState(state?.aviso || "");
  const [enviando, setEnviando] = useState(false);

  if (cargando) return <Cargando />;
  if (!comanda) return <Alerta>{errorCarga}</Alerta>;

  const puedeModificar = puede("comandas:modificar");
  const estado = ESTADOS[comanda.estado_comanda] || { clase: "badge-pendiente", icono: "pending", texto: comanda.estado_nombre.toUpperCase() };
  const puedeCobrar = puedeModificar && comanda.esta_abierta && comanda.estado_comanda === "entregado" && Number(comanda.saldo_pendiente) > 0;
  const sinEntregar = puedeModificar && ["pendiente", "en_preparacion"].includes(comanda.estado_comanda);

  // Solo se cobra lo entregado: desde acá se la puede marcar como entregada
  const entregar = async () => {
    setEnviando(true);
    try {
      const { data } = await api.post(`/comandas/${id}/estado/`, { estado: "entregado" });
      setDatos(data);
      setAviso(`Comanda #${id}: ${data.estado_nombre}.`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="contenedor-comanda detalle-comanda">
      <Encabezado titulo={`Detalle de comanda #${String(comanda.id_comanda).padStart(4, "0")}`} icono="receipt_long">
        <span className={`badge-estado ${estado.clase}`}>
          <Icono nombre={estado.icono} /> {estado.texto}
        </span>
        {comanda.esta_abierta && puedeModificar ? (
          <Link to={`/comandas/${id}/editar`} className="btn-icon btn-editar" title="Editar comanda" aria-label="Editar comanda">
            <Icono nombre="edit" />
          </Link>
        ) : (
          <span className="btn-icon btn-bloqueado" title="No se puede editar: la comanda está cerrada">
            <Icono nombre="edit_off" />
          </span>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error} onListo={() => setError("")} />

      {/* Información general */}
      <div className="tarjeta-detalle">
        <div className="cuerpo-tarjeta">
          <div className="info-grid-4">
            <div className="info-item">
              <div className="info-icono">
                <Icono nombre="table_restaurant" />
              </div>
              <div className="info-texto">
                <span className="info-label">MESA</span>
                <strong>{comanda.mesa_numero ?? "-"}</strong>
                <span className="mini-badge">{comanda.esta_abierta ? "Ocupada" : "Libre"}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icono">
                <Icono nombre="location_on" />
              </div>
              <div className="info-texto">
                <span className="info-label">UBICACIÓN</span>
                <strong>{comanda.mesa_ubicacion || "Salón"}</strong>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icono">
                <Icono nombre="person" />
              </div>
              <div className="info-texto">
                <span className="info-label">MOZO</span>
                <strong>{comanda.mozo || "Sin asignar"}</strong>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icono">
                <Icono nombre="calendar_month" />
              </div>
              <div className="info-texto">
                <span className="info-label">FECHA Y HORA</span>
                <strong>{fechaYHora(comanda.fecha_hora)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Productos de la comanda */}
      <div className="tarjeta-detalle">
        <div className="titulo-tarjeta">
          <Icono nombre="restaurant" className="icono-naranja" />
          <h3>Productos de la comanda</h3>
        </div>
        <div className="tabla-detalle-contenedor">
          <table className="tabla-detalle-productos">
            <thead>
              <tr>
                <th style={{ width: "10%" }}>Tipo</th>
                <th style={{ width: "40%" }}>Producto</th>
                <th style={{ width: "10%", textAlign: "center" }}>Cantidad</th>
                <th style={{ width: "20%", textAlign: "right" }}>Precio unitario</th>
                <th style={{ width: "20%", textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {comanda.items.map((item, n) => (
                <tr key={n}>
                  <td>
                    <span className={`badge-tipo ${item.tipo === "bebida" ? "badge-bebida" : "badge-plato"}`}>{item.tipo === "bebida" ? "Bebida" : "Plato"}</span>
                  </td>
                  <td>
                    {item.nombre}
                    {item.observacion && (
                      <>
                        <br />
                        <small className="nota-detalle">Nota: {item.observacion}</small>
                      </>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>{item.cantidad}</td>
                  <td style={{ textAlign: "right" }}>{pesos(item.precio)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{pesos(Number(item.precio) * item.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="total-comanda-footer">
          <div className="total-label">
            <Icono nombre="calculate" />
            <strong>Total de la comanda</strong>
          </div>
          <div className="total-valor">{pesos(comanda.total_comanda)}</div>
        </div>
        {Number(comanda.total_pagado) > 0 && (
          <div className="pagado-comanda">
            <span>Pagado: {pesos(comanda.total_pagado)}</span>
            <strong>{Number(comanda.saldo_pendiente) > 0 ? `Saldo: ${pesos(comanda.saldo_pendiente)}` : "Saldado"}</strong>
          </div>
        )}
      </div>

      {/* Observaciones */}
      {comanda.observaciones_comanda && (
        <div className="tarjeta-detalle observaciones-detalle">
          <Icono nombre="info" />
          <div>
            <strong>Observaciones:</strong>
            <p>{comanda.observaciones_comanda}</p>
          </div>
        </div>
      )}
      {comanda.motivo_anulacion && (
        <div className="tarjeta-detalle observaciones-detalle motivo-anulacion">
          <Icono nombre="cancel" />
          <div>
            <strong>Motivo de la anulación:</strong>
            <p>{comanda.motivo_anulacion}</p>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="acciones-detalle">
        <Link to="/comandas" className="btn btn-outline-secondary">
          <Icono nombre="arrow_back" /> Volver
        </Link>
        <Link to={`/comandas/${id}/comprobante`} className="btn btn-outline-secondary">
          <Icono nombre="receipt" /> Comprobante
        </Link>
        <Link to={`/comandas/${id}/tickets`} className="btn btn-outline-secondary">
          <Icono nombre="print" /> Imprimir ticket
        </Link>
        {sinEntregar && (
          <button type="button" className="btn btn-marca" disabled={enviando} onClick={entregar}>
            <Icono nombre="room_service" /> Marcar como entregada
          </button>
        )}
        {puedeCobrar && (
          <button type="button" className="btn btn-marca" onClick={() => setCobrando(true)}>
            <Icono nombre="payments" /> Cobrar
          </button>
        )}
      </div>

      {cobrando && puedeCobrar && (
        <Cobro
          comanda={comanda}
          onCerrar={() => setCobrando(false)}
        />
      )}
    </div>
  );
}
