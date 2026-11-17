// La caja, explicada paso a paso para que se entienda el recorrido:
// 1) se abre con el efectivo del cajón, 2) durante el turno se suman cobros y restan gastos,
// 3) al cerrar se cuenta el efectivo y se compara con lo que debería haber.
// "Contar efectivo" (arqueo) es un control a mitad de turno y no cierra la caja.
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

const pesos = (valor) => dinero(valor).replace("$ ", "$");
const hora = (valor) => new Date(valor).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const diaHora = (valor) => {
  const d = new Date(valor);
  return `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} ${hora(valor)}`;
};

function Tarjeta({ icono, numero, titulo, children }) {
  return (
    <section className="tarjeta-comanda">
      <div className="titulo-tarjeta">
        {numero ? <span className="paso-numero">{numero}</span> : <Icono nombre={icono} />}
        <h2>{titulo}</h2>
      </div>
      <div className="cuerpo-tarjeta">{children}</div>
    </section>
  );
}

function useCaja() {
  const { id } = useParams();
  const carga = useCarga(`/cajas/${id}/`);
  return { id, ...carga };
}

// ¿Hubo cobros o gastos después del último conteo? Entonces ese conteo ya no coincide
function movimientosDespuesDelConteo(caja) {
  if (!caja.fecha_arqueo) return false;
  const conteo = new Date(caja.fecha_arqueo);
  return [...caja.pagos.map((p) => p.fecha_hora), ...caja.gastos.map((g) => g.fecha_hora_gasto)].some((f) => new Date(f) > conteo);
}

// La cuenta del cajón en tarjetas: al abrir + cobros en efectivo − gastos = debería haber
function CuentaCajon({ caja }) {
  return (
    <>
      <div className="cuenta-cajon" aria-label="Cuenta del efectivo en el cajón">
        <div className="cuenta-cajon-item">
          <span className="cuenta-cajon-etiqueta">Al abrir</span>
          <strong>{pesos(caja.saldo_inicial)}</strong>
        </div>
        <span className="cuenta-cajon-signo" aria-hidden="true">
          +
        </span>
        <div className="cuenta-cajon-item cuenta-cajon-item--suma">
          <span className="cuenta-cajon-etiqueta">Cobros en efectivo</span>
          <strong>{pesos(caja.ventas_efectivo)}</strong>
        </div>
        <span className="cuenta-cajon-signo" aria-hidden="true">
          −
        </span>
        <div className="cuenta-cajon-item cuenta-cajon-item--resta">
          <span className="cuenta-cajon-etiqueta">Gastos</span>
          <strong>{pesos(caja.total_egresos)}</strong>
        </div>
        <span className="cuenta-cajon-signo" aria-hidden="true">
          =
        </span>
        <div className="cuenta-cajon-item cuenta-cajon-item--total">
          <span className="cuenta-cajon-etiqueta">Debería haber en el cajón</span>
          <strong>{pesos(caja.saldo_esperado_actual)}</strong>
        </div>
      </div>
      <p className="resumen-nota">
        <Icono nombre="credit_card" />
        <span>
          Además se cobraron <strong>{pesos(caja.ventas_otros_medios)}</strong> con tarjeta, transferencia u otros medios (total cobrado:{" "}
          <strong>{pesos(caja.total_ventas)}</strong>). No se cuentan en el cajón porque no son billetes.
        </span>
      </p>
      {Number(caja.saldo_esperado_actual) < 0 && (
        <p className="aviso-conteo viejo">
          <Icono nombre="warning" />
          <span>
            Da negativo porque los gastos superan al efectivo que entró. Puede pasar si algún gasto se pagó con otra plata (no del cajón) o si al abrir no se cargó el
            efectivo inicial.
          </span>
        </p>
      )}
    </>
  );
}

