// Reportes y Estadísticas, con el diseño de Django: pestañas, filtro por fechas,
// botones Imagen / PDF y los mismos gráficos (Chart.js).
import Chart from "chart.js/auto";
import html2canvas from "html2canvas";
import { useEffect, useRef, useState } from "react";

import { Cargando } from "../../components/Cargando";
import { Encabezado } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { Notificar } from "../../components/Mensajes";
import { useCarga } from "../../hooks/useCarga";
import { dinero, fecha, fechaISO, primeroDelMes } from "../../utils/formato";

const PESTANIAS = [
  { clave: "ventas", nombre: "Ventas", icono: "trending_up" },
  { clave: "top", nombre: "Top 5", icono: "star" },
  { clave: "categorias", nombre: "Categorías", icono: "category" },
  { clave: "mozos", nombre: "Mozos", icono: "groups" },
  { clave: "metodos", nombre: "Pagos", icono: "payments" },
];

// Fecha del gráfico de ventas sin el año: "2026-11-07" -> "07/11"
const diaYMes = (texto) => {
  const [, mes, dia] = String(texto).slice(0, 10).split("-");
  return `${dia}/${mes}`;
};

// Montos como en Django: "$235000", sin decimales
const pesos = (valor) => `$${Math.round(Number(valor) || 0)}`;

// Gráfico de Chart.js. Toma los colores del tema (claro u oscuro) al dibujarse.
function Grafico({ tipo, etiquetas, valores, alto = 350, opciones = {}, serie }) {
  const lienzo = useRef(null);
  useEffect(() => {
    const oscuro = document.documentElement.getAttribute("data-tema") === "oscuro";
    Chart.defaults.color = oscuro ? "#D4D4D4" : "#4A5568";
    Chart.defaults.borderColor = oscuro ? "#404040" : "#E5E7EB";
    const datasets = {
      line: { label: "Ventas ($)", data: valores, borderColor: "#F5A623", backgroundColor: "rgba(245, 166, 35, 0.1)", fill: true, tension: 0.4 },
      bar: { label: serie || "Total vendido ($)", data: valores, backgroundColor: "rgba(245, 166, 35, 0.8)", borderColor: "#F5A623", borderWidth: 1, borderRadius: 6, barPercentage: 0.6 },
      doughnut: { data: valores, backgroundColor: ["#F5A623", "#3B82F6", "#10B981", "#6366F1", "#9CA3AF"] },
    };
    const grafico = new Chart(lienzo.current, {
      type: tipo,
      data: { labels: etiquetas, datasets: [datasets[tipo]] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: tipo === "doughnut" } },
        ...opciones,
      },
    });
    return () => grafico.destroy();
  }, [tipo, etiquetas, valores, opciones, serie]);

  return (
    <div className="cuerpo-grafico" style={{ height: alto }}>
      <canvas ref={lienzo} role="img" aria-label="Gráfico del reporte" />
    </div>
  );
}

function TarjetaGrafico({ icono, titulo, children, className = "" }) {
  return (
    <section className={`tarjeta-grafico ${className}`}>
      <div className="titulo-grafico">
        <Icono nombre={icono} className="icono-naranja" />
        <h3>{titulo}</h3>
      </div>
      {children}
    </section>
  );
}

