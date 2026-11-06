import { useEffect, useState } from "react";

import { Cargando } from "../components/Cargando";
import { useAuth } from "../context/AuthContext";
import { api, mensajeDeError } from "../services/api";

function Tarjeta({ titulo, valor }) {
  return (
    <div className="col-12 col-sm-6 col-lg-3">
      <div className="card h-100 shadow-sm">
        <div className="card-body">
          <p className="text-secondary mb-1">{titulo}</p>
          <p className="numero-panel mb-0">{valor}</p>
        </div>
      </div>
    </div>
  );
}

export default function Panel() {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/resumen/")
      .then((respuesta) => setResumen(respuesta.data))
      .catch((e) => setError(mensajeDeError(e)));
  }, []);

  return (
    <>
      <h1 className="titulo-marca h2">Hola, {usuario?.nombre}</h1>
      <p className="text-secondary mb-4">Resumen del restaurante</p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {!resumen && !error && <Cargando />}
      {resumen && (
        <div className="row g-3">
          <Tarjeta titulo="Productos disponibles" valor={resumen.productos} />
          <Tarjeta
            titulo="Mesas ocupadas"
            valor={`${resumen.mesas_ocupadas} de ${resumen.mesas_totales}`}
          />
          <Tarjeta titulo="Comandas pendientes" valor={resumen.comandas_pendientes} />
          <Tarjeta titulo="Comandas en preparación" valor={resumen.comandas_en_preparacion} />
        </div>
      )}
    </>
  );
}
