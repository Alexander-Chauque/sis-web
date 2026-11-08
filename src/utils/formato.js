// Funciones para mostrar datos: textos, montos, fechas y archivos CSV.

// Quita mayúsculas y acentos para que "azucar" también encuentre "Azúcar"
export const normalizar = (texto) =>
  String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Ejemplo: 1500 -> $ 1.500,00
export const dinero = (valor) =>
  `$ ${Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Django envía las fechas como "2026-11-07" o "2026-11-07T13:45:00-03:00"
const aFecha = (valor) => {
  if (!valor) return null;
  // Una fecha sola se toma como día local: new Date("2026-11-07") sería el día anterior en Argentina
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split("-").map(Number);
    return new Date(anio, mes - 1, dia);
  }
  return new Date(valor);
};

export const fecha = (valor) => aFecha(valor)?.toLocaleDateString("es-AR") ?? "—";

export const fechaHora = (valor) => {
  const f = aFecha(valor);
  if (!f) return "—";
  return `${f.toLocaleDateString("es-AR")} ${f.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

// Fecha local en formato AAAA-MM-DD, el que usan los campos de tipo fecha
export const fechaISO = (f = new Date()) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

export const primeroDelMes = () => {
  const hoy = new Date();
  return fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
};

// Acepta la coma decimal que suele usarse en Argentina. Devuelve el texto listo para enviar.
export const textoMonto = (texto) => String(texto ?? "").trim().replace(",", ".");

export const montoValido = (texto, { permitirCero = false } = {}) => {
  const limpio = textoMonto(texto);
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return false;
  return permitirCero ? Number(limpio) >= 0 : Number(limpio) > 0;
};

// Descarga una tabla como CSV. Usa ";" y BOM para que Excel en español la abra bien.
export function descargarCSV(nombreArchivo, encabezados, filas) {
  const celda = (valor) => {
    const texto = String(valor ?? "");
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = [encabezados, ...filas].map((fila) => fila.map(celda).join(";")).join("\r\n");
  const archivo = new Blob([`﻿${contenido}`], { type: "text/csv;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export const ESTADOS_COMANDA = {
  pendiente: { nombre: "Pendiente", color: "text-bg-warning" },
  en_preparacion: { nombre: "En preparación", color: "text-bg-info" },
  entregado: { nombre: "Entregado", color: "text-bg-primary" },
  pagado: { nombre: "Pagado", color: "text-bg-success" },
  cancelado: { nombre: "Cancelado", color: "text-bg-secondary" },
  anulado: { nombre: "Anulado", color: "text-bg-danger" },
};

// La regla de contraseñas de Django (empleados/forms.py)
export const AYUDA_CLAVE = "Al menos 8 caracteres, con una mayúscula, un número y un carácter especial.";

// Cantidades para el selector "Mostrar N registros" de los listados
export const OPCIONES_POR_PAGINA = [10, 25, 50, 100];

// Platos, bebidas e ingredientes: se eliminan recién 2 meses después de marcarlos no disponibles.
// Devuelve el motivo por el que todavía no se puede eliminar, o "" si ya se puede.
export function motivoParaNoEliminar(producto, nombre, activo, femenino = false) {
  if (activo) {
    return `No se puede eliminar "${nombre}": primero marcal${femenino ? "a" : "o"} como no disponible. Se podrá eliminar 2 meses después.`;
  }
  const desde = aFecha(producto.eliminable_desde);
  if (!desde || desde > new Date()) {
    const cuando = producto.fecha_desactivacion ? ` desde el ${fecha(producto.fecha_desactivacion)}` : "";
    const plazo = desde ? `a partir del ${fecha(producto.eliminable_desde)}` : `2 meses después de desactivarl${femenino ? "a" : "o"}`;
    return `No se puede eliminar "${nombre}": está no disponible${cuando}. Se podrá eliminar ${plazo}.`;
  }
  return "";
}

// Ventana de confirmación para anular una comanda (lista y detalle), con los textos de Django
export const opcionesAnularComanda = (comanda) => ({
  titulo: "¿Anular la comanda?",
  subtitulo: "La comanda quedará anulada y la mesa se liberará.",
  icono: "warning",
  tono: "peligro",
  peligro: true,
  resumen: {
    nombre: `Comanda #${comanda.id_comanda}`,
    detalle: `Mesa ${comanda.mesa_numero} · ${comanda.mozo} · ${dinero(comanda.total_comanda)}`,
    estado: { texto: comanda.estado_nombre, activo: true },
  },
  motivo: { etiqueta: "Motivo de la anulación", placeholder: "Ej.: el cliente se retiró, error en el pedido, cambio de mesa, etc." },
  importante: ["Se liberará la mesa asociada.", "Se anularán todos los ítems de la comanda.", { texto: "Esta acción no se puede deshacer.", fuerte: true }],
  textoConfirmar: "Sí, anular comanda",
  iconoConfirmar: "delete",
});
