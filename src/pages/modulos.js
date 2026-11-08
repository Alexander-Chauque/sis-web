export const MODULOS = {
  inventario: {
    titulo: "Gestión de Inventario",
    subtitulo: "Administra los platos, las bebidas y los ingredientes del restaurante.",
    icono: "inventory_2",
    tarjetas: [
      { nombre: "Platos", texto: "Gestiona los platos del menú del restaurante.", icono: "restaurant", foto: "/img/inventario/platos.jpg", a: "/platos", permiso: "platos:leer" },
      { nombre: "Bebidas", texto: "Gestiona las bebidas disponibles.", icono: "local_bar", foto: "/img/inventario/bebidas.jpg", a: "/bebidas", permiso: "bebidas:leer" },
      { nombre: "Ingredientes", texto: "Gestiona los ingredientes e insumos de cocina.", icono: "eco", foto: "/img/inventario/ingredientes.jpg", a: "/ingredientes", permiso: "ingredientes:leer" },
    ],
  },
  empleados: {
    titulo: "Gestión de Empleados",
    subtitulo: "Administra el personal, los cargos y los permisos del sistema.",
    icono: "groups",
    tarjetas: [
      { nombre: "Empleados", texto: "Gestiona el personal del restaurante.", icono: "groups", foto: "/img/empleados/empleados.jpg", a: "/empleados", permiso: "empleados:leer" },
      { nombre: "Cargos", texto: "Define y gestiona los perfiles del sistema.", icono: "work", foto: "/img/empleados/cargos.jpg", a: "/cargos", permiso: "cargos:leer" },
      { nombre: "Permisos", texto: "Administra los permisos de cada cargo.", icono: "shield_person", foto: "/img/empleados/permisos.png", a: "/permisos", permiso: "cargos:leer" },
      { nombre: "Asistencia", texto: "Control y registro de asistencia personal.", icono: "calendar_month", foto: "/img/empleados/asistencias.jpg", a: "/asistencias", permiso: "empleados:leer" },
    ],
  },
  finanzas: {
    titulo: "Gestión de Finanzas",
    subtitulo: "Administra las finanzas del restaurante.",
    icono: "point_of_sale",
    tarjetas: [
      { nombre: "Caja", texto: "Gestiona las operaciones de caja del restaurante.", icono: "account_balance_wallet", foto: "/img/inventario/platos.jpg", a: "/finanzas/cajas", permiso: "caja:leer" },
      { nombre: "Gastos", texto: "Gestiona los gastos del restaurante.", icono: "attach_money", foto: "/img/inventario/bebidas.jpg", a: "/finanzas/gastos", permiso: "caja:leer" },
      { nombre: "Ventas", texto: "Gestiona las ventas del restaurante.", icono: "payments", foto: "/img/inventario/bebidas.jpg", a: "/finanzas/ventas", permiso: "ventas:leer" },
    ],
  },
};
