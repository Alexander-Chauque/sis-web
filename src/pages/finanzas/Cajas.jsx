// Listado de cajas
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
import "../../caja.css";

const hora = (valor) => new Date(valor).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

// Resultado de una caja cerrada: compara lo que debería haber con lo que se contó
export function ResultadoCaja({ caja }) {
  if (caja.estado_caja === "abierto") return <span className="text-secondary">En curso</span>;
  if (!caja.fecha_arqueo) return <span className="text-secondary">Sin conteo</span>;
  const diferencia = Number(caja.diferencia_caja);
  if (diferencia === 0) return <span className="caja-resultado cuadra">Cuadró</span>;
  return (
    <span className={`caja-resultado ${diferencia < 0 ? "falta" : "sobra"}`}>
      {diferencia < 0 ? "Faltó" : "Sobró"} {dinero(Math.abs(diferencia))}
    </span>
  );
}

// Tarjeta de arriba: la caja abierta ahora, o cómo abrir una
function CajaActual({ id, puedeAbrir, puedeCerrar, onAbrir }) {
  const detalle = useCarga(id ? `/cajas/${id}/` : null);
  const c = detalle.datos;

  if (!id) {
    return (
      <section className="caja-actual caja-actual--cerrada">
        <span className="caja-actual-icono">
          <Icono nombre="lock" />
        </span>
        <div className="caja-actual-texto">
          <strong>No hay ninguna caja abierta</strong>
          <span>Abrila al empezar el turno con el efectivo que hay en el cajón. Sin caja abierta no se puede cobrar ni registrar gastos.</span>
        </div>
        {puedeAbrir && (
          <button type="button" className="btn btn-marca" onClick={onAbrir}>
            <Icono nombre="lock_open" /> Abrir caja
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="caja-actual">
      <span className="caja-actual-icono">
        <Icono nombre="point_of_sale" />
      </span>
      <div className="caja-actual-texto">
        <strong>Caja #{id} abierta</strong>
        <span>{c ? `Desde las ${hora(c.fecha_apertura)} · la abrió ${c.empleado_apertura}` : "Cargando..."}</span>
      </div>
      {c && (
        <div className="caja-actual-dato">
          <span>Debería haber en el cajón</span>
          <strong>{dinero(c.saldo_esperado_actual)}</strong>
        </div>
      )}
      <div className="caja-actual-botones">
        <Link to={`/finanzas/cajas/${id}`} className="btn btn-outline-secondary">
          <Icono nombre="visibility" /> Ver caja
        </Link>
        {puedeCerrar && (
          <Link to={`/finanzas/cajas/${id}/cierre`} className="btn btn-marca">
            <Icono nombre="lock" /> Cerrar caja
          </Link>
        )}
      </div>
    </section>
  );
}

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
      <p className="text-secondary small">
        Contá los billetes y monedas que hay en el cajón antes de empezar. Ese es el saldo inicial: a partir de ahí, cada cobro en efectivo suma y cada gasto resta.
      </p>
      <Campo id="saldo-inicial" etiqueta="¿Con cuánto efectivo empieza el cajón? *" prefijo="$" ayuda="Puede ser $0 si el cajón empieza vacío.">
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
      <Encabezado
        titulo="Cajas"
        subtitulo="La caja es el efectivo del cajón en un turno: se abre al empezar, junta los cobros y gastos, y se cierra contando la plata."
        icono="point_of_sale"
      />
      <Notificar texto={cajas.error} />
      {datos && (
        <CajaActual
          key={datos.caja_abierta || "ninguna"}
          id={datos.caja_abierta}
          puedeAbrir={puede("caja:escribir")}
          puedeCerrar={puede("caja:modificar")}
          onAbrir={() => setAbriendo(true)}
        />
      )}

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
                  <th scope="col">Al abrir</th>
                  <th scope="col">Al cerrar</th>
                  <th scope="col">Resultado del conteo</th>
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
                    <td className="text-nowrap">{c.estado_caja === "abierto" ? "—" : dinero(c.saldo_final)}</td>
                    <td className="text-nowrap">
                      <ResultadoCaja caja={c} />
                    </td>
                    <td>
                      <EstadoCaja estado={c.estado_caja} />
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="ver" titulo={`Ver detalle de la caja #${c.id_caja}`} a={`/finanzas/cajas/${c.id_caja}`} />
                        {c.estado_caja === "abierto" && puede("caja:modificar") && (
                          <>
                            <BotonAccion tipo="editar" icono="fact_check" titulo={`Contar el efectivo de la caja #${c.id_caja} (arqueo)`} a={`/finanzas/cajas/${c.id_caja}/arqueo`} />
                            <BotonAccion tipo="desactivar" icono="lock" titulo={`Cerrar la caja #${c.id_caja}`} a={`/finanzas/cajas/${c.id_caja}/cierre`} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!datos.resultados.length && <Vacio columnas={8}>No hay cajas para mostrar.</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        {datos && (
          <PaginacionNumeros pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} nombre="cajas" onPagina={(p) => setFiltros((f) => ({ ...f, pagina: p }))} />
        )}
      </ListadoLayout>

      {abriendo && <AbrirCaja onCerrar={() => setAbriendo(false)} onAbierta={(c) => navegar(`/finanzas/cajas/${c.id_caja}`, { state: { aviso: `La caja #${c.id_caja} quedó abierta. Ya se puede cobrar y registrar gastos.` } })} />}
    </div>
  );
}
