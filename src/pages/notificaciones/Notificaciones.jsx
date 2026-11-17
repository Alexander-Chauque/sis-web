// Bandeja de notificaciones (Parcial Nº 2, módulo M3).
// Las alertas las crean las reglas de Django (notificaciones/reglas.py) para el cargo de destino:
// venta inusual al cobrar, y comandas demoradas o cajas abiertas con el comando evaluar_alertas.
import { useState } from "react";

import { avisarCambioNotificaciones } from "../../components/Campana";
import { Cargando } from "../../components/Cargando";
import { Encabezado, Vacio } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { CabeceraResultados, FiltroBuscar, FiltroCasillas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useNotificar } from "../../hooks/useNotificar";
import { api, mensajeDeError } from "../../services/api";

// Fecha como en la bandeja de Django: 16/11/2026 20:35
const fechaCorta = (valor) => {
  const f = new Date(valor);
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${f.getFullYear()} ${f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};

// Ícono y color de cada tipo de alerta, como en la bandeja de Django
const TIPOS = {
  VENTA_INUSUAL: { icono: "trending_up", color: "badge-entregado" },
  COMANDA_DEMORADA: { icono: "timer", color: "badge-preparacion" },
  CAJA_ABIERTA: { icono: "point_of_sale", color: "badge-anulado" },
};
const ESTADOS = [
  { valor: "sin_leer", texto: "Sin leer" },
  { valor: "leida", texto: "Leídas" },
];
// Tipo y estado con casillas, como en Django: sin ninguna marcada se muestran todas
const FILTROS_VACIOS = { buscar: "", tipos: [], estados: [] };

// Nivel del cargo Administrador (empleados/decorators.py de Django)
const NIVEL_ADMINISTRADOR = 5;

export default function Notificaciones() {
  const { usuario } = useAuth();
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState({ ...FILTROS_VACIOS, pagina: 1, por_pagina: 10 });
  const consulta = Object.fromEntries(
    Object.entries({
      buscar: filtros.buscar,
      tipo: filtros.tipos.join(","),
      // "Sin leer" y "Leídas" a la vez equivalen a no filtrar por estado
      estado: filtros.estados.length === 1 ? filtros.estados[0] : "",
      pagina: filtros.pagina,
      por_pagina: filtros.por_pagina,
    }).filter(([, v]) => v),
  );
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

  // Revisa ahora las reglas de comandas demoradas y cajas abiertas (lo mismo que evaluar_alertas.bat).
  // Las alertas nuevas quedan en la bandeja y Django las manda también por correo.
  const revisarAhora = async () => {
    setOcupado(true);
    try {
      const { data } = await api.post("/notificaciones/evaluar/");
      const nuevas = data.comandas_demoradas + data.cajas_abiertas;
      if (nuevas) {
        actualizar(`${nuevas} alerta${nuevas === 1 ? "" : "s"} nueva${nuevas === 1 ? "" : "s"}: quedaron en la bandeja y se enviaron por correo.`);
      } else {
        notificar("No hay alertas nuevas: no hay comandas demoradas ni cajas abiertas de más.", "info");
      }
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
        {usuario?.nivel >= NIVEL_ADMINISTRADOR && (
          <button type="button" className="btn btn-outline-secondary" disabled={ocupado} onClick={revisarAhora}>
            <Icono nombre="notification_add" /> Revisar alertas ahora
          </button>
        )}
        <button type="button" className="btn btn-marca" disabled={ocupado} onClick={marcarTodas}>
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
            <FiltroCasillas
              titulo="Tipo"
              opciones={(datos?.tipos || []).map((t) => ({ valor: t.valor, texto: t.nombre }))}
              elegidos={borrador.tipos}
              onCambiar={(v) => setBorrador({ ...borrador, tipos: v })}
            />
            <FiltroCasillas titulo="Estado" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
          </PanelFiltros>
        }
      >
        <CabeceraResultados
          titulo="Resultados"
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
                  <th scope="col">Fecha</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Mensaje</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className={bandeja.cargando ? "opacity-50" : ""}>
                {datos.resultados.map((n) => {
                  const tipo = TIPOS[n.tipo] || { icono: "notifications", color: "text-bg-secondary" };
                  return (
                    <tr key={n.id} className={n.leida ? "" : "fila-nueva"}>
                      <td className="text-nowrap">{fechaCorta(n.fecha)}</td>
                      <td>
                        <span className={`badge badge-alerta ${tipo.color}`}>
                          <Icono nombre={tipo.icono} /> {n.tipo_nombre}
                        </span>
                      </td>
                      <td>{n.mensaje}</td>
                      <td className="text-nowrap">
                        {n.leida ? <span className="badge badge-activo">Leída</span> : <span className="badge badge-pendiente">Nueva</span>}
                      </td>
                      <td>
                        <div className="acciones-tabla">
                          {!n.leida ? (
                            <button type="button" className="btn-icon btn-reactivar" title="Marcar como leída" aria-label="Marcar como leída" disabled={ocupado} onClick={() => marcarLeida(n)}>
                              <Icono nombre="check" />
                            </button>
                          ) : (
                            <span className="btn-icon btn-leida" title={n.fecha_lectura ? `Leída el ${fechaCorta(n.fecha_lectura)}` : "Leída"}>
                              <Icono nombre="done_all" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!datos.resultados.length && <Vacio columnas={5}>No hay notificaciones para mostrar</Vacio>}
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
