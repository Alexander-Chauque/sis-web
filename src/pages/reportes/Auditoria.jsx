// Log de auditoría.
import { useState } from "react";

import { Cargando } from "../../components/Cargando";
import { Encabezado, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { CabeceraDetalle, Subtarjeta, Subtarjetas } from "../../components/Detalle";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroFechas, FiltroLista, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import { descargarCSV, fechaHora, fechaISO } from "../../utils/formato";

const COLORES = { CREAR: "text-bg-success", MODIFICAR: "text-bg-warning", ANULAR: "text-bg-danger", ELIMINAR: "text-bg-danger" };
const FILTROS_VACIOS = { tabla: "", accion: "", usuario: "", detalle: "", fecha_desde: "", fecha_hasta: "" };

export default function Auditoria() {
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState({ ...FILTROS_VACIOS, pagina: 1, por_pagina: 10 });
  const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
  const logs = useCarga("/auditoria/", consulta);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);

  const datos = logs.datos;

  // Pide todas las filas con los filtros actuales, no solo la página visible
  const exportar = async () => {
    setError("");
    setExportando(true);
    try {
      const { pagina: _pagina, por_pagina: _porPagina, ...resto } = consulta;
      const { data } = await api.get("/auditoria/", { params: { ...resto, exportar: 1 }, timeout: 60000 });
      descargarCSV(
        `log_auditoria_${fechaISO()}.csv`,
        ["Fecha y hora", "Usuario", "Tabla", "Acción", "ID registro", "Valores anteriores", "Valores actuales"],
        data.resultados.map((l) => [fechaHora(l.fecha_hora), l.usuario, l.tabla, l.accion, l.registro_id, l.valores_anteriores, l.valores_actuales]),
      );
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Log de Auditoría" subtitulo="Historial de todos los cambios realizados en el sistema." icono="history">
        <button type="button" className="btn btn-marca" disabled={!datos || exportando} onClick={exportar}>
          <Icono nombre="download" /> {exportando ? "Exportando..." : "Exportar Excel"}
        </button>
      </Encabezado>
      <Notificar texto={error || logs.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros((f) => ({ ...f, ...borrador, detalle: borrador.detalle.trim(), pagina: 1 }))}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              setFiltros((f) => ({ ...f, ...FILTROS_VACIOS, pagina: 1 }));
            }}
          >
            <FiltroBuscar
              id="buscar-detalle"
              etiqueta="Buscar en detalle"
              valor={borrador.detalle}
              onCambiar={(v) => setBorrador({ ...borrador, detalle: v })}
              placeholder="Ej: motivo, nombre..."
            />
            <FiltroLista
              id="filtro-tabla"
              titulo="Tabla"
              todos="Todas las tablas"
              opciones={(datos?.tablas || []).map((t) => ({ valor: t, texto: t }))}
              valor={borrador.tabla}
              onCambiar={(v) => setBorrador({ ...borrador, tabla: v })}
            />
            <FiltroLista
              id="filtro-accion"
              titulo="Acción"
              todos="Todas las acciones"
              opciones={(datos?.acciones || []).map((a) => ({ valor: a.valor, texto: a.nombre }))}
              valor={borrador.accion}
              onCambiar={(v) => setBorrador({ ...borrador, accion: v })}
            />
            <FiltroLista
              id="filtro-usuario"
              titulo="Usuario"
              todos="Todos los usuarios"
              opciones={(datos?.empleados || []).map((e) => ({ valor: String(e.id), texto: e.nombre }))}
              valor={borrador.usuario}
              onCambiar={(v) => setBorrador({ ...borrador, usuario: v })}
            />
            <FiltroFechas
              desde={borrador.fecha_desde}
              hasta={borrador.fecha_hasta}
              maximo={fechaISO()}
              onCambiar={({ desde, hasta }) => setBorrador({ ...borrador, fecha_desde: desde, fecha_hasta: hasta })}
            />
          </PanelFiltros>
        }
      >
        <CabeceraResultados titulo="Últimos movimientos" porPagina={filtros.por_pagina} onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, pagina: 1 }))} />
        {!datos ? (
          logs.cargando && <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Tabla</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Registro</th>
                  <th scope="col">Detalle</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className={logs.cargando ? "opacity-50" : ""}>
                {datos.resultados.map((l, n) => (
                  <tr key={l.id_log}>
                    <td className="fw-semibold">{(datos.pagina - 1) * datos.por_pagina + n + 1}</td>
                    <td className="text-nowrap">{fechaHora(l.fecha_hora)}</td>
                    <td>{l.usuario}</td>
                    <td>{l.tabla}</td>
                    <td>
                      <span className={`badge ${COLORES[l.accion] || "text-bg-secondary"}`}>{l.accion}</span>
                    </td>
                    <td>#{l.registro_id}</td>
                    <td className="detalle-corto text-secondary" title={l.valores_actuales}>
                      {l.valores_actuales || l.valores_anteriores || "—"}
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="ver" titulo={`Ver el detalle del registro ${l.id_log}`} onClick={() => setDetalle(l)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {!datos.resultados.length && <Vacio columnas={8}>No hay registros con estos filtros.</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        {datos && (
          <PaginacionNumeros pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} nombre="registros" onPagina={(p) => setFiltros((f) => ({ ...f, pagina: p }))} />
        )}
      </ListadoLayout>

      {detalle && (
        <Modal titulo="Detalle del registro" icono="history" onCerrar={() => setDetalle(null)} grande>
          <CabeceraDetalle etiqueta={`Registro de auditoría N.º ${detalle.id_log}`} titulo={`${detalle.tabla} #${detalle.registro_id}`}>
            <span className={`badge ${COLORES[detalle.accion] || "text-bg-secondary"}`}>{detalle.accion}</span>
          </CabeceraDetalle>
          <Subtarjetas>
            <Subtarjeta icono="schedule" etiqueta="Fecha y hora">
              {fechaHora(detalle.fecha_hora)}
            </Subtarjeta>
            <Subtarjeta icono="person" etiqueta="Usuario">
              {detalle.usuario}
            </Subtarjeta>
            <Subtarjeta icono="history" etiqueta="Valores anteriores" ancha>
              {detalle.valores_anteriores || "—"}
            </Subtarjeta>
            <Subtarjeta icono="edit_note" etiqueta="Valores actuales" ancha>
              {detalle.valores_actuales || "—"}
            </Subtarjeta>
          </Subtarjetas>
        </Modal>
      )}
    </div>
  );
}
