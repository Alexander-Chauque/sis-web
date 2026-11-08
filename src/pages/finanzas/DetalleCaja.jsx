import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import { dinero, fechaHora, montoValido, textoMonto } from "../../utils/formato";
import { EstadoCaja } from "./Cajas";

function Dato({ titulo, children }) {
  return (
    <>
      <dt className="col-6 fw-normal text-secondary">{titulo}</dt>
      <dd className="col-6 text-end">{children || "—"}</dd>
    </>
  );
}

export default function DetalleCaja() {
  const { id } = useParams();
  const { puede } = useAuth();
  const { datos: caja, cargando, error: errorCarga, recargar } = useCarga(`/cajas/${id}/`);
  const [ventana, setVentana] = useState(null); // "arqueo" o "cierre"
  const [contado, setContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (cargando && !caja) return <Cargando />;
  if (!caja) return <Alerta>{errorCarga}</Alerta>;

  const abrir = (cual) => {
    setVentana(cual);
    setContado("");
    setObservaciones("");
    setError("");
  };

  const enviar = async () => {
    setError("");
    if (ventana === "arqueo" && !montoValido(contado, { permitirCero: true })) {
      return setError("El saldo contado debe ser un número válido y no negativo.");
    }
    setEnviando(true);
    try {
      if (ventana === "arqueo") {
        await api.post(`/cajas/${id}/arqueo/`, { saldo_contado: textoMonto(contado), observaciones_arqueo: observaciones.trim() });
        setAviso("El arqueo se realizó correctamente.");
      } else {
        await api.post(`/cajas/${id}/cierre/`, { observaciones_cierre: observaciones.trim() });
        setAviso("La caja se cerró correctamente.");
      }
      setVentana(null);
      recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const abierta = caja.estado_caja === "abierto";
  const diferencia = Number(caja.diferencia_caja);

  return (
    <>
      <Encabezado titulo={`Caja #${caja.id_caja}`} subtitulo={`Abierta el ${fechaHora(caja.fecha_apertura)} por ${caja.empleado_apertura}`}>
        <Link className="btn btn-outline-secondary" to="/finanzas/cajas">Volver</Link>
        {abierta && puede("caja:escribir") && <Link className="btn btn-outline-secondary" to="/finanzas/gastos">Registrar gasto</Link>}
        {abierta && puede("caja:modificar") && (
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => abrir("arqueo")}>Hacer arqueo</button>
            <button type="button" className="btn btn-marca" onClick={() => abrir("cierre")}>Cerrar caja</button>
          </>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <h2 className="h6 mb-0">Resumen</h2>
                <EstadoCaja estado={caja.estado_caja} />
              </div>
              <dl className="row mb-0 small">
                <Dato titulo="Saldo inicial">{dinero(caja.saldo_inicial)}</Dato>
                <Dato titulo="Gastos">{dinero(caja.total_egresos)}</Dato>
                <Dato titulo="Ventas registradas">{dinero(caja.total_ventas)}</Dato>
                <dt className="col-6">Saldo esperado</dt>
                <dd className="col-6 text-end fw-bold mb-0">{dinero(caja.saldo_esperado_actual)}</dd>
              </dl>
              {caja.observaciones_apertura && <p className="small text-secondary mt-2 mb-0">Apertura: {caja.observaciones_apertura}</p>}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6">Último arqueo</h2>
              {caja.fecha_arqueo ? (
                <dl className="row mb-0 small">
                  <Dato titulo="Fecha">{fechaHora(caja.fecha_arqueo)}</Dato>
                  <Dato titulo="Hecho por">{caja.empleado_arqueo}</Dato>
                  <Dato titulo="Esperado">{dinero(caja.saldo_esperado)}</Dato>
                  <Dato titulo="Contado">{dinero(caja.saldo_contado)}</Dato>
                  <dt className="col-6">Diferencia</dt>
                  <dd className={`col-6 text-end fw-bold mb-0 ${diferencia < 0 ? "text-danger" : diferencia > 0 ? "text-success" : ""}`}>{dinero(caja.diferencia_caja)}</dd>
                </dl>
              ) : (
                <p className="text-secondary small mb-0">Todavía no se hizo un arqueo.</p>
              )}
              {caja.observaciones_arqueo && <p className="small text-secondary mt-2 mb-0">{caja.observaciones_arqueo}</p>}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6">Cierre</h2>
              {caja.fecha_cierre ? (
                <dl className="row mb-0 small">
                  <Dato titulo="Fecha">{fechaHora(caja.fecha_cierre)}</Dato>
                  <Dato titulo="Cerrada por">{caja.empleado_cierre}</Dato>
                  <dt className="col-6">Saldo final</dt>
                  <dd className="col-6 text-end fw-bold mb-0">{dinero(caja.saldo_final)}</dd>
                </dl>
              ) : (
                <p className="text-secondary small mb-0">La caja sigue abierta.</p>
              )}
              {caja.observaciones_cierre && <p className="small text-secondary mt-2 mb-0">{caja.observaciones_cierre}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-transparent fw-semibold">Gastos de esta caja</div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Descripción</th>
                <th scope="col" className="d-none d-sm-table-cell">Categoría</th>
                <th scope="col" className="d-none d-md-table-cell">Registró</th>
                <th scope="col" className="text-end">Monto</th>
              </tr>
            </thead>
            <tbody>
              {caja.gastos.map((g) => (
                <tr key={g.id_gasto}>
                  <td className="text-nowrap">{fechaHora(g.fecha_hora_gasto)}</td>
                  <td>{g.descripcion_gasto}</td>
                  <td className="d-none d-sm-table-cell">{g.categoria_nombre}</td>
                  <td className="d-none d-md-table-cell">{g.empleado}</td>
                  <td className="text-end text-nowrap">{dinero(g.monto_gasto)}</td>
                </tr>
              ))}
              {!caja.gastos.length && <Vacio columnas={5}>Sin gastos registrados.</Vacio>}
            </tbody>
          </table>
        </div>
      </div>

      {ventana && (
        <Modal
          titulo={ventana === "arqueo" ? "Arqueo de caja" : `Cerrar caja #${caja.id_caja}`}
          onCerrar={() => setVentana(null)}
          onEnviar={enviar}
          enviando={enviando}
          textoEnviar={ventana === "arqueo" ? "Registrar arqueo" : "Cerrar caja"}
        >
          <Alerta>{error}</Alerta>
          <p>
            Saldo esperado: <strong>{dinero(caja.saldo_esperado_actual)}</strong>
          </p>
          {ventana === "arqueo" ? (
            <Campo id="contado" etiqueta="Efectivo contado *" prefijo="$">
              <input id="contado" className="form-control" inputMode="decimal" required value={contado} onChange={(e) => setContado(e.target.value)} />
            </Campo>
          ) : (
            <p className="text-secondary small">Después del cierre no se pueden registrar ni modificar gastos de esta caja.</p>
          )}
          <Campo id="obs-caja" etiqueta="Observaciones (opcional)" className="mb-0">
            <textarea id="obs-caja" className="form-control" rows={3} maxLength={1000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </Campo>
        </Modal>
      )}
    </>
  );
}
