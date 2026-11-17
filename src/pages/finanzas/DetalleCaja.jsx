// Detalle, arqueo y cierre de caja igual a Django (finanzas/templates/CAJA):
// detalle_caja.html, arqueo_caja.html y cerrar_caja.html, con la cuenta del cajón de _resumen_saldos.html.
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Encabezado } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import { dinero, fechaHora, montoValido, textoMonto } from "../../utils/formato";
import "../../caja.css";

// "$1.234,50" sin espacio, como el resumen de Django
const pesos = (valor) => dinero(valor).replace("$ ", "$");

function Tarjeta({ icono, titulo, children }) {
  return (
    <section className="tarjeta-comanda">
      <div className="titulo-tarjeta">
        <Icono nombre={icono} />
        <h2>{titulo}</h2>
      </div>
      <div className="cuerpo-tarjeta">{children}</div>
    </section>
  );
}

// Dato de solo lectura con la misma forma que en Django (campo apagado)
function CampoFijo({ etiqueta, valor, largo }) {
  return (
    <div className="grupo-campo">
      <label>{etiqueta}</label>
      {largo ? <textarea className="form-control-textarea" rows={4} readOnly value={valor} /> : <input type="text" className="form-control" readOnly value={valor} />}
    </div>
  );
}

function Aviso({ icono = "info", children }) {
  return (
    <div className="alerta-info">
      <Icono nombre={icono} />
      {children}
    </div>
  );
}

// La cuenta del cajón: solo entra el efectivo (CAJA/_resumen_saldos.html)
function ResumenSaldos({ caja }) {
  const diferencia = Number(caja.diferencia_caja);
  return (
    <>
      <ul className="resumen-cuenta">
        <li>
          <span>Saldo inicial</span>
          <span>{pesos(caja.saldo_inicial)}</span>
        </li>
        <li className="suma">
          <span>+ Cobros en efectivo</span>
          <span>{pesos(caja.ventas_efectivo)}</span>
        </li>
        <li className="resta">
          <span>− Gastos</span>
          <span>{pesos(caja.total_egresos)}</span>
        </li>
        <li className="total">
          <span>Saldo esperado en caja</span>
          <span>{pesos(caja.saldo_esperado_actual)}</span>
        </li>
      </ul>
      <p className="resumen-nota">
        <Icono nombre="credit_card" />
        <span>
          Cobros con otros medios (tarjeta, transferencia...): <strong>{pesos(caja.ventas_otros_medios)}</strong>. No se suman porque no están en el cajón.
        </span>
      </p>
      <ul className="resumen-cuenta">
        <li>
          <span>Total cobrado</span>
          <span>
            <strong>{pesos(caja.total_ventas)}</strong>
          </span>
        </li>
        {caja.fecha_arqueo ? (
          <>
            <li>
              <span>Saldo contado en el arqueo</span>
              <span>{pesos(caja.saldo_contado)}</span>
            </li>
            <li>
              <span>Diferencia del arqueo</span>
              <span className={diferencia < 0 ? "diferencia-negativa" : "diferencia-positiva"}>
                {diferencia > 0 ? "+" : ""}
                {pesos(diferencia)} {diferencia < 0 ? "(falta)" : diferencia > 0 ? "(sobra)" : "(cuadra)"}
              </span>
            </li>
          </>
        ) : (
          <li>
            <span>Arqueo</span>
            <span className="text-gris">Sin arqueo registrado</span>
          </li>
        )}
        {caja.estado_caja !== "abierto" && (
          <li>
            <span>Saldo final al cierre</span>
            <span>
              <strong>{pesos(caja.saldo_final)}</strong>
            </span>
          </li>
        )}
      </ul>
    </>
  );
}

function useCaja() {
  const { id } = useParams();
  const carga = useCarga(`/cajas/${id}/`);
  return { id, ...carga };
}

function Responsable() {
  const { usuario } = useAuth();
  return (
    <div className="mozo-info">
      <div className="avatar-mozo">
        <Icono nombre="account_circle" />
      </div>
      <div>
        <span className="nombre-mozo">{usuario?.nombre || usuario?.usuario}</span>
        <span className="rol-mozo-badge">{usuario?.cargo || "Sin cargo asignado"}</span>
      </div>
    </div>
  );
}