function TablaTop({ icono, titulo, columnas, filas, vacio = "Sin ventas", className = "", children }) {
  return (
    <section className={`tarjeta-top ${className}`}>
      <div className="titulo-top">
        <Icono nombre={icono} className="icono-naranja" />
        <h3>{titulo}</h3>
      </div>
      {children}
      <div className="table-responsive">
        <table className="tabla-top">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.texto} className={c.derecha ? "derecha" : ""}>
                  {c.texto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length ? (
              filas.map((fila, n) => (
                <tr key={n}>
                  {fila.map((celda, i) => (
                    <td key={i} className={`${columnas[i].derecha ? "derecha" : ""} ${columnas[i].numero ? "numero-top" : ""}`}>
                      {columnas[i].fuerte ? <strong>{celda}</strong> : celda}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnas.length} className="sin-datos">
                  {vacio}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Formato de los ejes y del globo del gráfico de mozos: "$350.000"
const OPCIONES_PESOS = {
  scales: { y: { beginAtZero: true, ticks: { callback: (v) => `$${Number(v).toLocaleString("es-AR")}` } } },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` $${c.parsed.y.toLocaleString("es-AR")}` } } },
};

// Barras horizontales para el Top 5: el nombre del producto se lee mejor a la izquierda
const OPCIONES_TOP = {
  indexAxis: "y",
  scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  plugins: { legend: { display: false } },
};

export default function Reportes() {
  const [borrador, setBorrador] = useState({ fecha_desde: primeroDelMes(), fecha_hasta: fechaISO() });
  const [rango, setRango] = useState(borrador);
  const [pestania, setPestania] = useState("ventas");
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");
  const reporte = useCarga("/reportes/", rango);
  const area = useRef(null);
  const r = reporte.datos;

  // Igual que el botón "Imagen" de Django: una foto del área del reporte (html2canvas)
  const descargarImagen = async () => {
    setExportando(true);
    try {
      const oscuro = document.documentElement.getAttribute("data-tema") === "oscuro";
      const lienzo = await html2canvas(area.current, { scale: 2, useCORS: true, backgroundColor: oscuro ? "#2a2a2a" : "#ffffff" });
      const enlace = document.createElement("a");
      enlace.download = `Reporte_${pestania}_${rango.fecha_desde}_${rango.fecha_hasta}.png`;
      enlace.href = lienzo.toDataURL("image/png");
      enlace.click();
    } catch {
      setError("No se pudo generar la imagen del reporte.");
    } finally {
      setExportando(false);
    }
  };

  const filtrar = (evento) => {
    evento.preventDefault();
    if (borrador.fecha_desde && borrador.fecha_hasta && borrador.fecha_desde > borrador.fecha_hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    setRango({ ...borrador });
  };

  return (
    <div className="contenedor-reportes">
      <Encabezado titulo="Reportes y Estadísticas" subtitulo="Analizá el rendimiento de tu restaurante." icono="bar_chart" />
      <Notificar texto={error || reporte.error} onListo={() => setError("")} />

      <div className="tabs-reportes no-imprimir" role="tablist" aria-label="Reportes">
        {PESTANIAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={pestania === p.clave}
            className={`tab-reporte ${pestania === p.clave ? "activo" : ""}`}
            onClick={() => setPestania(p.clave)}
          >
            <Icono nombre={p.icono} /> {p.nombre}
          </button>
        ))}
      </div>

      <div className="filtros-reportes no-imprimir">
        <form className="filtros-reportes-fechas" onSubmit={filtrar}>
          <div className="grupo-filtro">
            <label htmlFor="r-desde">Desde</label>
            <input id="r-desde" type="date" max={fechaISO()} value={borrador.fecha_desde} onChange={(e) => setBorrador({ ...borrador, fecha_desde: e.target.value })} />
          </div>
          <div className="grupo-filtro">
            <label htmlFor="r-hasta">Hasta</label>
            <input id="r-hasta" type="date" max={fechaISO()} value={borrador.fecha_hasta} onChange={(e) => setBorrador({ ...borrador, fecha_hasta: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-marca">
            <Icono nombre="filter_alt" /> Filtrar
          </button>
        </form>
        <div className="acciones-descarga">
          <button type="button" className="btn btn-outline-secondary" title="Descargar como imagen" disabled={!r || exportando} onClick={descargarImagen}>
            <Icono nombre="image" /> {exportando ? "Generando..." : "Imagen"}
          </button>
          <button type="button" className="btn btn-outline-secondary" title="Guardar como PDF" disabled={!r} onClick={() => window.print()}>
            <Icono nombre="picture_as_pdf" /> PDF
          </button>
        </div>
      </div>

      <div className="area-reporte" ref={area}>
        {!r ? (
          reporte.cargando && <Cargando />
        ) : (
          <div className={reporte.cargando ? "opacity-50" : ""}>
            {/* Encabezado que solo se ve al imprimir */}
            <p className="solo-impresion titulo-impresion">
              Los Cardones · Reporte de {PESTANIAS.find((p) => p.clave === pestania).nombre} · {fecha(r.fecha_desde)} al {fecha(r.fecha_hasta)}
            </p>

            {pestania === "ventas" && (
              <>
                <div className="grid-resumen-reportes">
                  <div className="tarjeta-reporte">
                    <div className="icono-reporte bg-verde">
                      <Icono nombre="payments" />
                    </div>
                    <div className="info-reporte">
                      <span>Ventas Totales</span>
                      <strong>{pesos(r.ventas_totales)}</strong>
                    </div>
                  </div>
                  <div className="tarjeta-reporte">
                    <div className="icono-reporte bg-azul">
                      <Icono nombre="receipt_long" />
                    </div>
                    <div className="info-reporte">
                      <span>Comandas</span>
                      <strong>{r.cantidad_comandas}</strong>
                    </div>
                  </div>
                  <div className="tarjeta-reporte">
                    <div className="icono-reporte bg-naranja">
                      <Icono nombre="point_of_sale" />
                    </div>
                    <div className="info-reporte">
                      <span>Ticket Promedio</span>
                      <strong>{pesos(r.ticket_promedio)}</strong>
                    </div>
                  </div>
                </div>
                <TarjetaGrafico icono="trending_up" titulo={`Evolución de Ventas (Período ${r.fecha_desde} al ${r.fecha_hasta})`}>
                  <Grafico tipo="line" etiquetas={r.por_dia.map((d) => diaYMes(d.fecha))} valores={r.por_dia.map((d) => Number(d.total))} />
                </TarjetaGrafico>
              </>
            )}

            {pestania === "top" && (
              <div className="grid-top-productos">
                <TablaTop
                  icono="restaurant"
                  titulo="Top 5 Platos"
                  columnas={[{ texto: "#", numero: true }, { texto: "Plato" }, { texto: "Vendidos", derecha: true, fuerte: true }]}
                  filas={r.top_platos.map((p, n) => [n + 1, p.nombre, p.cantidad])}
                >
                  {!!r.top_platos.length && (
                    <Grafico
                      tipo="bar"
                      alto={260}
                      serie="Vendidos"
                      etiquetas={r.top_platos.map((p) => p.nombre)}
                      valores={r.top_platos.map((p) => p.cantidad)}
                      opciones={OPCIONES_TOP}
                    />
                  )}
                </TablaTop>
                <TablaTop
                  icono="local_drink"
                  titulo="Top 5 Bebidas"
                  columnas={[{ texto: "#", numero: true }, { texto: "Bebida" }, { texto: "Vendidos", derecha: true, fuerte: true }]}
                  filas={r.top_bebidas.map((b, n) => [n + 1, b.nombre, b.cantidad])}
                >
                  {!!r.top_bebidas.length && (
                    <Grafico
                      tipo="bar"
                      alto={260}
                      serie="Vendidas"
                      etiquetas={r.top_bebidas.map((b) => b.nombre)}
                      valores={r.top_bebidas.map((b) => b.cantidad)}
                      opciones={OPCIONES_TOP}
                    />
                  )}
                </TablaTop>
              </div>
            )}

            {pestania === "categorias" && (
              <TablaTop
                icono="category"
                titulo="Ingresos por Categoría"
                columnas={[{ texto: "Categoría" }, { texto: "Ingresos ($)", derecha: true, fuerte: true }]}
                filas={r.categorias.map((c) => [c.nombre, pesos(c.ingresos)])}
                vacio="Sin datos"
              />
            )}

            {pestania === "mozos" && (
              <>
                <TarjetaGrafico icono="bar_chart" titulo="Ventas Totales por Mozo ($)">
                  {r.mozos.length ? (
                    <Grafico tipo="bar" etiquetas={r.mozos.map((m) => m.nombre)} valores={r.mozos.map((m) => Number(m.total))} opciones={OPCIONES_PESOS} />
                  ) : (
                    <p className="sin-datos">No hay ventas registradas en este período.</p>
                  )}
                </TarjetaGrafico>
                <TablaTop
                  icono="groups"
                  titulo="Detalle de Rendimiento"
                  columnas={[
                    { texto: "#", numero: true },
                    { texto: "Empleado" },
                    { texto: "Comandas atendidas", derecha: true },
                    { texto: "Total vendido", derecha: true, fuerte: true },
                  ]}
                  filas={r.mozos.map((m, n) => [n + 1, m.nombre, m.cantidad, pesos(m.total)])}
                  vacio="No hay ventas registradas en este período."
                />
              </>
            )}

            {pestania === "metodos" && (
              <TarjetaGrafico icono="payments" titulo="Métodos de Pago" className="grafico-angosto">
                {r.metodos.length ? (
                  <Grafico tipo="doughnut" alto={300} etiquetas={r.metodos.map((m) => m.nombre)} valores={r.metodos.map((m) => Number(m.total))} />
                ) : (
                  <p className="sin-datos">No hay pagos registrados en este período.</p>
                )}
                {!!r.metodos.length && (
                  <ul className="leyenda-metodos">
                    {r.metodos.map((m) => (
                      <li key={m.nombre}>
                        <span>{m.nombre}</span>
                        <strong>{dinero(m.total)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </TarjetaGrafico>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