// Campo del efectivo contado: la diferencia aparece mientras se escribe
function ContarEfectivo({ esperado, valor, onCambiar }) {
  const contado = parseFloat(String(valor).replace(",", "."));
  const hay = valor !== "" && !Number.isNaN(contado);
  const diferencia = hay ? Math.round((contado - Number(esperado)) * 100) / 100 : 0;
  const clase = diferencia === 0 ? "cuadra" : diferencia < 0 ? "falta" : "sobra";
  return (
    <div className="grupo-campo contar-efectivo">
      <label htmlFor="saldo_contado">
        ¿Cuánto efectivo hay en el cajón? <span>*</span>
      </label>
      <div className="select-con-icono">
        <Icono nombre="attach_money" />
        <input id="saldo_contado" type="number" step="0.01" min="0" inputMode="decimal" required autoFocus autoComplete="off" value={valor} onChange={(e) => onCambiar(e.target.value)} />
      </div>
      <small>Contá los billetes y monedas y escribí el total. Debería haber {pesos(esperado)}.</small>
      {hay && (
        <p className={`contar-efectivo-diferencia ${clase}`} aria-live="polite">
          {diferencia === 0
            ? "Cuadra: hay justo lo que debería haber."
            : `${diferencia < 0 ? "Faltan" : "Sobran"} ${pesos(Math.abs(diferencia))} respecto de lo que debería haber.`}
        </p>
      )}
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
  const viejo = movimientosDespuesDelConteo(caja);
  const diferencia = Number(caja.diferencia_caja);
  const subtitulo = abierta
    ? `Abierta el ${fechaHora(caja.fecha_apertura)} por ${caja.empleado_apertura}.`
    : `Cerrada el ${fechaHora(caja.fecha_cierre)}${caja.empleado_cierre ? ` por ${caja.empleado_cierre}` : ""}.`;

  return (
    <div className="vista-caja">
      <Encabezado titulo={`Caja #${caja.id_caja}`} subtitulo={subtitulo} icono="point_of_sale" volver="/finanzas/cajas">
        {abierta && (
          <>
            {puede("caja:escribir") && (
              <Link to="/finanzas/gastos" className="btn btn-outline-secondary">
                <Icono nombre="remove_shopping_cart" /> Registrar gasto
              </Link>
            )}
            {puede("caja:modificar") && (
              <>
                <Link to={`/finanzas/cajas/${caja.id_caja}/arqueo`} className="btn btn-outline-secondary">
                  <Icono nombre="fact_check" /> Contar efectivo
                </Link>
                <Link to={`/finanzas/cajas/${caja.id_caja}/cierre`} className="btn btn-marca">
                  <Icono nombre="lock" /> Cerrar caja
                </Link>
              </>
            )}
          </>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />

      {abierta ? (
        <ol className="caja-pasos" aria-label="Pasos de la caja">
          <li className="hecho">
            <span className="caja-paso-marca" aria-hidden="true">
              <Icono nombre="check" />
            </span>
            <div>
              <strong>1. Abrir la caja</strong>
              <span>Con {pesos(caja.saldo_inicial)} en el cajón.</span>
            </div>
          </li>
          <li className="actual" aria-current="step">
            <span className="caja-paso-marca" aria-hidden="true">
              2
            </span>
            <div>
              <strong>2. Durante el turno</strong>
              <span>Los cobros y los gastos se suman solos a esta caja.</span>
            </div>
          </li>
          <li>
            <span className="caja-paso-marca" aria-hidden="true">
              3
            </span>
            <div>
              <strong>3. Cerrar la caja</strong>
              <span>Al terminar, contás el efectivo y se compara con lo que debería haber.</span>
            </div>
          </li>
        </ol>
      ) : (
        <ol className="caja-pasos" aria-label="Pasos de la caja">
          {["Abrir la caja", "Durante el turno", "Cerrar la caja"].map((paso, n) => (
            <li key={paso} className="hecho">
              <span className="caja-paso-marca" aria-hidden="true">
                <Icono nombre="check" />
              </span>
              <div>
                <strong>
                  {n + 1}. {paso}
                </strong>
                <span>{n === 2 ? `Cerrada el ${fechaHora(caja.fecha_cierre)}.` : "Hecho."}</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Tarjeta icono="payments" titulo={abierta ? "Efectivo en el cajón ahora" : "Efectivo en el cajón"}>
        <CuentaCajon caja={caja} />

        {!abierta && (
          <div className="resultado-cierre">
            <div>
              <span>Debería haber</span>
              <strong>{pesos(caja.saldo_final)}</strong>
            </div>
            <div>
              <span>Se contó</span>
              {caja.fecha_arqueo ? <strong>{pesos(caja.saldo_contado)}</strong> : <strong className="text-gris">Sin conteo</strong>}
            </div>
            {caja.fecha_arqueo && (
              <div className={diferencia === 0 ? "cuadra" : diferencia < 0 ? "falta" : "sobra"}>
                <span>{diferencia === 0 ? "Diferencia" : diferencia < 0 ? "Faltó" : "Sobró"}</span>
                <strong>{diferencia === 0 ? "Cuadró" : pesos(Math.abs(diferencia))}</strong>
              </div>
            )}
          </div>
        )}

        {caja.fecha_arqueo && abierta && (
          <div className={`aviso-conteo ${viejo ? "viejo" : ""}`}>
            <Icono nombre="fact_check" />
            <span>
              Último conteo: {diaHora(caja.fecha_arqueo)}, se contaron <strong>{pesos(caja.saldo_contado)}</strong> (
              {diferencia < 0 ? `faltaban ${pesos(Math.abs(diferencia))}` : diferencia > 0 ? `sobraban ${pesos(diferencia)}` : "cuadraba"}).
              {viejo && " Después hubo cobros o gastos: al cerrar se vuelve a contar."}
            </span>
          </div>
        )}
        {caja.fecha_arqueo && !abierta && viejo && (
          <p className="aviso-conteo viejo">
            <Icono nombre="history" />
            <span>
              El efectivo se contó el {diaHora(caja.fecha_arqueo)}, cuando debería haber {pesos(caja.saldo_esperado)}. Después hubo más cobros o gastos, por eso no coincide con
              lo de arriba.
            </span>
          </p>
        )}
      </Tarjeta>

      {(caja.observaciones_apertura || caja.observaciones_arqueo || caja.observaciones_cierre) && (
        <Tarjeta icono="sticky_note_2" titulo="Observaciones">
          <dl className="caja-datos">
            {caja.observaciones_apertura && (
              <div>
                <dt>Al abrir</dt>
                <dd>{caja.observaciones_apertura}</dd>
              </div>
            )}
            {caja.observaciones_arqueo && (
              <div>
                <dt>Al contar</dt>
                <dd>{caja.observaciones_arqueo}</dd>
              </div>
            )}
            {caja.observaciones_cierre && (
              <div>
                <dt>Al cerrar</dt>
                <dd>{caja.observaciones_cierre}</dd>
              </div>
            )}
          </dl>
        </Tarjeta>
      )}

      <Tarjeta icono="point_of_sale" titulo={`Cobros (${caja.pagos.length})`}>
        {caja.ventas_por_metodo.length > 0 && (
          <ul className="caja-por-metodo" aria-label="Total por método de pago">
            {caja.ventas_por_metodo.map((v) => (
              <li key={v.metodo}>
                <span>{v.metodo}</span>
                <strong>{pesos(v.total)}</strong>
              </li>
            ))}
          </ul>
        )}
        {caja.pagos.length ? (
          <TablaSimple columnas={["Comanda", "Hora", "Cobró", "Método", "Monto"]}>
            {caja.pagos.map((p) => (
              <tr key={p.id_pago}>
                <td>
                  <Link to={`/comandas/${p.comanda}`}>#{p.comanda}</Link>
                </td>
                <td>{diaHora(p.fecha_hora)}</td>
                <td>{p.empleado}</td>
                <td>{p.metodo}</td>
                <td>{pesos(p.monto)}</td>
              </tr>
            ))}
          </TablaSimple>
        ) : (
          <p className="caja-vacio">Todavía no hay cobros en esta caja.</p>
        )}
      </Tarjeta>

      <Tarjeta icono="receipt_long" titulo={`Gastos (${caja.gastos.length})`}>
        {caja.gastos.length ? (
          <TablaSimple columnas={["Descripción", "Categoría", "Hora", "Registró", "Monto"]}>
            {caja.gastos.map((g) => (
              <tr key={g.id_gasto}>
                <td>{g.descripcion_gasto || "—"}</td>
                <td>{g.categoria_nombre}</td>
                <td>{diaHora(g.fecha_hora_gasto)}</td>
                <td>{g.empleado}</td>
                <td>{pesos(g.monto_gasto)}</td>
              </tr>
            ))}
          </TablaSimple>
        ) : (
          <p className="caja-vacio">Todavía no hay gastos en esta caja.</p>
        )}
      </Tarjeta>
    </div>
  );
}

// Contar efectivo (arqueo): control a mitad de turno, no cierra la caja
export function ArqueoCaja() {
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const { id, datos: caja, cargando, error: errorCarga } = useCaja();
  const [contado, setContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (cargando && !caja) return <Cargando />;
  if (!caja) return <Alerta>{errorCarga}</Alerta>;

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (!montoValido(contado, { permitirCero: true })) return setError("El efectivo contado debe ser un número válido y no negativo.");
    setEnviando(true);
    try {
      await api.post(`/cajas/${id}/arqueo/`, { saldo_contado: textoMonto(contado), observaciones_arqueo: observaciones.trim() });
      navegar(`/finanzas/cajas/${id}`, { state: { aviso: "El conteo quedó registrado. La caja sigue abierta." } });
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <div className="vista-caja">
      <Encabezado
        titulo={`Contar efectivo · Caja #${caja.id_caja}`}
        subtitulo="Arqueo: un control a mitad de turno para ver si el efectivo coincide. No cierra la caja."
        icono="fact_check"
        volver={`/finanzas/cajas/${id}`}
      />
      <Notificar texto={error} onListo={() => setError("")} />

      {caja.estado_caja !== "abierto" ? (
        <Alerta>Esta caja está cerrada: ya no se puede contar el efectivo.</Alerta>
      ) : (
        <form onSubmit={enviar} noValidate className="caja-formulario">
          <Tarjeta numero="1" titulo="Lo que debería haber">
            <CuentaCajon caja={caja} />
          </Tarjeta>
          <Tarjeta numero="2" titulo="Contá el efectivo">
            <ContarEfectivo esperado={caja.saldo_esperado_actual} valor={contado} onCambiar={setContado} />
            <div className="grupo-campo">
              <label htmlFor="observaciones_arqueo">Observaciones (opcional)</label>
              <textarea
                id="observaciones_arqueo"
                className="form-control-textarea"
                rows={3}
                maxLength={1000}
                placeholder="Ej: faltan $500 de un vuelto mal dado"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
            <p className="caja-quien">
              <Icono nombre="person" /> Lo cuenta {usuario?.nombre || usuario?.usuario}
              {usuario?.cargo ? ` (${usuario.cargo})` : ""}.
            </p>
          </Tarjeta>
          <div className="acciones-formulario">
            <Link to={`/finanzas/cajas/${id}`} className="btn btn-outline-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-marca" disabled={enviando}>
              <Icono nombre="fact_check" /> {enviando ? "Guardando..." : "Guardar conteo"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Cerrar en un solo paso: se cuenta el efectivo, se ve si falta o sobra y se cierra
export function CerrarCaja() {
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const { id, datos: caja, cargando, error: errorCarga } = useCaja();
  const [contado, setContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (cargando && !caja) return <Cargando />;
  if (!caja) return <Alerta>{errorCarga}</Alerta>;

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (!montoValido(contado, { permitirCero: true })) return setError("Escribí cuánto efectivo contaste en el cajón.");
    setEnviando(true);
    try {
      await api.post(`/cajas/${id}/cierre/`, { saldo_contado: textoMonto(contado), observaciones_cierre: observaciones.trim() });
      navegar(`/finanzas/cajas/${id}`, { state: { aviso: `La caja #${id} quedó cerrada.` } });
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <div className="vista-caja">
      <Encabezado
        titulo={`Cerrar caja #${caja.id_caja}`}
        subtitulo="Contá el efectivo del cajón y confirmá. Después de cerrarla no se pueden cobrar ni cargar gastos en ella."
        icono="lock"
        volver={`/finanzas/cajas/${id}`}
      />
      <Notificar texto={error} onListo={() => setError("")} />

      {caja.estado_caja !== "abierto" ? (
        <Alerta>Esta caja ya está cerrada.</Alerta>
      ) : (
        <form onSubmit={enviar} noValidate className="caja-formulario">
          <Tarjeta numero="1" titulo="Lo que debería haber">
            <CuentaCajon caja={caja} />
          </Tarjeta>
          <Tarjeta numero="2" titulo="Contá el efectivo">
            <ContarEfectivo esperado={caja.saldo_esperado_actual} valor={contado} onCambiar={setContado} />
            <div className="grupo-campo">
              <label htmlFor="observaciones_cierre">Observaciones (opcional)</label>
              <textarea
                id="observaciones_cierre"
                className="form-control-textarea"
                rows={3}
                maxLength={1000}
                placeholder="Ej: faltan $500 de un vuelto mal dado"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
              <small>Si falta o sobra plata, anotá el motivo si lo sabés.</small>
            </div>
            <p className="caja-quien">
              <Icono nombre="person" /> La cierra {usuario?.nombre || usuario?.usuario}
              {usuario?.cargo ? ` (${usuario.cargo})` : ""}.
            </p>
          </Tarjeta>
          <div className="acciones-formulario">
            <Link to={`/finanzas/cajas/${id}`} className="btn btn-outline-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-marca" disabled={enviando}>
              <Icono nombre="lock" /> {enviando ? "Cerrando..." : "Cerrar caja"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
