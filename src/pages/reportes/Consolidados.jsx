// Reportes consolidados (Parcial Nº 2, módulo M2): cada uno cruza datos de dos o más procesos.
// Los datos y el PDF los arma Django (reportes/consolidados.py), los mismos que en la web de Django.
import { useState } from "react";

import { Cargando } from "../../components/Cargando";
import { Encabezado } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { PaginacionNumeros } from "../../components/Listado";
import { Notificar } from "../../components/Mensajes";
import { useCarga } from "../../hooks/useCarga";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";
import { fechaISO, OPCIONES_POR_PAGINA, primeroDelMes } from "../../utils/formato";

const RANGO_INICIAL = { fecha_desde: primeroDelMes(), fecha_hasta: fechaISO() };

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

export default function Consolidados() {
  // Solo llegan los reportes que el perfil puede ver (Rentabilidad es solo del Administrador)
  const disponibles = useCarga("/reportes/consolidados/");
  const lista = disponibles.datos || [];
  const [elegido, setElegido] = useState("");
  const clave = lista.some((r) => r.clave === elegido) ? elegido : lista[0]?.clave || "";

  // Lo que se escribe en los filtros y lo que ya se aplicó con "Filtrar"
  const [borrador, setBorrador] = useState({ ...RANGO_INICIAL, extra: "" });
  const [aplicados, setAplicados] = useState(RANGO_INICIAL);
  const reporte = useCarga(clave ? `/reportes/consolidados/${clave}/` : null, aplicados);
  // Al cambiar de pestaña, los datos del reporte anterior no se muestran mientras carga el nuevo
  const r = reporte.datos?.clave === clave ? reporte.datos : null;
  const pagina = usePaginaLocal(r?.filas || [], `${clave}|${JSON.stringify(aplicados)}`);

  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);

  const cambiarReporte = (nueva) => {
    setElegido(nueva);
    // El filtro propio (categoría, estado o empleado) es distinto en cada reporte: se limpia
    setBorrador((b) => ({ ...b, extra: "" }));
    setAplicados((a) => ({ fecha_desde: a.fecha_desde, fecha_hasta: a.fecha_hasta }));
  };

  const filtrar = (evento) => {
    evento.preventDefault();
    if (borrador.fecha_desde && borrador.fecha_hasta && borrador.fecha_desde > borrador.fecha_hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    const extra = borrador.extra && r ? { [r.filtro_extra.nombre]: borrador.extra } : {};
    setAplicados({ fecha_desde: borrador.fecha_desde, fecha_hasta: borrador.fecha_hasta, ...extra });
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
    <div className="contenedor-reportes">
      <Encabezado titulo="Reportes Consolidados" subtitulo="Cruzan la información de varios procesos del restaurante." icono="table_chart" />
      <Notificar texto={error || disponibles.error || reporte.error} onListo={() => setError("")} />

      {!disponibles.datos ? (
        disponibles.cargando && <Cargando />
      ) : !lista.length ? (
        <div className="alert alert-warning" role="alert">
          Tu perfil no tiene reportes consolidados disponibles.
        </div>
      ) : (
        <>
          <div className="tabs-reportes no-imprimir" role="tablist" aria-label="Reportes consolidados">
            {lista.map((p) => (
              <button
                key={p.clave}
                type="button"
                role="tab"
                aria-selected={clave === p.clave}
                className={`tab-reporte ${clave === p.clave ? "activo" : ""}`}
                onClick={() => cambiarReporte(p.clave)}
              >
                <Icono nombre={p.icono} /> {p.nombre}
                {p.restringido && <Icono nombre="lock" className="icono-restringido" />}
              </button>
            ))}
          </div>

          <div className="filtros-reportes no-imprimir">
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
              <button type="submit" className="btn btn-marca">
                <Icono nombre="filter_alt" /> Filtrar
              </button>
            </form>
            <div className="acciones-descarga">
              <button type="button" className="btn btn-outline-secondary" title="Exportar a PDF" disabled={!r || exportando} onClick={exportarPDF}>
                <Icono nombre="picture_as_pdf" /> {exportando ? "Generando..." : "PDF"}
              </button>
            </div>
          </div>

          {!r ? (
            reporte.cargando && <Cargando />
          ) : (
            <section className={`tarjeta-top ${reporte.cargando ? "opacity-50" : ""}`}>
              <div className="titulo-top">
                <Icono nombre={lista.find((p) => p.clave === clave)?.icono || "table_chart"} className="icono-naranja" />
                <h3>{r.titulo}</h3>
              </div>
              <div className="consolidado-info">
                <p>{r.descripcion}</p>
                <p>
                  <strong>Cruza:</strong> {r.procesos} · <strong>Filtros:</strong> {r.filtros_texto}
                </p>
              </div>
              <div className="table-responsive">
                <table className="tabla-top tabla-consolidado">
                  <thead>
                    <tr>
                      {r.columnas.map((c) => (
                        <th key={c.nombre} scope="col" className={c.numero ? "derecha" : ""}>
                          {c.nombre}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagina.filas.map((fila, n) => (
                      <tr key={`${pagina.pagina}-${n}`}>
                        {fila.map((celda, i) => (
                          <td key={r.columnas[i].nombre} className={r.columnas[i].numero ? "derecha text-nowrap" : ""}>
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
                      <tr className="fila-totales">
                        {r.totales.map((celda, i) => (
                          <td key={r.columnas[i].nombre} className={r.columnas[i].numero ? "derecha text-nowrap" : ""}>
                            {celda}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <div className="consolidado-pie no-imprimir">
                <label className="mostrar-registros">
                  Mostrar
                  <select value={pagina.porPagina} onChange={(e) => pagina.cambiarPorPagina(Number(e.target.value))}>
                    {OPCIONES_POR_PAGINA.map((n) => (
                      <option key={n} value={n}>
                        {n} registros
                      </option>
                    ))}
                  </select>
                </label>
                <PaginacionNumeros pagina={pagina.pagina} porPagina={pagina.porPagina} total={pagina.total} nombre="filas" onPagina={pagina.irA} />
              </div>
              {r.nota && <p className="consolidado-nota">{r.nota}</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
