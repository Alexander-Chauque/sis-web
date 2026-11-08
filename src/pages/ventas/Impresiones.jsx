// Comprobante para el cliente y tickets para cocina, bar y parrilla. Se ven sin el menú, listos para imprimir.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta } from "../../components/Comunes";
import { useCarga } from "../../hooks/useCarga";
import { dinero, fecha, fechaHora } from "../../utils/formato";

function Acciones({ id, children }) {
  return (
    <div className="d-flex flex-wrap justify-content-center gap-2 my-4 no-imprimir">
      {children}
      <Link className="btn btn-outline-secondary" to={`/comandas/${id}`}>
        Volver a la comanda
      </Link>
    </div>
  );
}

const hora = (valor) => new Date(valor).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export function Comprobante() {
  const { id } = useParams();
  const { datos: comanda, cargando, error } = useCarga(`/comandas/${id}/`);
  if (cargando) return <Cargando />;
  if (!comanda) return <Alerta>{error}</Alerta>;

  return (
    <main className="pagina-impresion">
      <section className="papel">
        <h1 className="titulo-marca text-center h3 mb-0">Los Cardones</h1>
        <p className="text-center small mb-3">Comprobante no válido como factura</p>
        <div className="d-flex justify-content-between small">
          <span>Comanda N.º {String(comanda.id_comanda).padStart(6, "0")}</span>
          <span>Mesa {comanda.mesa_numero}</span>
        </div>
        <div className="d-flex justify-content-between small">
          <span>{fecha(comanda.fecha_hora)}</span>
          <span>{hora(comanda.fecha_hora)}</span>
        </div>
        <div className="small mb-2">Atendió: {comanda.mozo}</div>
        <hr className="corte" />
        <table className="w-100 small">
          <thead>
            <tr>
              <th>Cant.</th>
              <th>Detalle</th>
              <th className="text-end">Importe</th>
            </tr>
          </thead>
          <tbody>
            {comanda.items.map((item, n) => (
              <tr key={`${item.tipo}-${item.id ?? `eliminado-${n}`}`}>
                <td>{item.cantidad}</td>
                <td>
                  {item.nombre}
                  <span className="d-block text-secondary">{dinero(item.precio)} c/u</span>
                </td>
                <td className="text-end">{dinero(Number(item.precio) * item.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="corte" />
        <div className="d-flex justify-content-between fw-bold fs-5">
          <span>TOTAL</span>
          <span>{dinero(comanda.total_comanda)}</span>
        </div>
        {comanda.pagos.map((p) => (
          <div key={p.id_pago} className="d-flex justify-content-between small">
            <span>
              {p.metodo} ({fechaHora(p.fecha_hora)})
            </span>
            <span>{dinero(p.monto)}</span>
          </div>
        ))}
        {Number(comanda.total_pagado) > 0 && (
          <div className="d-flex justify-content-between small fw-semibold">
            <span>Saldo</span>
            <span>{dinero(comanda.saldo_pendiente)}</span>
          </div>
        )}
        {comanda.estado_comanda === "anulado" && <p className="aviso-anulada mt-2">COMANDA ANULADA</p>}
        <p className="text-center small mt-3 mb-0">¡Gracias por su visita!</p>
      </section>
      <Acciones id={id}>
        <button type="button" className="btn btn-marca" onClick={() => window.print()}>
          Imprimir comprobante
        </button>
      </Acciones>
    </main>
  );
}

// Bebidas al bar, platos de la categoría Parrilla a la parrilla y el resto a la cocina, como en Django
const ESTACIONES = [
  { clave: "cocina", titulo: "PLATOS", destino: "Cocina" },
  { clave: "bar", titulo: "BEBIDAS", destino: "Bar" },
  { clave: "parrilla", titulo: "PARRILLA", destino: "Parrilla" },
];

const estacionDe = (item) => {
  if (item.tipo === "bebida") return "bar";
  return (item.categoria || "").trim().toLowerCase() === "parrilla" ? "parrilla" : "cocina";
};

export function Tickets() {
  const { id } = useParams();
  const { datos: comanda, cargando, error } = useCarga(`/comandas/${id}/`);
  const [elegido, setElegido] = useState(null);

  if (cargando) return <Cargando />;
  if (!comanda) return <Alerta>{error}</Alerta>;

  const tickets = ESTACIONES.map((e) => ({ ...e, productos: comanda.items.filter((i) => estacionDe(i) === e.clave) })).filter(
    (t) => t.productos.length,
  );
  const anulada = ["anulado", "cancelado"].includes(comanda.estado_comanda);

  // Para imprimir uno solo, se ocultan los demás mientras dura la impresión
  const imprimir = (clave) => {
    setElegido(clave);
    const alTerminar = () => {
      setElegido(null);
      window.removeEventListener("afterprint", alTerminar);
    };
    window.addEventListener("afterprint", alTerminar);
    // Espera a que React oculte los otros tickets antes de abrir la impresión
    setTimeout(() => window.print(), 50);
  };

  return (
    <main className="pagina-impresion">
      <div className="tickets">
        {tickets.map((t) => (
          <div key={t.clave} className={`ticket-columna ${elegido && elegido !== t.clave ? "no-imprimir" : ""} ${elegido === t.clave ? "ticket-elegido" : ""}`}>
            <section className="papel">
              <h1 className="titulo-marca text-center h4 mb-2">Los Cardones</h1>
              <div className="ticket-banda">{t.titulo}</div>
              <div className="small">
                <div className="d-flex justify-content-between border-bottom py-1">
                  <span><strong>Comanda N.º:</strong> {String(comanda.id_comanda).padStart(6, "0")}</span>
                  <span><strong>Mesa:</strong> {String(comanda.mesa_numero).padStart(2, "0")}</span>
                </div>
                <div className="d-flex justify-content-between border-bottom py-1">
                  <span><strong>Fecha:</strong> {fecha(comanda.fecha_hora)}</span>
                  <span><strong>Hora:</strong> {hora(comanda.fecha_hora)}</span>
                </div>
                <div className="py-1">
                  <strong>Mozo:</strong> {comanda.mozo}
                </div>
              </div>
              {anulada && <p className="aviso-anulada">COMANDA ANULADA: NO PREPARAR</p>}
              <hr className="corte" />
              <table className="w-100 tabla-ticket">
                <thead>
                  <tr>
                    <th>Cant.</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {t.productos.map((p) => (
                    <tr key={`${p.tipo}-${p.id}`}>
                      <td className="fw-bold text-center">{p.cantidad}</td>
                      <td>{p.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="corte" />
              {comanda.observaciones_comanda && (
                <div className="small">
                  <strong>Observaciones:</strong>
                  <p className="fst-italic mb-0">{comanda.observaciones_comanda}</p>
                </div>
              )}
            </section>
            <button type="button" className="btn btn-marca w-100 mt-2 no-imprimir" onClick={() => imprimir(t.clave)}>
              Imprimir ticket de {t.destino.toLowerCase()}
            </button>
          </div>
        ))}
        {!tickets.length && <p className="text-center">Esta comanda no tiene productos para preparar.</p>}
      </div>
      <Acciones id={id}>
        {tickets.length > 1 && (
          <button type="button" className="btn btn-marca" onClick={() => window.print()}>
            Imprimir los {tickets.length} tickets
          </button>
        )}
      </Acciones>
    </main>
  );
}
