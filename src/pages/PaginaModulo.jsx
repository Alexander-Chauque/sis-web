// Página de entrada de un módulo:
// una tarjeta con foto por cada sección. Solo se ven las que el usuario puede abrir.
import { Link } from "react-router-dom";

import { Encabezado } from "../components/Comunes";
import { Icono } from "../components/Icono";
import { useAuth } from "../context/AuthContext";
import { MODULOS } from "./modulos";

export default function PaginaModulo({ modulo }) {
  const { puede } = useAuth();
  const { titulo, subtitulo, icono, tarjetas } = MODULOS[modulo];
  const visibles = tarjetas.filter((t) => puede(t.permiso));

  return (
    <div className="modulo-container">
      <Encabezado titulo={titulo} subtitulo={subtitulo} icono={icono} />
      <div className="modulo-grid">
        {visibles.map((t) => (
          <div className="seccion-card" key={t.a}>
            <div className="seccion-imagen">
              <img src={t.foto} alt="" loading="lazy" />
              <div className="seccion-icono">
                <Icono nombre={t.icono} />
              </div>
            </div>
            <div className="seccion-contenido">
              <h3>{t.nombre}</h3>
              <p>{t.texto}</p>
              <Link to={t.a} className="btn-seccion" aria-label={`Ingresar a ${t.nombre}`}>
                Ingresar <Icono nombre="arrow_forward" />
              </Link>
            </div>
          </div>
        ))}
      </div>
      {!visibles.length && <p className="text-secondary">No tenés permiso para ver ninguna sección de este módulo.</p>}
    </div>
  );
}
