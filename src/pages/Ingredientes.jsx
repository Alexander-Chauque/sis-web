import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../components/Cargando";
import { useAuth } from "../context/AuthContext";
import { api, mensajeDeError } from "../services/api";

// Quita mayúsculas y acentos para que "azucar" también encuentre "Azúcar"
const normalizar = (texto) =>
  (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Ejemplo: 1500 -> $ 1.500,00
const formatearCosto = (valor) =>
  `$ ${Number(valor).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

const FILTROS = ["Todos", "Disponible", "No disponible"];

export default function Ingredientes() {
  const { puede } = useAuth();
  const [ingredientes, setIngredientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [cambiando, setCambiando] = useState(null);

  useEffect(() => {
    // Una respuesta atrasada no debe pisar un cambio de estado ya hecho
    let vigente = true;
    api
      .get("/ingredientes/")
      .then((respuesta) => {
        if (!vigente) return;
        setIngredientes(respuesta.data);
        setCargando(false);
      })
      .catch((e) => {
        if (!vigente) return;
        setError(mensajeDeError(e));
        setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return ingredientes.filter((ingrediente) => {
      if (filtro === "Disponible" && !ingrediente.estado_ingrediente) return false;
      if (filtro === "No disponible" && ingrediente.estado_ingrediente) return false;
      return normalizar(ingrediente.nombre_ingrediente).includes(texto);
    });
  }, [ingredientes, busqueda, filtro]);

  const cambiarEstado = async (ingrediente) => {
    const accion = ingrediente.estado_ingrediente ? "desactivar" : "activar";
    const confirmado = window.confirm(
      `¿Querés ${accion} "${ingrediente.nombre_ingrediente}"? También cambiará el estado de los platos que lo usan.`,
    );
    if (!confirmado) return;

    setError("");
    setCambiando(ingrediente.id_ingrediente);
    try {
      const { data } = await api.post(`/ingredientes/${ingrediente.id_ingrediente}/estado/`, {
        motivo: "Cambio desde la web",
      });
      // Reemplaza solo el ingrediente que cambió, sin volver a pedir toda la lista
      setIngredientes((lista) =>
        lista.map((item) => (item.id_ingrediente === data.id_ingrediente ? data : item)),
      );
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCambiando(null);
    }
  };

  const puedeEditar = puede("ingredientes:modificar");

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="titulo-marca h2 mb-0">Ingredientes</h1>
          <p className="text-secondary mb-0">Gestioná los ingredientes del inventario</p>
        </div>
        {puede("ingredientes:escribir") && (
          <Link className="btn btn-marca" to="/ingredientes/nuevo">
            Nuevo ingrediente
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6">
          <label htmlFor="busqueda" className="visually-hidden">
            Buscar ingrediente
          </label>
          <input
            id="busqueda"
            type="search"
            className="form-control"
            placeholder="Buscar ingrediente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-6">
          <div className="btn-group w-100" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((opcion) => (
              <button
                key={opcion}
                type="button"
                className={`btn ${filtro === opcion ? "btn-marca" : "btn-outline-secondary"}`}
                aria-pressed={filtro === opcion}
                onClick={() => setFiltro(opcion)}
              >
                {opcion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {cargando ? (
        <Cargando />
      ) : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <caption className="px-3">
                {filtrados.length} de {ingredientes.length} ingredientes
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col" className="d-none d-sm-table-cell">
                    Unidad
                  </th>
                  <th scope="col" className="text-end">
                    Costo
                  </th>
                  <th scope="col">Estado</th>
                  {puedeEditar && (
                    <th scope="col" className="text-end">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((ingrediente) => (
                  <tr key={ingrediente.id_ingrediente}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {ingrediente.imagen_ingrediente ? (
                          <img src={ingrediente.imagen_ingrediente} alt="" className="foto-tabla" />
                        ) : (
                          <span className="foto-tabla foto-vacia" aria-hidden="true" />
                        )}
                        {ingrediente.nombre_ingrediente}
                      </div>
                    </td>
                    <td className="d-none d-sm-table-cell">{ingrediente.unidad_nombre}</td>
                    <td className="text-end text-nowrap">
                      {formatearCosto(ingrediente.costo_unitario)}
                    </td>
                    <td>
                      <span
                        className={`badge ${ingrediente.estado_ingrediente ? "text-bg-success" : "text-bg-secondary"}`}
                      >
                        {ingrediente.estado_ingrediente ? "Disponible" : "No disponible"}
                      </span>
                    </td>
                    {puedeEditar && (
                      <td className="text-end text-nowrap">
                        <Link
                          className="btn btn-sm btn-outline-secondary me-2"
                          to={`/ingredientes/${ingrediente.id_ingrediente}/editar`}
                          aria-label={`Editar ${ingrediente.nombre_ingrediente}`}
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          className={`btn btn-sm ${ingrediente.estado_ingrediente ? "btn-outline-danger" : "btn-outline-success"}`}
                          disabled={cambiando === ingrediente.id_ingrediente}
                          aria-label={`${ingrediente.estado_ingrediente ? "Desactivar" : "Activar"} ${ingrediente.nombre_ingrediente}`}
                          onClick={() => cambiarEstado(ingrediente)}
                        >
                          {ingrediente.estado_ingrediente ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={puedeEditar ? 5 : 4} className="text-center text-secondary py-4">
                      {ingredientes.length
                        ? "Ningún ingrediente coincide con la búsqueda."
                        : "Todavía no hay ingredientes cargados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
