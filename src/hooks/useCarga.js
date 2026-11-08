import { useCallback, useEffect, useState } from "react";

import { api, mensajeDeError } from "../services/api";

export function useCarga(ruta, parametros) {
  // Como texto, para que un objeto nuevo con los mismos valores no repita el pedido
  const clave = JSON.stringify(parametros || {});
  const [version, setVersion] = useState(0);
  // "pedido" identifica a qué pedido corresponde lo guardado: si no es el actual, se está cargando
  const pedido = `${ruta}|${clave}|${version}`;
  const [estado, setEstado] = useState({ datos: null, error: "", pedido: null });

  useEffect(() => {
    if (!ruta) return undefined;
    // Cancela el pedido anterior
    const control = new AbortController();
    api
      .get(ruta, { params: JSON.parse(clave), signal: control.signal })
      .then((respuesta) => setEstado({ datos: respuesta.data, error: "", pedido }))
      .catch((error) => {
        if (control.signal.aborted) return;
        setEstado((anterior) => ({ ...anterior, error: mensajeDeError(error), pedido }));
      });
    return () => control.abort();
  }, [ruta, clave, pedido]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  // Permite actualizar la lista en pantalla sin volver a pedirla
  const setDatos = useCallback(
    (cambio) =>
      setEstado((anterior) => ({
        ...anterior,
        datos: typeof cambio === "function" ? cambio(anterior.datos) : cambio,
      })),
    [],
  );

  return {
    datos: estado.datos,
    error: estado.error,
    cargando: !!ruta && estado.pedido !== pedido,
    recargar,
    setDatos,
  };
}
