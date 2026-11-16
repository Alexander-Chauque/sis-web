// Comprobante para el cliente y tickets para cocina, bar y parrilla, iguales a los de Django
// (comanda_comprobante.html y comanda_ticket.html). Se ven sin el menú, listos para imprimir.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import "../../comprobante.css";
import "../../ticket.css";
import { Cargando } from "../../components/Cargando";
import { Alerta } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { fecha } from "../../utils/formato";

const hora = (valor) => new Date(valor).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const diaHora = (valor) => {
  const f = new Date(valor);
  return `${String(f.getDate()).padStart(2, "0")}/${String(f.getMonth() + 1).padStart(2, "0")} ${hora(f)}`;
};
// Pesos sin decimales y con punto de miles, como el "floatformat:0g" de Django
const pesos = (valor) => `$ ${Math.round(Number(valor) || 0).toLocaleString("es-AR")}`;
const seis = (n) => String(n).padStart(6, "0");

export function Comprobante() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const { datos: comanda, cargando, error } = useCarga(`/comandas/${id}/`);
  // Hora de emisión, tomada al abrir la pantalla
  const [ahora] = useState(() => new Date());
  if (cargando) return <Cargando />;
  if (!comanda) return <Alerta>{error}</Alerta>;

  const subtotal = (tipo) => comanda.items.filter((i) => i.tipo === tipo).reduce((s, i) => s + Number(i.precio) * i.cantidad, 0);
  const subtotalPlatos = subtotal("plato");
  const subtotalBebidas = subtotal("bebida");
  const saldo = Number(comanda.saldo_pendiente);

  return (
    <div className="vista-comprobante">
      <main className="comprobante">
        {["anulado", "cancelado"].includes(comanda.estado_comanda) && <div className="sello-anulado">ANULADA</div>}

        <header className="comp-encabezado">
          <img src="/img/ticket/logo.jpeg" alt="Los Cardones - Salta" className="comp-logo" />
          <div className="comp-titulo">
            <h1>Comprobante de venta</h1>
            <dl className="comp-meta">
              <dt>N° de comprobante</dt>
              <dd className="comp-numero">{seis(comanda.id_comanda)}</dd>
              <dt>Fecha</dt>
              <dd>{fecha(comanda.fecha_hora)}</dd>
              <dt>Hora</dt>
              <dd>{hora(comanda.fecha_hora)}</dd>
            </dl>
          </div>
        </header>

        <section className="comp-partes">
          <div>
            <h2>Emitido por</h2>
            <p className="comp-nombre">Peña Los Cardones</p>
            <p>Restaurante folclórico</p>
            <p>Balcarce 922, Salta - Argentina</p>
            <p>Tel: (387) 123-4567</p>
            <p>CUIT: 30-12345678-9</p>
          </div>
          <div className="derecha">
            <h2>Detalle del servicio</h2>
            <p className="comp-nombre">Mesa {comanda.mesa_numero}</p>
            {comanda.mesa_ubicacion && <p>{comanda.mesa_ubicacion}</p>}
            <p>Atendido por: {comanda.mozo || "Sin asignar"}</p>
            <p>
              Estado: <span className={`comp-estado estado-${comanda.estado_comanda}`}>{comanda.estado_nombre}</span>
            </p>
          </div>
        </section>

        <table className="comp-tabla">
          <thead>
            <tr>
              <th className="centrado">Cant.</th>
              <th>Descripción</th>
              <th className="derecha">P. unitario</th>
              <th className="derecha">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {comanda.items.map((item, n) => (
              <tr key={n}>
                <td className="centrado">{item.cantidad}</td>
                <td>
                  {item.nombre}
                  <span className={`comp-tipo ${item.tipo === "bebida" ? "tipo-bebida" : ""}`}>{item.tipo === "bebida" ? "Bebida" : "Plato"}</span>
                </td>
                <td className="derecha">{pesos(item.precio)}</td>
                <td className="derecha">{pesos(Number(item.precio) * item.cantidad)}</td>
              </tr>
            ))}
            {!comanda.items.length && (
              <tr>
                <td colSpan={4} className="centrado comp-vacio">
                  La comanda no tiene productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <section className="comp-resumen">
          <div className="comp-info">
            <h2>Forma de pago</h2>
            {comanda.pagos.length ? (
              <ul className="comp-pagos">
                {comanda.pagos.map((p) => (
                  <li key={p.id_pago}>
                    <Icono nombre="payments" />
                    <span>{p.metodo}</span>
                    <span className="comp-pago-fecha">{diaHora(p.fecha_hora)}</span>
                    <strong>{pesos(p.monto)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="comp-suave">Todavía no se registraron pagos.</p>
            )}
            {comanda.observaciones_comanda && (
              <>
                <h2>Observaciones</h2>
                <p className="comp-suave">{comanda.observaciones_comanda}</p>
              </>
            )}
          </div>

          <div className="comp-totales">
            {subtotalPlatos > 0 && (
              <div className="fila">
                <span>Platos</span>
                <span>{pesos(subtotalPlatos)}</span>
              </div>
            )}
            {subtotalBebidas > 0 && (
              <div className="fila">
                <span>Bebidas</span>
                <span>{pesos(subtotalBebidas)}</span>
              </div>
            )}
            <div className="fila fila-total">
              <span>Total</span>
              <span>{pesos(comanda.total_comanda)}</span>
            </div>
            <div className="fila">
              <span>Pagado</span>
              <span>{pesos(comanda.total_pagado)}</span>
            </div>
            <div className={`fila fila-saldo ${saldo ? "" : "saldado"}`}>
              <span>{saldo ? "Saldo a pagar" : "Saldado"}</span>
              <span>{pesos(saldo)}</span>
            </div>
          </div>
        </section>

        <footer className="comp-pie">
          <p className="comp-gracias">¡Gracias por su visita!</p>
          <p className="comp-suave">Tradición, música y gastronomía del norte argentino</p>
          <p className="comp-legal">
            Emitido por {usuario?.usuario} el {fecha(ahora)} {hora(ahora)} · Documento no válido como factura
          </p>
        </footer>
      </main>

      <div className="comprobante-acciones">
        <button type="button" onClick={() => window.print()} className="btn-imprimir">
          <Icono nombre="print" /> Imprimir
        </button>
        <Link to={`/comandas/${id}`} className="btn-volver">
          <Icono nombre="receipt_long" /> Volver al detalle
        </Link>
        <Link to="/comandas" className="btn-volver">
          <Icono nombre="list" /> Volver al listado
        </Link>
      </div>
    </div>
  );
}

// Bebidas al bar, platos de la categoría Parrilla a la parrilla y el resto a la cocina, como en Django
const ESTACIONES = [
  { clave: "cocina", titulo: "PLATOS", destino: "Cocina", icono: "bandeja" },
  { clave: "bar", titulo: "BEBIDAS", destino: "Bar", icono: "vaso-blanco" },
  { clave: "parrilla", titulo: "PARRILLA", destino: "Parrilla", icono: "parrilla" },
];

const estacionDe = (item) => {
  if (item.tipo === "bebida") return "bar";
  return (item.categoria || "").trim().toLowerCase() === "parrilla" ? "parrilla" : "cocina";
};

export function Tickets() {
  const { id } = useParams();
  const { datos: comanda, cargando, error } = useCarga(`/comandas/${id}/`);
  // Hora de emisión, tomada al abrir la pantalla
  const [ahora] = useState(() => new Date());
  const [elegido, setElegido] = useState(null);
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  // Recién guardada la comanda: se imprime sola y después vuelve al listado
  const alGuardar = parametros.get("imprimir") === "1";
  const { aviso, resaltar } = useLocation().state || {};
  const modificada = parametros.get("modificada") === "1";
  const impresa = useRef(false);

  useEffect(() => {
    if (!alGuardar || !comanda || impresa.current) return undefined;
    const alTerminar = () => navegar("/comandas", { replace: true, state: { aviso, resaltar } });
    window.addEventListener("afterprint", alTerminar, { once: true });
    const espera = setTimeout(() => {
      impresa.current = true;
      window.print();
    }, 300);
    return () => {
      clearTimeout(espera);
      window.removeEventListener("afterprint", alTerminar);
    };
  }, [alGuardar, comanda, navegar, aviso, resaltar]);

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
    <div className={`vista-ticket ${elegido ? "imprimir-uno" : ""}`}>
      <main className="tickets">
        {tickets.map((t) => (
          <div key={t.clave} className={`ticket-columna ${elegido === t.clave ? "ticket-elegido" : ""}`}>
            <section className="ticket">
              {anulada && <div className="ticket-sello">ANULADA</div>}

              <header className="ticket-encabezado">
                <img className="ticket-logo" src="/img/ticket/logo.jpeg" alt="Los Cardones - Salta" />
                <div className="ticket-banda">
                  <img src={`/img/ticket/${t.icono}.svg`} alt="" />
                  <div>
                    <span className="ticket-banda-titulo">{t.titulo}</span>
                    <span className="ticket-banda-destino">Ticket para {t.destino.toLowerCase()}</span>
                  </div>
                </div>
              </header>

              <dl className="ticket-datos">
                <div>
                  <dt>Comanda N°</dt>
                  <dd className="ticket-numero">{seis(comanda.id_comanda)}</dd>
                </div>
                <div className="derecha">
                  <dt>Mesa</dt>
                  <dd className="ticket-mesa">{String(comanda.mesa_numero).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{fecha(comanda.fecha_hora)}</dd>
                </div>
                <div className="derecha">
                  <dt>Hora</dt>
                  <dd>{hora(comanda.fecha_hora)}</dd>
                </div>
                <div className="ticket-dato-ancho">
                  <dt>Mozo</dt>
                  <dd>{comanda.mozo || "Sin asignar"}</dd>
                </div>
              </dl>

              {anulada && <div className="ticket-anulada">Comanda anulada: no preparar</div>}
              {modificada && <div className="ticket-aviso">COMANDA MODIFICADA</div>}

              <table className="ticket-tabla">
                <thead>
                  <tr>
                    <th className="centrado">Cant.</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {t.productos.map((p, n) => (
                    <tr key={n}>
                      <td className="ticket-cantidad">{p.cantidad}</td>
                      <td>
                        {p.nombre}
                        {p.observacion && <span className="ticket-nota">→ {p.observacion}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {comanda.observaciones_comanda && (
                <div className="ticket-observaciones">
                  <h2>Observaciones</h2>
                  <p>{comanda.observaciones_comanda}</p>
                </div>
              )}

              <footer className="ticket-pie">
                {t.productos.length} producto{t.productos.length === 1 ? "" : "s"} · impreso el {diaHora(ahora)}
              </footer>
            </section>

            <button type="button" className="ticket-boton no-print" onClick={() => imprimir(t.clave)}>
              <Icono nombre="print" />
              Imprimir ticket de {t.destino.toLowerCase()}
            </button>
          </div>
        ))}
        {!tickets.length && <p className="tickets-vacio">Esta comanda no tiene productos para preparar.</p>}
      </main>

      <div className="tickets-acciones no-print">
        {tickets.length > 1 && (
          <button type="button" className="ticket-boton" onClick={() => window.print()}>
            <Icono nombre="print" />
            Imprimir los {tickets.length} tickets
          </button>
        )}
        <Link to={`/comandas/${id}`} className="ticket-volver">
          <Icono nombre="receipt_long" /> Volver al detalle
        </Link>
        <Link to="/comandas" className="ticket-volver" state={alGuardar ? { aviso, resaltar } : undefined}>
          <Icono nombre="list" /> {alGuardar ? "Ir al listado de comandas" : "Volver al listado"}
        </Link>
      </div>
    </div>
  );
}
