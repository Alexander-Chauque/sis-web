// Ventas, igual a la de Django (VENTAS/listar_ventas.html): cada cobro de una comanda,
// cuánto, con qué método y en qué caja quedó, y el total por método de pago.
import { useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Encabezado, Vacio } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { CabeceraResultados, FiltroBuscar, FiltroFechas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { fechaISO } from "../../utils/formato";

const VACIO = { buscar: "", desde: "", hasta: "" };
// Como el "floatformat:2" de Django: $27000,00
const monto = (valor) => `$${Number(valor || 0).toFixed(2).replace(".", ",")}`;
const fechaHora = (valor) => {
  const f = new Date(valor);
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${f.getFullYear()} ${f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};

export default function Ventas() {
  const { puede } = useAuth();
  const [borrador, setBorrador] = useState(VACIO);
  const [filtros, setFiltros] = useState(VACIO);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const consulta = Object.fromEntries(
    Object.entries({ buscar: filtros.buscar, fecha_desde: filtros.desde, fecha_hasta: filtros.hasta, pagina, por_pagina: porPagina }).filter(([, v]) => v),
  );
  const cobros = useCarga("/ventas/cobros/", consulta);
  const datos = cobros.datos;
  const cajaAbierta = datos?.caja_abierta;

  const aplicar = (nuevos) => {
    setFiltros(nuevos);
    setPagina(1);
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Ventas" subtitulo="Cada cobro de una comanda: cuánto, con qué método y en qué caja quedó." icono="receipt_long">
        {cajaAbierta && puede("comandas:leer") && (
          <Link className="btn btn-marca" to="/comandas">
            <Icono nombre="receipt_long" /> Cobrar comandas
          </Link>
        )}
      </Encabezado>
      <Notificar texto={cobros.error} />

      {/* Estado de la caja */}
      {datos &&
        (cajaAbierta ? (
          <div className="aviso-caja">
            <Icono nombre="lock_open" />
            <span>
              <strong>Caja abierta</strong> Los cobros nuevos se registran en esta caja.
            </span>
            {puede("caja:leer") && <Link to={`/finanzas/cajas/${cajaAbierta}`}>Ver caja</Link>}
          </div>
        ) : (
          <div className="aviso-caja cerrada">
            <Icono nombre="lock" />
            <span>
              <strong>Sin caja abierta</strong> Para cobrar comandas, primero abrí una caja. Las ventas anteriores se pueden consultar igual.
            </span>
            {puede("caja:leer") && <Link to="/finanzas/cajas">Abrir caja</Link>}
          </div>
        ))}

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => aplicar(borrador)}
            onLimpiar={() => {
              setBorrador(VACIO);
              aplicar(VACIO);
            }}
          >
            <FiltroBuscar
              id="buscar-venta"
              etiqueta="Responsable, método de pago o n.º de comanda"
              valor={borrador.buscar}
              onCambiar={(v) => setBorrador({ ...borrador, buscar: v })}
              placeholder="Buscar venta..."
            />
            <FiltroFechas desde={borrador.desde} hasta={borrador.hasta} maximo={fechaISO()} onCambiar={({ desde, hasta }) => setBorrador({ ...borrador, desde, hasta })} />
          </PanelFiltros>
        }
      >
        <CabeceraResultados
          titulo="Ventas registradas"
          porPagina={porPagina}
          onPorPagina={(n) => {
            setPorPagina(n);
            setPagina(1);
          }}
        />
        {!datos ? (
          cobros.cargando && <Cargando />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Comanda</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">Responsable</th>
                    <th scope="col">Caja</th>
                    <th scope="col">Método de pago</th>
                    <th scope="col">Monto</th>
                  </tr>
                </thead>
                <tbody className={cobros.cargando ? "opacity-50" : ""}>
                  {datos.resultados.map((p) => (
                    <tr key={p.id_pago}>
                      <td>{puede("comandas:leer") ? <Link className="text-reset" to={`/comandas/${p.comanda}`}>#{p.comanda}</Link> : `#${p.comanda}`}</td>
                      <td>{fechaHora(p.fecha_hora)}</td>
                      <td>{p.responsable || "No disponible"}</td>
                      <td>{p.caja ? `#${p.caja}` : <span className="text-secondary">—</span>}</td>
                      <td>{p.metodo || "No disponible"}</td>
                      <td>
                        <strong>{monto(p.monto)}</strong>
                      </td>
                    </tr>
                  ))}
                  {!datos.resultados.length && <Vacio columnas={6}>No hay ventas registradas.</Vacio>}
                </tbody>
              </table>
            </div>

            {/* Resumen de ventas por método de pago */}
            <div className="tarjeta-detalle ventas-por-metodo">
              <div className="titulo-tarjeta">
                <Icono nombre="payments" className="icono-naranja" />
                <h3>Ventas por método de pago</h3>
              </div>
              <div className="cuerpo-tarjeta">
                {datos.por_metodo.length ? (
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Método de pago</th>
                        <th scope="col">Total recaudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.por_metodo.map((m) => (
                        <tr key={m.metodo}>
                          <td>{m.metodo}</td>
                          <td>{monto(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="alerta-info-simple">
                    <Icono nombre="info" /> No hay ventas registradas.
                  </p>
                )}
              </div>
            </div>

            <PaginacionNumeros pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} nombre="pagos" onPagina={setPagina} />
          </>
        )}
      </ListadoLayout>
    </div>
  );
}
