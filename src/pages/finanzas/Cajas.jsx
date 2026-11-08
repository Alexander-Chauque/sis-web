// Listado de cajas, con el diseño de Django: filtros a la izquierda y tabla a la derecha.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, FiltroFechas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import { dinero, fechaHora, fechaISO, montoValido, textoMonto } from "../../utils/formato";

export function EstadoCaja({ estado }) {
  return <span className={`badge ${estado === "abierto" ? "text-bg-success" : "text-bg-secondary"}`}>{estado === "abierto" ? "Abierta" : "Cerrada"}</span>;
}

function AbrirCaja({ onCerrar, onAbierta }) {
  const [saldo, setSaldo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const abrir = async () => {
    setError("");
    if (!montoValido(saldo, { permitirCero: true })) return setError("El saldo inicial debe ser un número válido y no negativo.");
    setEnviando(true);
    try {
      const { data } = await api.post("/cajas/", { saldo_inicial: textoMonto(saldo), observaciones_apertura: observaciones.trim() });
      onAbierta(data);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Abrir caja" onCerrar={onCerrar} onEnviar={abrir} enviando={enviando} textoEnviar="Abrir caja">
      <Alerta>{error}</Alerta>
      <Campo id="saldo-inicial" etiqueta="Saldo inicial *" prefijo="$" ayuda="El efectivo con el que empieza la caja.">
        <input id="saldo-inicial" className="form-control" inputMode="decimal" required value={saldo} onChange={(e) => setSaldo(e.target.value)} />
      </Campo>
      <Campo id="obs-apertura" etiqueta="Observaciones (opcional)" className="mb-0">
        <textarea id="obs-apertura" className="form-control" rows={3} maxLength={1000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </Campo>
    </Modal>
  );
}

const ESTADOS = [
  { valor: "abierto", texto: "Abierto" },
  { valor: "cerrado", texto: "Cerrado" },
];
const FILTROS_VACIOS = { buscar: "", estados: [], fecha_desde: "", fecha_hasta: "" };

export default function Cajas() {
  const { puede } = useAuth();
  const navegar = useNavigate();
  // Lo que se marca en el panel y lo que ya se aplicó con "Aplicar filtros"
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [filtros, setFiltros] = useState({ buscar: "", estado: "", fecha_desde: "", fecha_hasta: "", pagina: 1, por_pagina: 10 });
  const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
  const cajas = useCarga("/cajas/", consulta);
  const [abriendo, setAbriendo] = useState(false);

  const datos = cajas.datos;

  const aplicar = (valores) =>
    setFiltros((f) => ({
      ...f,
      buscar: valores.buscar.trim(),
      // La API filtra por un solo estado: con los dos marcados es lo mismo que "Todos"
      estado: valores.estados.length === 1 ? valores.estados[0] : "",
      fecha_desde: valores.fecha_desde,
      fecha_hasta: valores.fecha_hasta,
      pagina: 1,
    }));

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Cajas" subtitulo="Gestiona las cajas registradas." icono="point_of_sale">
        {datos?.caja_abierta && (
          <Link className="btn btn-outline-secondary" to={`/finanzas/cajas/${datos.caja_abierta}`}>
            <Icono nombre="search" /> Ir a la caja abierta
          </Link>
        )}
        {puede("caja:escribir") && datos && !datos.caja_abierta && (
          <button type="button" className="btn btn-marca" onClick={() => setAbriendo(true)}>
            <Icono nombre="add" /> Abrir caja
          </button>
        )}
      </Encabezado>
      <Notificar texto={cajas.error} />
      {datos && !datos.caja_abierta && <Alerta tipo="warning">No hay ninguna caja abierta. Hace falta una para registrar gastos y ventas.</Alerta>}

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => aplicar(borrador)}
            onLimpiar={() => {
              setBorrador(FILTROS_VACIOS);
              aplicar(FILTROS_VACIOS);
            }}
          >
            <FiltroBuscar id="buscar-caja" valor={borrador.buscar} onCambiar={(v) => setBorrador({ ...borrador, buscar: v })} placeholder="N.º de caja o responsable..." />
            <FiltroCasillas titulo="Estado de la caja" opciones={ESTADOS} elegidos={borrador.estados} onCambiar={(v) => setBorrador({ ...borrador, estados: v })} />
            <FiltroFechas
              desde={borrador.fecha_desde}
              hasta={borrador.fecha_hasta}
              maximo={fechaISO()}
              onCambiar={({ desde, hasta }) => setBorrador({ ...borrador, fecha_desde: desde, fecha_hasta: hasta })}
            />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={filtros.por_pagina} onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, pagina: 1 }))} />
        {!datos ? (
          cajas.cargando && <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Fecha de apertura</th>
                  <th scope="col">Empleado responsable</th>
                  <th scope="col">Saldo inicial</th>
                  <th scope="col">Saldo esperado</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className={cajas.cargando ? "opacity-50" : ""}>
                {datos.resultados.map((c) => (
                  <tr key={c.id_caja}>
                    <td className="fw-semibold">#{c.id_caja}</td>
                    <td className="text-nowrap">{fechaHora(c.fecha_apertura)}</td>
                    <td>{c.empleado_apertura}</td>
                    <td className="text-nowrap">{dinero(c.saldo_inicial)}</td>
                    <td className="text-nowrap">{c.saldo_esperado ? dinero(c.saldo_esperado) : "—"}</td>
                    <td>
                      <EstadoCaja estado={c.estado_caja} />
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="ver" titulo={`Ver detalle de la caja #${c.id_caja}`} a={`/finanzas/cajas/${c.id_caja}`} />
                        {c.estado_caja === "abierto" && puede("caja:modificar") && (
                          <BotonAccion tipo="desactivar" icono="lock" titulo={`Arqueo y cierre de la caja #${c.id_caja}`} a={`/finanzas/cajas/${c.id_caja}`} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!datos.resultados.length && <Vacio columnas={7}>No hay cajas para mostrar.</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        {datos && (
          <PaginacionNumeros pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} nombre="cajas" onPagina={(p) => setFiltros((f) => ({ ...f, pagina: p }))} />
        )}
      </ListadoLayout>

      {abriendo && <AbrirCaja onCerrar={() => setAbriendo(false)} onAbierta={(c) => navegar(`/finanzas/cajas/${c.id_caja}`)} />}
    </div>
  );
}
