// Guarda quién inició sesión y qué puede hacer, para usarlo en cualquier pantalla.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, configurarVencimiento, tokens } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Si ya hay un token, primero hay que consultar quién es el usuario
  const [cargando, setCargando] = useState(() => !!tokens.acceso());

  const cerrarSesion = useCallback(() => {
    tokens.borrar();
    setUsuario(null);
  }, []);

  useEffect(() => {
    configurarVencimiento(() => setUsuario(null));
    if (!tokens.acceso()) return;
    api
      .get("/yo/")
      .then((respuesta) => setUsuario(respuesta.data))
      .catch(() => cerrarSesion())
      .finally(() => setCargando(false));
  }, [cerrarSesion]);

  const iniciarSesion = useCallback(async (identificador, contrasena) => {
    const respuesta = await api.post("/token/", {
      username: identificador,
      password: contrasena,
    });
    tokens.guardar(respuesta.data);
    try {
      const yo = await api.get("/yo/");
      setUsuario(yo.data);
    } catch (error) {
      tokens.borrar();
      throw error;
    }
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      iniciarSesion,
      cerrarSesion,
      // Ejemplo: puede("ingredientes:escribir")
      puede: (permiso) => !!usuario?.permisos.includes(permiso),
    }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
