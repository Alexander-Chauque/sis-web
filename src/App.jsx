import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import RutaPrivada from "./components/RutaPrivada";
import FormularioIngrediente from "./pages/FormularioIngrediente";
import Ingredientes from "./pages/Ingredientes";
import Login from "./pages/Login";
import Panel from "./pages/Panel";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaPrivada />}>
        <Route element={<Layout />}>
          <Route index element={<Panel />} />
          <Route element={<RutaPrivada permiso="ingredientes:leer" />}>
            <Route path="ingredientes" element={<Ingredientes />} />
          </Route>
          <Route element={<RutaPrivada permiso="ingredientes:escribir" />}>
            <Route path="ingredientes/nuevo" element={<FormularioIngrediente />} />
          </Route>
          <Route element={<RutaPrivada permiso="ingredientes:modificar" />}>
            <Route path="ingredientes/:id/editar" element={<FormularioIngrediente />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
