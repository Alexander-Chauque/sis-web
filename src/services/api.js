// Conexión con la API de Django
import axios from "axios";

export const URL_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
const LLAVE_ACCESO = "sis_token_acceso";
const LLAVE_RENOVACION = "sis_token_renovacion";
const LLAVE_RECORDAR = "sis_recordar";

// Con "Recordar sesión" los datos quedan en el navegador (localStorage); si no, se borran al cerrarlo
function almacen() {
  try {
    return localStorage.getItem(LLAVE_RECORDAR) === "1" ? localStorage : sessionStorage;
  } catch {
    return sessionStorage;
  }
}

export const tokens = {
  acceso: () => almacen().getItem(LLAVE_ACCESO),
  renovacion: () => almacen().getItem(LLAVE_RENOVACION),
  guardar: ({ access, refresh }) => {
    almacen().setItem(LLAVE_ACCESO, access);
    if (refresh) almacen().setItem(LLAVE_RENOVACION, refresh);
  },
  borrar: () => {
    for (const lugar of [sessionStorage, localStorage]) {
      try {
        lugar.removeItem(LLAVE_ACCESO);
        lugar.removeItem(LLAVE_RENOVACION);
      } catch {
        // Sin almacenamiento: no hay nada que borrar
      }
    }
    try {
      localStorage.removeItem(LLAVE_RECORDAR);
    } catch {
      // Sin almacenamiento
    }
  },
  // Se llama al iniciar sesión, antes de guardar los datos
  recordar: (si) => {
    try {
      if (si) localStorage.setItem(LLAVE_RECORDAR, "1");
      else localStorage.removeItem(LLAVE_RECORDAR);
    } catch {
      // Sin almacenamiento: la sesión dura hasta cerrar el navegador
    }
  },
};

export const api = axios.create({ baseURL: `${URL_BASE}/api`, timeout: 15000 });

// AuthContext indica acá qué hacer cuando la sesión ya no se puede renovar
let alVencerSesion = () => {};
export const configurarVencimiento = (funcion) => {
  alVencerSesion = funcion;
};

// Agrega el token a cada pedido
api.interceptors.request.use((config) => {
  const token = tokens.acceso();
  if (token) config.headers.Authorization = `JWT ${token}`;
  return config;
});

// Si varios pedidos fallan a la vez, todos esperan la misma renovación
let renovacionEnCurso = null;

function renovarToken() {
  if (!renovacionEnCurso) {
    renovacionEnCurso = axios
      .post(`${URL_BASE}/api/token/refresh/`, { refresh: tokens.renovacion() })
      .then((respuesta) => tokens.guardar(respuesta.data))
      .finally(() => {
        renovacionEnCurso = null;
      });
  }
  return renovacionEnCurso;
}

// Si el token venció, lo renueva y repite el pedido una sola vez
api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    const pedido = error.config;
    const esLogin = pedido?.url?.startsWith("/token/");
    if (error.response?.status !== 401 || esLogin || pedido?._reintentado) {
      if (error.response?.status === 401 && !esLogin) {
        tokens.borrar();
        alVencerSesion();
      }
      throw error;
    }
    pedido._reintentado = true;
    try {
      if (!tokens.renovacion()) throw error;
      await renovarToken();
    } catch {
      tokens.borrar();
      alVencerSesion();
      throw error;
    }
    return api(pedido);
  },
);

// Convierte cualquier error en un mensaje listo para mostrar en pantalla
export function mensajeDeError(error) {
  if (!error.response) return "No se pudo conectar con el servidor.";
  if (error.response.status === 429) {
    return "Demasiados intentos. Esperá un minuto y volvé a probar.";
  }
  // Django devuelve los errores en un objeto con campos y mensajes, o un campo detail con el mensaje
  const datos = error.response.data;
  if (datos && typeof datos === "object") {
    if (datos.detail) return String(datos.detail);
    const primero = Object.values(datos)[0];
    if (primero) return Array.isArray(primero) ? String(primero[0]) : String(primero);
  }
  return "No se pudo completar la operación.";
}
