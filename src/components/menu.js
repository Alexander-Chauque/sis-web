export const MENU = [
  {
    titulo: "Inventario",
    inicio: "/inventario",
    icono: "inventory_2",
    descripcion: "Gestión de productos",
    resumen: "Gestiona platos, ingredientes y bebidas",
    opciones: [
      { a: "/platos", texto: "Platos", icono: "restaurant", permiso: "platos:leer" },
      { a: "/bebidas", texto: "Bebidas", icono: "local_bar", permiso: "bebidas:leer" },
      { a: "/ingredientes", texto: "Ingredientes", icono: "nutrition", permiso: "ingredientes:leer" },
      { a: "/categorias", texto: "Categorías de platos", icono: "category", permiso: "categorias:leer" },
      { a: "/tipos-bebida", texto: "Tipos de bebida", icono: "liquor", permiso: "bebidas:leer" },
    ],
  },
  {
    titulo: "Mesas",
    icono: "table_restaurant",
    descripcion: "Gestión de mesas y pedidos",
    resumen: "Control de mesas y comandas",
    opciones: [
      { a: "/mesas", texto: "Mesas", icono: "table_restaurant", permiso: "mesas:leer", pie: { titulo: "Mesas", descripcion: "Gestión de mesas" } }],
  },

  {
    titulo: "Comandas",
    icono: "receipt_long",
    descripcion: "Gestión de comandas",
    resumen: "Control de pedidos y facturación",
    opciones: [
      { a: "/comandas", texto: "Comandas", icono: "receipt_long", permiso: "comandas:leer", pie: { titulo: "Comandas", descripcion: "Gestión de pedidos" } },
    ],
  },
  
  {
    titulo: "Finanzas",
    inicio: "/finanzas",
    icono: "payments",
    descripcion: "Caja, gastos y ventas",
    resumen: "Cajas, gastos, ventas y métodos de pago",
    opciones: [
      { a: "/finanzas/cajas", texto: "Cajas", icono: "point_of_sale", permiso: "caja:leer" },
      { a: "/finanzas/gastos", texto: "Gastos", icono: "money_off", permiso: "caja:leer" },
      { a: "/finanzas/ventas", texto: "Ventas", icono: "sell", permiso: "ventas:leer" },
      { a: "/finanzas/categorias-gasto", texto: "Categorías de gasto", icono: "label", permiso: "caja:leer" },
      { a: "/finanzas/metodos-pago", texto: "Métodos de pago", icono: "credit_card", permiso: "caja:leer" },
    ],
  },
  {
    titulo: "Empleados",
    inicio: "/personal",
    icono: "groups",
    descripcion: "Gestión de personal",
    resumen: "Gestiona el personal del restaurante",
    opciones: [
      { a: "/empleados", texto: "Listado", icono: "badge", permiso: "empleados:leer" },
      { a: "/asistencias", texto: "Asistencia", icono: "event_available", permiso: "empleados:leer" },
      { a: "/turnos", texto: "Turnos", icono: "schedule", permiso: "empleados:leer" },
      { a: "/cargos", texto: "Cargos", icono: "work", permiso: "cargos:leer" },
      { a: "/permisos", texto: "Permisos", icono: "verified_user", permiso: "cargos:leer" },
    ],
  },
  {
    titulo: "Reportes",
    icono: "bar_chart",
    descripcion: "Estadísticas y análisis",
    resumen: "Ventas, estadísticas y auditoría",
    opciones: [
      { a: "/reportes", texto: "Reportes", icono: "bar_chart", permiso: "reportes:leer", pie: { titulo: "Reportes", descripcion: "Estadísticas y análisis" } },
      { a: "/auditoria", texto: "Auditoría", icono: "history", permiso: "auditoria:leer", pie: { titulo: "Auditoría", descripcion: "Historial de movimientos" } },
    ],
  },
];

const CUENTA = { titulo: "Sistema", icono: "person", descripcion: "Panel principal del sistema", opciones: [] };
const INICIO = { titulo: "Sistema", icono: "home", descripcion: "Panel principal del sistema", opciones: [] };

// Grupo y opción del menú a los que pertenece una ruta (para el ícono y el pie de página)
export function ubicar(ruta) {
  if (ruta.startsWith("/cuenta")) return { grupo: CUENTA, opcion: null };
  const deModulo = MENU.find((g) => g.inicio === ruta);
  if (deModulo) return { grupo: deModulo, opcion: null };
  let mejor = { grupo: INICIO, opcion: null };
  let largo = 0;
  for (const grupo of MENU) {
    for (const opcion of grupo.opciones) {
      const coincide = ruta === opcion.a || ruta.startsWith(`${opcion.a}/`);
      if (coincide && opcion.a.length > largo) {
        mejor = { grupo, opcion };
        largo = opcion.a.length;
      }
    }
  }
  return mejor;
}
