// Reportes consolidados (Parcial Nº 2, módulo M2): cada uno cruza datos de dos o más procesos.
// Se muestran como pestañas de "Reportes y Estadísticas", igual que en Django (reportes/consolidado.html).
// Los datos y el PDF los arma Django (reportes/consolidados.py).
import { useState } from "react";

import { Cargando } from "../../components/Cargando";
import { Icono } from "../../components/Icono";
import { PaginacionNumeros } from "../../components/Listado";
import { Notificar } from "../../components/Mensajes";
import { useCarga } from "../../hooks/useCarga";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";
import { fechaISO } from "../../utils/formato";

// Con responseType "blob" el error de Django también llega como archivo: se lee como JSON
async function errorDeDescarga(error) {
  const datos = error.response?.data;
  if (datos instanceof Blob) {
    try {
      error.response.data = JSON.parse(await datos.text());
    } catch {
      // No era JSON: queda el mensaje general
    }
  }
  return mensajeDeError(error);
}

// rango: { fecha_desde, fecha_hasta } compartido con las demás pestañas de Reportes
export function ReporteConsolidado({ clave, icono = "table_chart", rango, onRango }) {
  // Lo que se escribe en los filtros y lo que ya se aplicó con "Filtrar"
  const [borrador, setBorrador] = useState({ ...rango, extra: "", filas: 10 });
  const [extra, setExtra] = useState({});
  const aplicados = { ...rango, ...extra };
  const reporte = useCarga(`/reportes/consolidados/${clave}/`, aplicados);
  const r = reporte.datos?.clave === clave ? reporte.datos : null;
  const pagina = usePaginaLocal(r?.filas || [], `${clave}|${JSON.stringify(aplicados)}`);

  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);

  const filtrar = (evento) => {
    evento.preventDefault();
    if (borrador.fecha_desde && borrador.fecha_hasta && borrador.fecha_desde > borrador.fecha_hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    onRango({ fecha_desde: borrador.fecha_desde, fecha_hasta: borrador.fecha_hasta });
    setExtra(borrador.extra && r ? { [r.filtro_extra.nombre]: borrador.extra } : {});
    pagina.cambiarPorPagina(Number(borrador.filas));
  };

  // El PDF lo genera Django, con encabezado institucional y pie con filtros, usuario, fecha y hora
  const exportarPDF = async () => {
    setError("");
    setExportando(true);
    try {
      const { data } = await api.get(`/reportes/consolidados/${clave}/pdf/`, { params: aplicados, responseType: "blob", timeout: 60000 });
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(data);
      enlace.download = `Reporte_${clave}_${r.filtros.fecha_desde}_${r.filtros.fecha_hasta}.pdf`;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
    } catch (e) {
      setError(await errorDeDescarga(e));
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <Notificar texto={error || reporte.error} onListo={() => setError("")} />

      {/* Filtros: fechas, el filtro propio del reporte y cuántas filas mostrar */}
      <div className="filtros-reportes filtros-consolidado no-imprimir">
        <form className="filtros-reportes-fechas" onSubmit={filtrar}>
          <div className="grupo-filtro">
            <label htmlFor="c-desde">Desde</label>
            <input id="c-desde" type="date" max={fechaISO()} value={borrador.fecha_desde} onChange={(e) => setBorrador({ ...borrador, fecha_desde: e.target.value })} />
          </div>
          <div className="grupo-filtro">
            <label htmlFor="c-hasta">Hasta</label>
            <input id="c-hasta" type="date" max={fechaISO()} value={borrador.fecha_hasta} onChange={(e) => setBorrador({ ...borrador, fecha_hasta: e.target.value })} />
          </div>
          {r && (
            <div className="grupo-filtro">
              <label htmlFor="c-extra">{r.filtro_extra.etiqueta}</label>
              <select id="c-extra" value={borrador.extra} onChange={(e) => setBorrador({ ...borrador, extra: e.target.value })}>
                <option value="">Todos</option>
                {r.filtro_extra.opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grupo-filtro">
            <label htmlFor="c-filas">Filas</label>
            <select id="c-filas" value={borrador.filas} onChange={(e) => setBorrador({ ...borrador, filas: e.target.value })}>
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-marca">
            <Icono nombre="filter_alt" /> Filtrar
          </button>
        </form>
        <div className="acciones-descarga">
          <button type="button" className="btn btn-outline-secondary" title="Exportar a PDF con los filtros aplicados" disabled={!r || exportando} onClick={exportarPDF}>
            <Icono nombre="picture_as_pdf" /> {exportando ? "Generando..." : "Exportar PDF"}
          </button>
        </div>
      </div>

      {!r ? (
        reporte.cargando && <Cargando />
      ) : (
        // Mismo panel y tarjeta que las demás pestañas de Reportes (Top 5, Mozos...)
        <div className="area-reporte">
        <section className={`tarjeta-top ${reporte.cargando ? "opacity-50" : ""}`}>
          <div className="titulo-top">
            <Icono nombre={icono} className="icono-naranja" />
            <h3>{r.titulo}</h3>
          </div>
          <div className="consolidado-cabecera">
            <p>{r.descripcion}</p>
            <span className="chip-procesos" title="Procesos que cruza este reporte">
              <Icono nombre="join_inner" /> {r.procesos}
            </span>
          </div>

          <div className="tabla-consolidado-scroll">
            <table className="tabla-top tabla-consolidado">
              <thead>
                <tr>
                  {r.columnas.map((c) => (
                    <th key={c.nombre} className={c.numero ? "derecha" : ""}>
                      {c.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagina.filas.map((fila, n) => (
                  <tr key={`${pagina.pagina}-${n}`}>
                    {fila.map((celda, i) => (
                      <td key={r.columnas[i].nombre} className={r.columnas[i].numero ? "derecha" : ""}>
                        {celda}
                      </td>
                    ))}
                  </tr>
                ))}
                {!r.filas.length && (
                  <tr>
                    <td colSpan={r.columnas.length} className="sin-datos">
                      No hay datos para los filtros elegidos.
                    </td>
                  </tr>
                )}
              </tbody>
              {r.filas.length > 0 && (
                <tfoot>
                  <tr>
                    {r.totales.map((celda, i) => (
                      <td key={r.columnas[i].nombre} className={r.columnas[i].numero ? "derecha" : ""}>
                        {celda}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {r.nota && <p className="nota-reporte consolidado-nota">{r.nota}</p>}
          {pagina.total > pagina.porPagina && (
            <div className="consolidado-pie">
              <PaginacionNumeros pagina={pagina.pagina} porPagina={pagina.porPagina} total={pagina.total} nombre="filas" onPagina={pagina.irA} />
            </div>
          )}
        </section>
        </div>
      )}
    </>
  );
}
