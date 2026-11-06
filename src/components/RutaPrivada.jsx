// Protege una pantalla: exige iniciar sesión y, si se indica, un permiso.
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { Cargando } from "./Cargando";

export default function RutaPrivada({ permiso }) {
  const { usuario, cargando, puede } = useAuth();

  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (permiso && !puede(permiso)) {
    return (
      <div className="alert alert-warning" role="alert">
        No tenés permiso para ver esta pantalla.
      </div>
    );
  }
  return <Outlet />;
}
