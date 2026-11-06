// Conexión con la API de Django. Todas las pantallas piden los datos desde acá.
import axios from "axios";

const URL_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const LLAVE_ACCESO = "sis_token_acceso";
const LLAVE_RENOVACION = "sis_token_renovacion";

// sessionStorage se borra al cerrar la pestaña, y la sesión no queda abierta en la PC
export const tokens = {
  acceso: () => sessionStorage.getItem(LLAVE_ACCESO),
  renovacion: () => sessionStorage.getItem(LLAVE_RENOVACION),
  guardar: ({ access, refresh }) => {
    sessionStorage.setItem(LLAVE_ACCESO, access);
    if (refresh) sessionStorage.setItem(LLAVE_RENOVACION, refresh);
  },
  borrar: () => {
    sessionStorage.removeItem(LLAVE_ACCESO);
    sessionStorage.removeItem(LLAVE_RENOVACION);
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
  // Django devuelve los errores así: {"detail": "..."} o {"campo": ["..."]}
  const datos = error.response.data;
  if (datos && typeof datos === "object") {
    if (datos.detail) return String(datos.detail);
    const primero = Object.values(datos)[0];
    if (primero) return Array.isArray(primero) ? String(primero[0]) : String(primero);
  }
  return "No se pudo completar la operación.";
}
