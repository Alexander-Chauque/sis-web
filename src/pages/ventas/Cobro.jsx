// Registrar el pago de una comanda, como el modal de pago de Django:
// todo de una vez o por partes, con el método de pago y el vuelto si paga en efectivo.
// Se abre en el lugar (plano, listado o detalle) sin cambiar de pantalla.
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Alerta, Campo, Modal } from "../../components/Comunes";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import { dinero, montoValido, textoMonto } from "../../utils/formato";

export function Cobro({ comanda, onCerrar }) {
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const metodos = useCarga("/comandas/metodos-pago/");
  const [tipo, setTipo] = useState("total");
  const [metodo, setMetodo] = useState("");
  const [monto, setMonto] = useState("");
  const [recibido, setRecibido] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const saldo = Number(comanda.saldo_pendiente ?? comanda.total_comanda);
  const elegido = (metodos.datos || []).find((m) => String(m.id) === metodo);
  const aCobrar = tipo === "parcial" ? Number(textoMonto(monto)) || 0 : saldo;
  const conRecibido = elegido?.permite_cambio && recibido.trim() !== "";
  const vuelto = conRecibido ? Number(textoMonto(recibido)) - aCobrar : 0;

  const enviar = async () => {
    setError("");
    if (!metodo) return setError("Elegí el método de pago.");
    if (tipo === "parcial" && !montoValido(monto)) return setError("Ingresá un monto mayor a 0, con hasta 2 decimales.");
    if (tipo === "parcial" && aCobrar > saldo) return setError(`El monto no puede superar el saldo de ${dinero(saldo)}.`);
    if (conRecibido && vuelto < 0) return setError("El monto recibido no alcanza para cubrir lo que se cobra.");
    setEnviando(true);
    try {
      const { data } = await api.post(`/comandas/${comanda.id_comanda}/pago/`, {
        tipo_pago: tipo,
        metodo_pago: Number(metodo),
        monto: tipo === "parcial" ? textoMonto(monto) : undefined,
        monto_recibido: conRecibido ? textoMonto(recibido) : undefined,
      });
      const restante = Number(data.saldo_pendiente);
      const textoVuelto = Number(data.vuelto) > 0 ? ` Vuelto a entregar: ${dinero(data.vuelto)}.` : "";
      const aviso =
        restante > 0
          ? `Pago de ${dinero(data.monto_cobrado)} registrado en la comanda #${comanda.id_comanda}. Saldo pendiente: ${dinero(restante)}.${textoVuelto}`
          : `Comanda #${comanda.id_comanda} pagada.${textoVuelto}`;
      // Al terminar de cobrar se imprime el comprobante y después se vuelve a esta pantalla
      navegar(`/comandas/${comanda.id_comanda}/comprobante?imprimir=1`, { state: { aviso, volver: pathname } });
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo="Registrar pago"
      subtitulo={`Comanda #${comanda.id_comanda}`}
      icono="payments"
      tono="exito"
      onCerrar={onCerrar}
      onEnviar={enviar}
      enviando={enviando}
      textoEnviar="Confirmar pago"
      iconoEnviar="check"
    >
      <Alerta>{error || metodos.error}</Alerta>
      <div className="cobro-saldo">
        <span>Saldo a pagar</span>
        <strong>{dinero(saldo)}</strong>
        {saldo < Number(comanda.total_comanda) && <small>Total de la comanda: {dinero(comanda.total_comanda)}</small>}
      </div>

      <fieldset className="mb-3">
        <legend className="form-label">¿Cuánto se paga ahora?</legend>
        <div className="cobro-opciones">
          {[
            ["total", "Toda la cuenta"],
            ["parcial", "Solo una parte"],
          ].map(([valor, nombre]) => (
            <label key={valor} className={`cobro-opcion ${tipo === valor ? "elegida" : ""}`}>
              <input type="radio" name="tipo-pago" checked={tipo === valor} onChange={() => setTipo(valor)} />
              <span>{nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Campo id="metodo-pago" etiqueta="Método de pago *">
        <select id="metodo-pago" className="form-select" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          <option value="">{metodos.datos ? "Seleccione un método..." : "Cargando..."}</option>
          {(metodos.datos || []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </Campo>

      {tipo === "parcial" && (
        <Campo
          id="monto-pago"
          etiqueta="¿Cuánto de la cuenta se paga ahora? *"
          prefijo="$"
          ayuda={
            Number(textoMonto(monto)) > 0 && Number(textoMonto(monto)) < saldo
              ? `Después de este pago quedan ${dinero(saldo - Number(textoMonto(monto)))} por pagar.`
              : "Por ejemplo, si cada uno paga lo suyo. El resto queda pendiente en la comanda."
          }
        >
          <input id="monto-pago" className="form-control" inputMode="decimal" placeholder="Ej: 1500" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </Campo>
      )}

      {/* Solo con métodos que permiten dar vuelto (por ejemplo, Efectivo) */}
      {elegido?.permite_cambio && (
        <>
          <Campo
            id="monto-recibido"
            etiqueta="¿Con cuánto paga el cliente? (opcional)"
            prefijo="$"
            className="mb-0"
            ayuda="Los billetes que te da. Sirve solo para calcular el vuelto."
          >
            <input
              id="monto-recibido"
              className="form-control"
              inputMode="decimal"
              placeholder="Ej: 10000"
              value={recibido}
              onChange={(e) => setRecibido(e.target.value)}
            />
          </Campo>
          {conRecibido && (
            <small className={`cobro-vuelto ${vuelto < 0 ? "falta" : ""}`} aria-live="polite">
              {vuelto < 0 ? `Faltan ${dinero(-vuelto)}` : `Vuelto a entregar: ${dinero(vuelto)}`}
            </small>
          )}
        </>
      )}
    </Modal>
  );
}
