// Pantalla por estación (Cocina, Bar, Parrilla), igual a la de Django (comandas/estacion.html):
// los pedidos para preparar, del más antiguo al más nuevo, y el botón Listo de cada uno.
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Encabezado } from "../../components/Comunes";
import { Icono } from "../../components/Icono";
import { Notificar } from "../../components/Mensajes";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useNotificar } from "../../hooks/useNotificar";
import { api, mensajeDeError } from "../../services/api";

const CLAVES = ["cocina", "bar", "parrilla"];
// Se actualiza sola cada 30 segundos, como en Django
const CADA = 30000;

export default function Estaciones() {
  const { clave } = useParams();
  if (!CLAVES.includes(clave)) return <Navigate to="/estaciones/cocina" replace />;
  return <Estacion key={clave} clave={clave} />;
}

function Estacion({ clave }) {
  const { puede } = useAuth();
  const notificar = useNotificar();
  const estacion = useCarga(`/estaciones/${clave}/`);
  const [error, setError] = useState("");
  const [marcando, setMarcando] = useState(null);
  const datos = estacion.datos;
  const { recargar } = estacion;

  useEffect(() => {
    const reloj = setInterval(recargar, CADA);
    return () => clearInterval(reloj);
  }, [recargar]);

  const listo = async (pedido) => {
    setMarcando(pedido.id_comanda);
    try {
      const { data } = await api.post(`/estaciones/${clave}/${pedido.id_comanda}/listo/`);
      notificar(`Mesa ${data.mesa}: listo en ${clave}.`, "success");
      recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setMarcando(null);
    }
  };

  const destino = datos?.estacion.destino || "";

  return (
    <div className="contenedor-listado">
      <Encabezado
        titulo={destino || "Cocina, bar y parrilla"}
        subtitulo="Pedidos para preparar, del más antiguo al más nuevo. La pantalla se actualiza sola."
        icono="soup_kitchen"
      />
      <Notificar texto={error || estacion.error} onListo={() => setError("")} />

      <nav className="estaciones-pestanas" aria-label="Estaciones">
        {(datos?.estaciones || []).map((e) => (
          <Link key={e.clave} to={`/estaciones/${e.clave}`} className={`estacion-pestana ${e.clave === clave ? "activa" : ""}`} aria-current={e.clave === clave ? "page" : undefined}>
            {e.destino}
          </Link>
        ))}
      </nav>

      {!datos ? (
        estacion.cargando && <Cargando />
      ) : datos.pedidos.length ? (
        <div className="estacion-pedidos">
          {datos.pedidos.map((pedido) => (
            <article key={pedido.id_comanda} className={`estacion-pedido ${pedido.demorada ? "estacion-pedido--demorada" : ""}`}>
              <header>
                <div>
                  <strong>Mesa {pedido.mesa}</strong>
                  <span>
                    Comanda #{pedido.id_comanda} · {pedido.mozo}
                  </span>
                </div>
                <span className="estacion-espera" title="Tiempo desde que se tomó el pedido">
                  {pedido.espera_texto}
                </span>
              </header>
              <ul>
                {pedido.productos.map((p, n) => (
                  <li key={n}>
                    <span className="estacion-cantidad">{p.cantidad}</span>
                    <span>
                      {p.nombre}
                      {p.nota && <em className="estacion-nota">{p.nota}</em>}
                    </span>
                  </li>
                ))}
              </ul>
              {pedido.observaciones && <p className="estacion-observaciones">{pedido.observaciones}</p>}
              {puede("comandas:modificar") && (
                <button type="button" className="btn btn-marca estacion-listo" disabled={marcando === pedido.id_comanda} onClick={() => listo(pedido)}>
                  <Icono nombre="check" /> {marcando === pedido.id_comanda ? "Guardando..." : "Listo"}
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="estacion-vacia">
          <Icono nombre="task_alt" />
          <strong>No hay nada para preparar en {destino.toLowerCase()}.</strong>
          <p>Cuando entre un pedido, aparece acá solo.</p>
        </div>
      )}
    </div>
  );
}
