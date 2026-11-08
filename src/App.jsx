import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import RutaPrivada from "./components/RutaPrivada";
import Catalogo from "./pages/Catalogo";
import { CATALOGOS } from "./pages/catalogos";
import { CambiarContrasena, MiPerfil, MisPermisos } from "./pages/cuenta/Cuenta";
import Asistencias, { TiposAsistencia } from "./pages/empleados/Asistencias";
import Cargos, { Permisos } from "./pages/empleados/Cargos";
import Empleados from "./pages/empleados/Empleados";
import Cajas from "./pages/finanzas/Cajas";
import DetalleCaja from "./pages/finanzas/DetalleCaja";
import Gastos from "./pages/finanzas/Gastos";
import Ventas from "./pages/finanzas/Ventas";
import Bebidas from "./pages/inventario/Bebidas";
import FormularioIngrediente from "./pages/inventario/FormularioIngrediente";
import Ingredientes from "./pages/inventario/Ingredientes";
import Platos from "./pages/inventario/Platos";
import Login from "./pages/Login";
import PaginaModulo from "./pages/PaginaModulo";
import Panel from "./pages/Panel";
import Auditoria from "./pages/reportes/Auditoria";
import Comandas from "./pages/ventas/Comandas";
import DetalleComanda from "./pages/ventas/DetalleComanda";
import FormularioComanda from "./pages/ventas/FormularioComanda";
import { Comprobante, Tickets } from "./pages/ventas/Impresiones";
import Mesas from "./pages/ventas/Mesas";

const Reportes = lazy(() => import("./pages/reportes/Reportes"));

// Dirección, permiso y pantalla.
const PANTALLAS = [
  { ruta: "platos", permiso: "platos:leer", Pantalla: Platos },
  { ruta: "bebidas", permiso: "bebidas:leer", Pantalla: Bebidas },
  { ruta: "ingredientes", permiso: "ingredientes:leer", Pantalla: Ingredientes },
  { ruta: "ingredientes/nuevo", permiso: "ingredientes:escribir", Pantalla: FormularioIngrediente },
  { ruta: "ingredientes/:id/editar", permiso: "ingredientes:modificar", Pantalla: FormularioIngrediente },
  { ruta: "categorias", permiso: "categorias:leer", Pantalla: Catalogo, props: { config: CATALOGOS.categoriasPlato } },
  { ruta: "tipos-bebida", permiso: "bebidas:leer", Pantalla: Catalogo, props: { config: CATALOGOS.tiposBebida } },
  { ruta: "mesas", permiso: "mesas:leer", Pantalla: Mesas },
  { ruta: "comandas", permiso: "comandas:leer", Pantalla: Comandas },
  { ruta: "comandas/nueva", permiso: "comandas:escribir", Pantalla: FormularioComanda },
  { ruta: "comandas/:id", permiso: "comandas:leer", Pantalla: DetalleComanda },
  { ruta: "comandas/:id/editar", permiso: "comandas:modificar", Pantalla: FormularioComanda },
  { ruta: "finanzas/cajas", permiso: "caja:leer", Pantalla: Cajas },
  { ruta: "finanzas/cajas/:id", permiso: "caja:leer", Pantalla: DetalleCaja },
  { ruta: "finanzas/gastos", permiso: "caja:leer", Pantalla: Gastos },
  { ruta: "finanzas/ventas", permiso: "ventas:leer", Pantalla: Ventas },
  { ruta: "finanzas/categorias-gasto", permiso: "caja:leer", Pantalla: Catalogo, props: { config: CATALOGOS.categoriasGasto } },
  { ruta: "finanzas/metodos-pago", permiso: "caja:leer", Pantalla: Catalogo, props: { config: CATALOGOS.metodosPago } },
  { ruta: "empleados", permiso: "empleados:leer", Pantalla: Empleados },
  { ruta: "asistencias", permiso: "empleados:leer", Pantalla: Asistencias },
  { ruta: "turnos", permiso: "empleados:leer", Pantalla: TiposAsistencia },
  { ruta: "cargos", permiso: "cargos:leer", Pantalla: Cargos },
  { ruta: "permisos", permiso: "cargos:leer", Pantalla: Permisos },
  { ruta: "reportes", permiso: "reportes:leer", Pantalla: Reportes },
  { ruta: "auditoria", permiso: "auditoria:leer", Pantalla: Auditoria },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaPrivada />}>
        {/* Para imprimir: sin la barra del menú */}
        <Route element={<RutaPrivada permiso="comandas:leer" />}>
          <Route path="comandas/:id/comprobante" element={<Comprobante />} />
          <Route path="comandas/:id/tickets" element={<Tickets />} />
        </Route>

        <Route element={<Layout />}>
          <Route index element={<Panel />} />
          {/* Páginas de entrada de los módulos: cada tarjeta se muestra según los permisos */}
          <Route path="inventario" element={<PaginaModulo key="inventario" modulo="inventario" />} />
          <Route path="personal" element={<PaginaModulo key="empleados" modulo="empleados" />} />
          <Route path="finanzas" element={<PaginaModulo key="finanzas" modulo="finanzas" />} />
          <Route path="cuenta/perfil" element={<MiPerfil />} />
          <Route path="cuenta/contrasena" element={<CambiarContrasena />} />
          <Route path="cuenta/permisos" element={<MisPermisos />} />
          {PANTALLAS.map(({ ruta, permiso, Pantalla, props }) => (
            <Route key={ruta} element={<RutaPrivada permiso={permiso} />}>
              {/* key: al pasar de un catálogo a otro, la pantalla empieza de cero */}
              <Route path={ruta} element={<Pantalla key={ruta} {...props} />} />
            </Route>
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