function TablaSimple({ columnas, children }) {
  return (
    <div className="tabla-caja">
      <table className="tabla">
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function DetalleCaja() {
  const { puede } = useAuth();
  const { state } = useLocation();
  const [aviso, setAviso] = useState(state?.aviso || "");
  const { datos: caja, cargando, error } = useCaja();

  if (cargando && !caja) return <Cargando />;
  if (!caja) return <Alerta>{error}</Alerta>;

  const abierta = caja.estado_caja === "abierto";

  return (
    <div className="vista-caja">
      <Encabezado titulo={`Detalle de caja #${caja.id_caja}`} subtitulo="Consulta la información y los movimientos de la caja." icono="point_of_sale" volver="/finanzas/cajas" />
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />

      <Tarjeta icono="info" titulo="Estado de la caja">
        {abierta ? (
          <span className="estado-caja abierta">
            <Icono nombre="lock_open" /> Caja abierta
          </span>
        ) : (
          <span className="estado-caja cerrada">
            <Icono nombre="lock" /> Caja cerrada
          </span>
        )}
      </Tarjeta>

      <div className="layout-comanda">
        <div className="columna-izquierda">
          <Tarjeta icono="login" titulo="Información de apertura">
            <CampoFijo etiqueta="Número de caja" valor={`#${caja.id_caja}`} />
            <CampoFijo etiqueta="Fecha y hora de apertura" valor={fechaHora(caja.fecha_apertura)} />
            <CampoFijo etiqueta="Responsable de apertura" valor={caja.empleado_apertura || ""} />
            <CampoFijo etiqueta="Saldo inicial" valor={dinero(caja.saldo_inicial)} />
            <CampoFijo etiqueta="Observaciones de apertura" largo valor={caja.observaciones_apertura || "Sin observaciones de apertura."} />
          </Tarjeta>

          <Tarjeta icono="logout" titulo="Información de cierre">
            <CampoFijo etiqueta="Fecha y hora de cierre" valor={caja.fecha_cierre ? fechaHora(caja.fecha_cierre) : "Pendiente"} />
            <CampoFijo etiqueta="Responsable de cierre" valor={caja.empleado_cierre || "Pendiente"} />
            <CampoFijo etiqueta="Saldo final" valor={dinero(caja.saldo_final)} />
            <CampoFijo etiqueta="Observaciones de cierre" largo valor={caja.observaciones_cierre || "Sin observaciones de cierre."} />
          </Tarjeta>
        </div>

        <div className="columna-derecha">
          <Tarjeta icono="payments" titulo="Resumen de saldos">
            <ResumenSaldos caja={caja} />
          </Tarjeta>

          <Tarjeta icono="fact_check" titulo="Información del arqueo">
            <CampoFijo etiqueta="Fecha y hora del arqueo" valor={caja.fecha_arqueo ? fechaHora(caja.fecha_arqueo) : "Sin arqueo registrado"} />
            <CampoFijo etiqueta="Responsable del arqueo" valor={caja.empleado_arqueo || "Pendiente"} />
            <CampoFijo etiqueta="Observaciones de arqueo" largo valor={caja.observaciones_arqueo || "Sin observaciones de arqueo."} />
          </Tarjeta>
        </div>
      </div>

      <Tarjeta icono="receipt_long" titulo="Gastos asociados">
        {caja.gastos.length ? (
          <TablaSimple columnas={["Descripción", "Categoría", "Fecha", "Responsable", "Monto"]}>
            {caja.gastos.map((g) => (
              <tr key={g.id_gasto}>
                <td>{g.descripcion_gasto}</td>
                <td>{g.categoria_nombre}</td>
                <td>{fechaHora(g.fecha_hora_gasto)}</td>
                <td>{g.empleado}</td>
                <td>{dinero(g.monto_gasto)}</td>
              </tr>
            ))}
          </TablaSimple>
        ) : (
          <Aviso>No hay gastos asociados a esta caja.</Aviso>
        )}
      </Tarjeta>

      <Tarjeta icono="point_of_sale" titulo="Ventas asociadas">
        {caja.pagos.length ? (
          <TablaSimple columnas={["Comanda", "Fecha", "Responsable", "Método de pago", "Monto"]}>
            {caja.pagos.map((p) => (
              <tr key={p.id_pago}>
                <td>
                  <Link to={`/comandas/${p.comanda}`}>#{p.comanda}</Link>
                </td>
                <td>{fechaHora(p.fecha_hora)}</td>
                <td>{p.empleado}</td>
                <td>{p.metodo}</td>
                <td>{dinero(p.monto)}</td>
              </tr>
            ))}
          </TablaSimple>
        ) : (
          <Aviso>No hay ventas registradas.</Aviso>
        )}
      </Tarjeta>

      <Tarjeta icono="point_of_sale" titulo="Ventas por método de pago">
        {caja.ventas_por_metodo.length ? (
          <TablaSimple columnas={["Método de pago", "Total recaudado"]}>
            {caja.ventas_por_metodo.map((v) => (
              <tr key={v.metodo}>
                <td>{v.metodo}</td>
                <td>{dinero(v.total)}</td>
              </tr>
            ))}
          </TablaSimple>
        ) : (
          <Aviso>No hay ventas registradas.</Aviso>
        )}
      </Tarjeta>

      <div className="botones-carrito">
        <Link to="/finanzas/cajas" className="btn btn-outline-secondary">
          <Icono nombre="arrow_back" /> Volver al listado
        </Link>
        {abierta && puede("caja:modificar") && (
          <>
            <Link to={`/finanzas/cajas/${caja.id_caja}/arqueo`} className="btn btn-outline-secondary">
              <Icono nombre="fact_check" /> Realizar arqueo
            </Link>
            <Link to={`/finanzas/cajas/${caja.id_caja}/cierre`} className="btn btn-marca">
              <Icono nombre="lock" /> Cerrar caja
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function ArqueoCaja() {
  const navegar = useNavigate();
  const { id, datos: caja, cargando, error: errorCarga } = useCaja();
  const [contado, setContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ahora] = useState(() => new Date());

  if (cargando && !caja) return <Cargando />;
  if (!caja) return <Alerta>{errorCarga}</Alerta>;

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (!montoValido(contado, { permitirCero: true })) return setError("El saldo contado debe ser un número válido y no negativo.");
    setEnviando(true);
    try {
      await api.post(`/cajas/${id}/arqueo/`, { saldo_contado: textoMonto(contado), observaciones_arqueo: observaciones.trim() });
      navegar(`/finanzas/cajas/${id}`, { state: { aviso: "El arqueo se realizó correctamente." } });
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <div className="vista-caja">
      <Encabezado titulo={`Arqueo de caja #${caja.id_caja}`} subtitulo="Registrá el dinero contado y verificá las diferencias de caja." icono="fact_check" volver={`/finanzas/cajas/${id}`} />
      <Notificar texto={error} onListo={() => setError("")} />

      {caja.estado_caja !== "abierto" ? (
        <Tarjeta icono="lock" titulo="Caja cerrada">
          <Aviso icono="lock">
            Esta caja está cerrada y no se puede realizar un nuevo arqueo.
            <Link to={`/finanzas/cajas/${id}`} className="btn btn-outline-secondary">
              <Icono nombre="arrow_back" /> Volver al detalle
            </Link>
          </Aviso>
        </Tarjeta>
      ) : (
        <form onSubmit={enviar} noValidate>
          <div className="layout-comanda">
            <div className="columna-izquierda">
              <Tarjeta icono="person" titulo="Responsable del arqueo">
                <Responsable />
                <CampoFijo etiqueta="Fecha de arqueo" valor={fechaHora(ahora)} />
                <Aviso>El responsable se obtiene del usuario autenticado.</Aviso>
              </Tarjeta>
              <Tarjeta icono="point_of_sale" titulo="Datos de la caja">
                <CampoFijo etiqueta="Número de caja" valor={`#${caja.id_caja}`} />
                <CampoFijo etiqueta="Fecha de apertura" valor={fechaHora(caja.fecha_apertura)} />
                <CampoFijo etiqueta="Responsable de apertura" valor={caja.empleado_apertura || ""} />
                <CampoFijo etiqueta="Saldo inicial" valor={dinero(caja.saldo_inicial)} />
              </Tarjeta>
            </div>

            <div className="columna-derecha">
              <Tarjeta icono="account_balance_wallet" titulo="Resumen de caja">
                <CampoFijo etiqueta="Saldo inicial" valor={dinero(caja.saldo_inicial)} />
                <CampoFijo etiqueta="Saldo esperado actual" valor={dinero(caja.saldo_esperado_actual)} />
                <Aviso icono="calculate">
                  Saldo esperado = saldo inicial + cobros en efectivo − gastos. Los cobros con tarjeta o transferencia no se cuentan porque no están en el cajón.
                </Aviso>
              </Tarjeta>

              <Tarjeta icono="payments" titulo="Registrar conteo">
                <div className="grupo-campo">
                  <label htmlFor="saldo_contado">
                    Saldo contado ($) <span>*</span>
                  </label>
                  <div className="select-con-icono">
                    <Icono nombre="attach_money" />
                    <input id="saldo_contado" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" required autoFocus value={contado} onChange={(e) => setContado(e.target.value)} />
                  </div>
                  <small>Ingresá el total de dinero físico contado en la caja.</small>
                </div>
                <div className="grupo-campo">
                  <label htmlFor="observaciones_arqueo">Observaciones de arqueo</label>
                  <textarea
                    id="observaciones_arqueo"
                    className="form-control-textarea"
                    rows={4}
                    maxLength={1000}
                    placeholder="Detallá diferencias, faltantes o sobrantes..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                  <small>Máximo 1000 caracteres.</small>
                </div>
                <Aviso icono="warning">Revisá el importe antes de confirmar. El arqueo registrará el saldo contado y la diferencia calculada.</Aviso>
              </Tarjeta>
            </div>
          </div>

          <div className="acciones-formulario">
            <Link to={`/finanzas/cajas/${id}`} className="btn btn-outline-secondary">
              <Icono nombre="close" /> Cancelar
            </Link>
            <button type="submit" className="btn btn-marca" disabled={enviando}>
              <Icono nombre="fact_check" /> {enviando ? "Guardando..." : "Confirmar arqueo"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function CerrarCaja() {
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const { id, datos: caja, cargando, error: errorCarga } = useCaja();
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (cargando && !caja) return <Cargando />;
  if (!caja) return <Alerta>{errorCarga}</Alerta>;

  const abierta = caja.estado_caja === "abierto";

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await api.post(`/cajas/${id}/cierre/`, { observaciones_cierre: observaciones.trim() });
      navegar(`/finanzas/cajas/${id}`, { state: { aviso: "La caja se cerró correctamente." } });
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <div className="vista-caja">
      <Encabezado titulo={`Cerrar caja #${caja.id_caja}`} subtitulo="Revisá los saldos antes de confirmar el cierre." icono="lock" volver={`/finanzas/cajas/${id}`} />
      <Notificar texto={error} onListo={() => setError("")} />

      <div className="layout-comanda">
        <div className="columna-izquierda">
          <Tarjeta icono="point_of_sale" titulo="Información de la caja">
            <CampoFijo etiqueta="Número de caja" valor={`#${caja.id_caja}`} />
            <CampoFijo etiqueta="Fecha de apertura" valor={fechaHora(caja.fecha_apertura)} />
            <CampoFijo etiqueta="Empleado que abrió la caja" valor={caja.empleado_apertura || ""} />
            <CampoFijo etiqueta="Estado actual" valor={abierta ? "Abierto" : "Cerrado"} />
            <CampoFijo etiqueta="Empleado responsable del cierre" valor={usuario?.nombre || usuario?.usuario || ""} />
            <CampoFijo etiqueta="Cargo" valor={usuario?.cargo || "Sin cargo asignado"} />
          </Tarjeta>
        </div>

        <div className="columna-derecha">
          <Tarjeta icono="account_balance_wallet" titulo="Resumen de saldos">
            <ResumenSaldos caja={caja} />
          </Tarjeta>

          <Tarjeta icono="warning" titulo="Confirmar cierre">
            <p>Al confirmar, la caja quedará cerrada. Verificá que los importes sean correctos antes de continuar.</p>
            {!abierta ? (
              <Aviso>
                Esta caja ya está cerrada y no puede cerrarse nuevamente.
                <Link to={`/finanzas/cajas/${id}`} className="btn btn-outline-secondary">
                  Volver al detalle
                </Link>
              </Aviso>
            ) : !caja.fecha_arqueo ? (
              <Aviso>
                Para cerrar esta caja, primero debés realizar el arqueo.
                <Link to={`/finanzas/cajas/${id}/arqueo`} className="btn btn-marca">
                  <Icono nombre="calculate" /> Realizar arqueo
                </Link>
              </Aviso>
            ) : (
              <form onSubmit={enviar}>
                <div className="grupo-campo">
                  <label htmlFor="observaciones_cierre">Observaciones del cierre</label>
                  <textarea
                    id="observaciones_cierre"
                    className="form-control-textarea"
                    rows={4}
                    maxLength={1000}
                    placeholder="Ingresá observaciones adicionales sobre el cierre..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>
                <div className="botones-carrito">
                  <Link to={`/finanzas/cajas/${id}`} className="btn btn-outline-secondary">
                    Cancelar
                  </Link>
                  <button type="submit" className="btn btn-marca" disabled={enviando}>
                    <Icono nombre="lock" /> {enviando ? "Cerrando..." : "Confirmar cierre"}
                  </button>
                </div>
              </form>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
