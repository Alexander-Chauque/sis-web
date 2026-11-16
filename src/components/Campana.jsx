// Campana del encabezado con la cantidad de notificaciones sin leer (Parcial Nº 2, módulo M3).
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { api } from "../services/api";
import { Icono } from "./Icono";

const EVENTO = "notificaciones-cambiaron";
// Vuelve a consultar cada minuto: así aparecen las alertas nuevas sin recargar la página
const CADA = 60000;

// La bandeja avisa cuando marca notificaciones como leídas, para que el número cambie enseguida
export const avisarCambioNotificaciones = () => window.dispatchEvent(new Event(EVENTO));

export function Campana() {
  const { pathname } = useLocation();
  const [sinLeer, setSinLeer] = useState(0);

  // También se consulta al cambiar de pantalla (por ejemplo, después de cobrar una comanda)
  useEffect(() => {
    let vigente = true;
    const consultar = () =>
      api
        .get("/notificaciones/sin-leer/")
        .then(({ data }) => vigente && setSinLeer(data.sin_leer))
        .catch(() => {
          // Si falla, la campana queda con el último número
        });
    consultar();
    const reloj = setInterval(consultar, CADA);
    window.addEventListener(EVENTO, consultar);
    return () => {
      vigente = false;
      clearInterval(reloj);
      window.removeEventListener(EVENTO, consultar);
    };
  }, [pathname]);

  const texto = sinLeer ? `Notificaciones: ${sinLeer} sin leer` : "Notificaciones";
  return (
    <Link to="/notificaciones" className="campana-notificaciones" title={texto} aria-label={texto}>
      <Icono nombre="notifications" />
      {sinLeer > 0 && (
        <span className="campana-numero" aria-hidden="true">
          {sinLeer > 99 ? "99+" : sinLeer}
        </span>
      )}
    </Link>
  );
}
