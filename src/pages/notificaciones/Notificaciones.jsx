// Bandeja de notificaciones (Parcial Nº 2, módulo M3).
// Las alertas las crean las reglas de Django (notificaciones/reglas.py) para el cargo de destino:
// venta inusual al cobrar, y comandas demoradas o cajas abiertas con el comando evaluar_alertas.
import { useState } from "react";

import { avisarCambioNotificaciones } from "../../components/Campana";
import { Cargando } from "../../components/Cargando";
import { Encabezado, Vacio } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroLista, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { Notificar } from "../../components/Mensajes";
import { useCarga } from "../../hooks/useCarga";
import { useNotificar } from "../../hooks/useNotificar";
import { api, mensajeDeError } from "../../services/api";
import { fechaHora } from "../../utils/formato";

// Ícono y color de cada tipo de alerta, como en la bandeja de Django
const TIPOS = {
  VENTA_INUSUAL: { icono: "trending_up", color: "text-bg-warning" },
  COMANDA_DEMORADA: { icono: "timer", color: "text-bg-danger" },
  CAJA_ABIERTA: { icono: "point_of_sale", color: "text-bg-info" },
};
const ESTADOS = [
  { valor: "sin_leer", texto: "Sin leer" },
  { valor: "leida", texto: "Leídas" },
];
const FILTROS_VACIOS = { buscar: "", tipo: "", estado: "" };

export default function Notificaciones() {
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState({ ...FILTROS_VACIOS, pagina: 1, por_pagina: 10 });
  const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
  const bandeja = useCarga("/notificaciones/", consulta);
  const notificar = useNotificar();
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const datos = bandeja.datos;

  const actualizar = (mensaje) => {
    notificar(mensaje, "success");
    bandeja.recargar();
    avisarCambioNotificaciones();
  };

  const marcarLeida = async (notificacion) => {
    setOcupado(true);
    try {
      await api.post(`/notificaciones/${notificacion.id}/leida/`);
      actualizar("Notificación marcada como leída.");
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const marcarTodas = async () => {
    setOcupado(true);
    try {
      const { data } = await api.post("/notificaciones/marcar-todas/");
      if (data.cantidad) actualizar(`${data.cantidad} notificaciones marcadas como leídas.`);
      else notificar("No hay notificaciones sin leer.", "info");
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Notificaciones" subtitulo="Alertas automáticas del sistema para tu perfil." icono="notifications">
        <button type="button" className="btn btn-marca" disabled={!datos?.sin_leer || ocupado} onClick={marcarTodas}>
          <Icono nombre="done_all" /> Marcar todas como leídas
        </button>
      </Encabezado>
      <Notificar texto={error || bandeja.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros((f) => ({ ...f, ...borrador, buscar: borrador.buscar.trim(), pagina: 1 }))}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              setFiltros((f) => ({ ...f, ...FILTROS_VACIOS, pagina: 1 }));
            }}
          >
            <FiltroBuscar
              id="buscar-notificacion"
              valor={borrador.buscar}
              onCambiar={(v) => setBorrador({ ...borrador, buscar: v })}
              placeholder="Texto del mensaje..."
            />
            <FiltroLista
              id="filtro-tipo"
              titulo="Tipo"
              todos="Todos los tipos"
              opciones={(datos?.tipos || []).map((t) => ({ valor: t.valor, texto: t.nombre }))}
              valor={borrador.tipo}
              onCambiar={(v) => setBorrador({ ...borrador, tipo: v })}
            />
            <FiltroLista
              id="filtro-estado"
              titulo="Estado"
              todos="Todos los estados"
              opciones={ESTADOS}
              valor={borrador.estado}
              onCambiar={(v) => setBorrador({ ...borrador, estado: v })}
            />
          </PanelFiltros>
        }
      >
        <CabeceraResultados
          titulo={datos ? `Bandeja (${datos.sin_leer} sin leer)` : "Bandeja"}
          porPagina={filtros.por_pagina}
          onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, pagina: 1 }))}
        />
        {!datos ? (
          bandeja.cargando && <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Mensaje</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className={bandeja.cargando ? "opacity-50" : ""}>
                {datos.resultados.map((n, i) => {
                  const tipo = TIPOS[n.tipo] || { icono: "notifications", color: "text-bg-secondary" };
                  return (
                    <tr key={n.id} className={n.leida ? "" : "fila-nueva"}>
                      <td className="fw-semibold">{(datos.pagina - 1) * datos.por_pagina + i + 1}</td>
                      <td className="text-nowrap">{fechaHora(n.fecha)}</td>
                      <td>
                        <span className={`badge badge-alerta ${tipo.color}`}>
                          <Icono nombre={tipo.icono} /> {n.tipo_nombre}
                        </span>
                      </td>
                      <td>{n.mensaje}</td>
                      <td className="text-nowrap">
                        {n.leida ? (
                          <span className="text-secondary" title={n.fecha_lectura ? `Leída el ${fechaHora(n.fecha_lectura)}` : undefined}>
                            Leída
                          </span>
                        ) : (
                          <span className="badge text-bg-warning">Sin leer</span>
                        )}
                      </td>
                      <td>
                        <div className="acciones-tabla">
                          {!n.leida && <BotonAccion tipo="ver" icono="done" titulo="Marcar como leída" disabled={ocupado} onClick={() => marcarLeida(n)} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!datos.resultados.length && <Vacio columnas={6}>No hay notificaciones con estos filtros.</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        {datos && (
          <PaginacionNumeros pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} nombre="notificaciones" onPagina={(p) => setFiltros((f) => ({ ...f, pagina: p }))} />
        )}
      </ListadoLayout>
    </div>
  );
}
