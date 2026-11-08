import { useMemo, useState } from "react";

export function usePaginaLocal(lista, claveFiltros) {
  const [porPagina, setPorPagina] = useState(10);
  const [estado, setEstado] = useState({ pagina: 1, clave: claveFiltros });
  const pagina = estado.clave === claveFiltros ? estado.pagina : 1;
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const actual = Math.min(pagina, paginas);
  const filas = useMemo(() => lista.slice((actual - 1) * porPagina, actual * porPagina), [lista, actual, porPagina]);
  return {
    filas,
    pagina: actual,
    porPagina,
    total: lista.length,
    irA: (n) => setEstado({ pagina: n, clave: claveFiltros }),
    cambiarPorPagina: (n) => {
      setPorPagina(n);
      setEstado({ pagina: 1, clave: claveFiltros });
    },
  };
}
