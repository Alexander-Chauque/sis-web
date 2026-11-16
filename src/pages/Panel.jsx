// Inicio: panel con la información del día, como en la versión Django.
// Cada bloque se muestra solo si el cargo puede leer ese módulo.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../components/Cargando";
import { Alerta } from "../components/Comunes";
import { Icono } from "../components/Icono";
import { useAuth } from "../context/AuthContext";
import { useCarga } from "../hooks/useCarga";

const MAXIMO_COMANDAS = 8;
const ESTADOS_ACTIVOS = ["pendiente", "en_preparacion", "entregado"];
const plural = (n, palabra) => `${n} ${palabra}${n === 1 ? "" : "s"}`;
const pesos = (valor) => `$${Math.round(Number(valor) || 0).toLocaleString("es-AR")}`;
const horaCorta = (valor) => new Date(valor).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Fecha y hora que se actualizan solas
function useAhora() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(reloj);
  }, []);
  return ahora;
}

function Indicador({ a, icono, nombre, valor, detalle }) {
  return (
    <Link to={a} className="inicio-indicador">
      <Icono nombre={icono} className="inicio-indicador-icono" />
      <span className="inicio-indicador-nombre">{nombre}</span>
      <strong className="inicio-indicador-valor">{valor}</strong>
      <span className="inicio-indicador-detalle">{detalle}</span>
    </Link>
  );
}

function CabeceraPanel({ id, titulo, texto, a, enlace }) {
  return (
    <div className="inicio-panel-cabecera">
      <div>
        <h2 id={id}>{titulo}</h2>
        <p>{texto}</p>
      </div>
      <Link to={a} className="inicio-enlace">
        {enlace} <Icono nombre="arrow_forward" />
      </Link>
    </div>
  );
}

function Vacio({ icono, titulo, texto }) {
  return (
    <div className="inicio-vacio">
      <Icono nombre={icono} />
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
    </div>
  );
}

// Mesas ocupadas y libres por ubicación (Salón, Patio)
function zonasDeMesas(mesas) {
  const zonas = new Map();
  mesas.forEach((m) => {
    const nombre = m.ubicacion_nombre || "Sin ubicación";
    const zona = zonas.get(nombre) || { nombre, total: 0, ocupadas: 0 };
    zona.total += 1;
    if (!m.estado_mesa || m.comanda_abierta) zona.ocupadas += 1;
    zonas.set(nombre, zona);
  });
  return [...zonas.values()].map((z) => ({ ...z, disponibles: z.total - z.ocupadas, porcentaje: Math.round((z.ocupadas * 100) / z.total) }));
}

