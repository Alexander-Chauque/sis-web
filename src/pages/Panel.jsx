import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../components/Cargando";
import { Alerta } from "../components/Comunes";
import { Icono } from "../components/Icono";
import { useAuth } from "../context/AuthContext";
import { useCarga } from "../hooks/useCarga";
const MODULOS = [
  {
    titulo: "Inventario",
    icono: "inventory",
    texto: "Gestiona platos, ingredientes y bebidas",
    destinos: [
      ["/inventario", "platos:leer"],
      ["/inventario", "bebidas:leer"],
      ["/inventario", "ingredientes:leer"],
      ["/categorias", "categorias:leer"],
    ],
  },
  {
    titulo: "Empleados",
    icono: "badge",
    texto: "Gestiona el personal del restaurante",
    destinos: [
      ["/personal", "empleados:leer"],
      ["/personal", "cargos:leer"],
    ],
  },
  {
    titulo: "Mesas",
    icono: "table_restaurant",
    texto: "Control de mesas y su estado",
    destinos: [["/mesas", "mesas:leer"]],
  },
  {
    titulo: "Comandas",
    icono: "receipt_long",
    texto: "Gestión de pedidos/comandas",
    destinos: [["/comandas", "comandas:leer"]],
  },
  {
    titulo: "Finanzas",
    icono: "point_of_sale",
    texto: "Gestion de finanzas",
    destinos: [
      ["/finanzas", "caja:leer"],
      ["/finanzas", "ventas:leer"],
    ],
  },
  {
    titulo: "Reportes",
    icono: "bar_chart",
    texto: "Estadísticas y análisis de ventas",
    destinos: [["/reportes", "reportes:leer"]],
  },
  {
    titulo: "Auditoría",
    icono: "history",
    texto: "Historial de movimientos y cambios",
    destinos: [["/auditoria", "auditoria:leer"]],
  },
];

function Estadistica({ icono, valor, texto, subtexto, porcentaje, a }) {
  const contenido = (
    <>
      <div className="stat-icono">
        <Icono nombre={icono} />
      </div>
      <div className="stat-info">
        <h3>{valor}</h3>
        <p>{texto}</p>
        {porcentaje !== undefined && (
          <div className="progress-bar-cardones" aria-hidden="true">
            <div className="progreso" style={{ width: `${porcentaje}%` }} />
          </div>
        )}
        {subtexto && <span className="stat-subtexto">{subtexto}</span>}
      </div>
    </>
  );
  return a ? (
    <Link className="stat-card" to={a}>
      {contenido}
    </Link>
  ) : (
    <div className="stat-card">{contenido}</div>
  );
}

// Fecha y hora que se actualizan solas
function useAhora() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(reloj);
  }, []);
  return ahora;
}

export default function Panel() {
  const { usuario, puede } = useAuth();
  const { datos: resumen, error } = useCarga("/resumen/");
  const ahora = useAhora();
  const modulos = MODULOS.map((m) => ({
    ...m,
    a: m.destinos.find(([, permiso]) => puede(permiso))?.[0],
  })).filter((m) => m.a);
  const nombre = usuario?.nombre?.split(" ")[0] || usuario?.usuario;
  const porcentaje = resumen?.mesas_totales
    ? Math.round((resumen.mesas_ocupadas / resumen.mesas_totales) * 100)
    : 0;
  const fecha = ahora.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="home-container">
        <div className="home-header">
          <div>
            <h1 className="titulo">
              <Icono nombre="waving_hand" className="text-marca" />
              ¡Bienvenido, {nombre}!
            </h1>
            <p className="subtitulo">
              <Icono nombre="info" />
              Aquí puedes gestionar todas las operaciones del restaurante.
            </p>
          </div>
          <div className="fecha-hora">
            <span>
              <Icono nombre="calendar_today" />
              {fecha.charAt(0).toUpperCase() + fecha.slice(1)}
            </span>
            <span>
              <Icono nombre="schedule" />
              {ahora.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      <Alerta>{error}</Alerta>
      {!resumen && !error && <Cargando />}
      {resumen && (
        <div className="estadisticas-grid">
          <Estadistica
            icono="inventory_2"
            valor={resumen.productos}
            texto="Productos en inventario"
            a={puede("platos:leer") ? "/platos" : null}
          />
          <Estadistica
            icono="table_restaurant"
            valor={`${resumen.mesas_ocupadas} / ${resumen.mesas_totales}`}
            texto="Mesas ocupadas"
            porcentaje={porcentaje}
            subtexto={`${porcentaje}%`}
            a={puede("mesas:leer") ? "/mesas" : null}
          />
          <Estadistica
            icono="receipt_long"
            valor={resumen.comandas_pendientes}
            texto="Comandas pendientes"
            subtexto={`${resumen.comandas_en_preparacion} en preparación`}
            a={
              puede("comandas:leer")
                ? "/comandas?estado=pendiente,en_preparacion,entregado"
                : null
            }
          />
        </div>
      )}

      <div className="seccion-header">
        <h2 className="titulo-seccion">
          <Icono nombre="apps" />
          Módulos del sistema
        </h2>
        <p className="subtitulo-seccion">
          Accede a las diferentes opciones de gestión
        </p>
      </div>
      <div className="modulos-grid">
        {modulos.map((m) => (
          <Link key={m.titulo} to={m.a} className="modulo-card">
            <div className="modulo-icon">
              <Icono nombre={m.icono} />
            </div>
            <h3>{m.titulo}</h3>
            <p>{m.texto}</p>
            <span className="btn-ingresar">
              Ingresar <Icono nombre="arrow_forward" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
