import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Cargando } from "../components/Cargando";
import { api, mensajeDeError } from "../services/api";

// Las mismas unidades que acepta el modelo Ingrediente en Django
const UNIDADES = [
  { valor: "kg", nombre: "Kilogramo" },
  { valor: "g", nombre: "Gramos" },
  { valor: "l", nombre: "Litros" },
  { valor: "ml", nombre: "Mililitros" },
  { valor: "u", nombre: "Unidades" },
];
const TIPOS_DE_FOTO = ["image/jpeg", "image/png", "image/webp"];
const TAMANIO_MAXIMO_FOTO = 5 * 1024 * 1024; // 5 MB, igual que en Django

export default function FormularioIngrediente() {
  const { id } = useParams();
  const esEdicion = !!id;
  const navegar = useNavigate();

  const [nombre, setNombre] = useState("");
  const [costo, setCosto] = useState("");
  const [unidad, setUnidad] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotoGuardada, setFotoGuardada] = useState(null);
  const [fotoNueva, setFotoNueva] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!esEdicion) return undefined;
    // Una respuesta atrasada no debe pisar lo que la persona ya cambió en el formulario
    let vigente = true;
    api
      .get(`/ingredientes/${id}/`)
      .then(({ data }) => {
        if (!vigente) return;
        setNombre(data.nombre_ingrediente);
        setCosto(String(Number(data.costo_unitario)));
        setUnidad(data.unidad_medida);
        setDescripcion(data.descripcion_ingrediente);
        setFotoGuardada(data.imagen_ingrediente);
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
  }, [esEdicion, id]);

  // Guarda la foto elegida y una dirección temporal para mostrarla, liberando la anterior
  const cambiarFotoNueva = (archivo) => {
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    setFotoNueva(archivo);
    setVistaPrevia(archivo ? URL.createObjectURL(archivo) : null);
  };

  const elegirFoto = (evento) => {
    const archivo = evento.target.files[0];
    evento.target.value = ""; // Permite volver a elegir el mismo archivo
    if (!archivo) return;
    setError("");
    if (!TIPOS_DE_FOTO.includes(archivo.type)) {
      setError("La foto debe ser JPG, PNG o WEBP.");
      return;
    }
    if (archivo.size > TAMANIO_MAXIMO_FOTO) {
      setError("La foto no puede superar los 5 MB.");
      return;
    }
    cambiarFotoNueva(archivo);
  };

  const quitarFoto = () => {
    cambiarFotoNueva(null);
    setFotoGuardada(null);
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setError("");

    // Acepta la coma decimal que suele usarse en Argentina
    const costoTexto = costo.trim().replace(",", ".");
    const costoNumero = Number(costoTexto);
    if (!nombre.trim() || !costoTexto || !unidad) {
      setError("Completá el nombre, el costo y la unidad.");
      return;
    }
    if (!Number.isFinite(costoNumero) || costoNumero < 0) {
      setError("Ingresá un costo válido, igual o mayor a 0.");
      return;
    }

    const datos = {
      nombre_ingrediente: nombre.trim(),
      costo_unitario: costoTexto,
      unidad_medida: unidad,
      descripcion_ingrediente: descripcion.trim(),
    };
    let cuerpo = datos;
    if (fotoNueva) {
      // FormData permite enviar un archivo junto con los datos
      cuerpo = new FormData();
      Object.entries(datos).forEach(([campo, valor]) => cuerpo.append(campo, valor));
      cuerpo.append("imagen_ingrediente", fotoNueva);
    } else if (esEdicion && !fotoGuardada) {
      cuerpo = { ...datos, quitar_imagen: true };
    }

    setGuardando(true);
    try {
      // Subir una foto puede tardar más que un pedido común
      const opciones = fotoNueva ? { timeout: 60000 } : undefined;
      if (esEdicion) {
        await api.patch(`/ingredientes/${id}/`, cuerpo, opciones);
      } else {
        await api.post("/ingredientes/", cuerpo, opciones);
      }
      navegar("/ingredientes");
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  if (cargando) return <Cargando />;

  const fotoVisible = vistaPrevia || fotoGuardada;

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-7">
        <h1 className="titulo-marca h2 mb-3">
          {esEdicion ? "Editar ingrediente" : "Nuevo ingrediente"}
        </h1>

        <form className="card shadow-sm" onSubmit={guardar}>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="nombre" className="form-label">
                Nombre *
              </label>
              <input
                id="nombre"
                className="form-control"
                maxLength={100}
                required
                placeholder="Ej. Tomate"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-sm-6">
                <label htmlFor="costo" className="form-label">
                  Costo unitario ($) *
                </label>
                <input
                  id="costo"
                  className="form-control"
                  inputMode="decimal"
                  required
                  placeholder="Ej. 2500"
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label htmlFor="unidad" className="form-label">
                  Unidad de medida *
                </label>
                <select
                  id="unidad"
                  className="form-select"
                  required
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                >
                  <option value="">Seleccioná una unidad</option>
                  {UNIDADES.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="descripcion" className="form-label">
                Descripción (opcional)
              </label>
              <textarea
                id="descripcion"
                className="form-control"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="foto" className="form-label">
                Foto (opcional)
              </label>
              <input
                id="foto"
                type="file"
                className="form-control"
                accept="image/jpeg,image/png,image/webp"
                onChange={elegirFoto}
              />
              <div className="form-text">JPG, PNG o WEBP, hasta 5 MB.</div>
              {fotoVisible && (
                <div className="d-flex align-items-center gap-3 mt-2">
                  <img src={fotoVisible} alt="Foto del ingrediente" className="foto-formulario" />
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={quitarFoto}>
                    Quitar foto
                  </button>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2">
              <Link className="btn btn-outline-secondary" to="/ingredientes">
                Cancelar
              </Link>
              <button type="submit" className="btn btn-marca" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