export default function Panel() {
  const { usuario, puede } = useAuth();
  const verMesas = puede("mesas:leer");
  const verComandas = puede("comandas:leer");
  const verCaja = puede("caja:leer");
  const verProductos = puede("platos:leer") || puede("bebidas:leer");

  const { datos: resumen, error } = useCarga("/resumen/");
  const mesas = useCarga(verMesas ? "/mesas/" : null);
  const comandas = useCarga(verComandas ? "/comandas/" : null, { abiertas: "1" });
  const cajas = useCarga(verCaja ? "/cajas/" : null, { estado: "abierto" });
  const ahora = useAhora();

  const nombre = usuario?.nombre?.split(" ")[0] || usuario?.usuario;
  const fecha = ahora.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const porcentaje = resumen?.mesas_totales ? Math.round((resumen.mesas_ocupadas / resumen.mesas_totales) * 100) : 0;

  const activas = (comandas.datos || []).filter((c) => ESTADOS_ACTIVOS.includes(c.estado_comanda));
  const recientes = activas.slice(0, MAXIMO_COMANDAS);
  const zonas = zonasDeMesas(mesas.datos || []);
  const ocupadas = zonas.reduce((s, z) => s + z.ocupadas, 0);
  const disponibles = zonas.reduce((s, z) => s + z.disponibles, 0);
  const cajaAbierta = cajas.datos?.caja_abierta ? cajas.datos.resultados.find((c) => c.id_caja === cajas.datos.caja_abierta) : null;

  return (
    <div className="inicio">
      <header className="inicio-banner">
        <div className="inicio-banner-texto">
          <span className="inicio-banner-etiqueta">Peña folclórica · Restaurante · Salta</span>
          <h1>¡Hola, {nombre}!</h1>
          <p>Así está el restaurante en este momento.</p>
        </div>
        <div className="inicio-banner-fecha">
          <Icono nombre="calendar_today" />
          <span>
            {fecha} · {horaCorta(ahora)}
          </span>
        </div>
      </header>

      <Alerta>{error}</Alerta>
      {!resumen && !error && <Cargando />}
      {resumen && (
        <section className="inicio-indicadores" aria-label="Indicadores del día">
          {verProductos && (
            <Indicador a="/inventario" icono="inventory_2" nombre="Productos en inventario" valor={resumen.productos} detalle="Platos y bebidas disponibles" />
          )}
          {verMesas && (
            <Indicador
              a="/mesas"
              icono="table_restaurant"
              nombre="Mesas ocupadas"
              valor={
                <>
                  {resumen.mesas_ocupadas} <small>de {resumen.mesas_totales}</small>
                </>
              }
              detalle={`${porcentaje}% de ocupación`}
            />
          )}
          {verComandas && (
            <Indicador
              a="/comandas?estado=pendiente,en_preparacion"
              icono="receipt_long"
              nombre="Comandas pendientes"
              valor={resumen.comandas_pendientes}
              detalle={`${resumen.comandas_en_preparacion} en preparación`}
            />
          )}
          {verCaja && cajas.datos && (
            <Indicador
              a="/finanzas/cajas"
              icono="point_of_sale"
              nombre="Caja"
              valor={cajaAbierta ? "Abierta" : "Cerrada"}
              detalle={cajaAbierta ? `Desde las ${horaCorta(cajaAbierta.fecha_apertura)}` : "Sin caja abierta"}
            />
          )}
        </section>
      )}

      <div className={`inicio-cuerpo ${verComandas ? "" : "inicio-cuerpo--simple"}`}>
        {verComandas && (
          <section className="inicio-panel inicio-comandas" aria-labelledby="titulo-comandas">
            <CabeceraPanel
              id="titulo-comandas"
              titulo="Comandas activas"
              texto={
                activas.length > recientes.length ? `Las ${recientes.length} más recientes de ${activas.length} sin cobrar` : `${activas.length} sin cobrar`
              }
              a="/comandas"
              enlace="Ver todas"
            />
            {!comandas.datos ? (
              <Cargando />
            ) : recientes.length ? (
              <div className="inicio-tabla-contenedor">
                <table className="inicio-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Mesa</th>
                      <th scope="col">Mozo</th>
                      <th scope="col">Hora</th>
                      <th scope="col" className="inicio-num">
                        Total
                      </th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((c) => (
                      <tr key={c.id_comanda}>
                        <td>
                          <Link to={`/comandas/${c.id_comanda}`} className="inicio-mesa">
                            Mesa {c.mesa_numero}
                          </Link>
                          <span className="inicio-secundario">N.º {c.id_comanda}</span>
                        </td>
                        <td>{c.mozo}</td>
                        <td>{horaCorta(c.fecha_hora)}</td>
                        <td className="inicio-num">{pesos(c.total_comanda)}</td>
                        <td>
                          <span className={`inicio-estado inicio-estado--${c.estado_comanda}`}>{c.estado_nombre}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Vacio icono="receipt_long" titulo="No hay comandas activas" texto="Cuando se tome un pedido va a aparecer acá hasta que se cobre." />
            )}
          </section>
        )}

        <div className="inicio-lateral">
          {verMesas && (
            <section className="inicio-panel" aria-labelledby="titulo-mesas">
              <CabeceraPanel
                id="titulo-mesas"
                titulo="Estado de mesas"
                texto={`${plural(ocupadas, "ocupada")} · ${plural(disponibles, "disponible")}`}
                a="/mesas"
                enlace="Ver mesas"
              />
              {!mesas.datos ? (
                <Cargando />
              ) : zonas.length ? (
                <ul className="inicio-zonas">
                  {zonas.map((z) => (
                    <li key={z.nombre}>
                      <div className="inicio-zona-titulo">
                        <strong>{z.nombre}</strong>
                        <span>
                          {z.ocupadas} de {z.total} ocupadas
                        </span>
                      </div>
                      <div className="inicio-barra" role="img" aria-label={`${z.nombre}: ${z.ocupadas} ocupadas y ${z.disponibles} disponibles`}>
                        <div className="inicio-barra-relleno" style={{ width: `${z.porcentaje}%` }} />
                      </div>
                      <div className="inicio-zona-detalle">
                        <span>
                          <i className="inicio-punto inicio-punto--ocupada" />
                          {plural(z.ocupadas, "ocupada")}
                        </span>
                        <span>
                          <i className="inicio-punto" />
                          {plural(z.disponibles, "disponible")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vacio icono="table_restaurant" titulo="Todavía no hay mesas cargadas" />
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
