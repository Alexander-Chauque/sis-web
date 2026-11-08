// Tomar un pedido nuevo o cambiar los productos de una comanda abierta
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Encabezado } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { Icono } from "../../components/Icono";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { api, mensajeDeError } from "../../services/api";
import { dinero, normalizar } from "../../utils/formato";

const MAXIMO = 999;
const clave = (item) => `${item.tipo}-${item.id}`;
const PESTANAS = [
  { valor: "todos", texto: "Todos" },
  { valor: "plato", texto: "Platos", icono: "restaurant" },
  { valor: "bebida", texto: "Bebidas", icono: "local_drink" },
];

export default function FormularioComanda() {
  const { id } = useParams();
  const productos = useCarga("/comandas/productos/");
  const mesas = useCarga(id ? null : "/mesas/");
  const comanda = useCarga(id ? `/comandas/${id}/` : null);

  if (productos.cargando || comanda.cargando) return <Cargando />;
  const error = productos.error || comanda.error;
  if (error) return <Alerta>{error}</Alerta>;
  if (comanda.datos && !comanda.datos.esta_abierta) {
    return <Alerta tipo="warning">La comanda #{id} está cerrada: no se puede editar.</Alerta>;
  }
  // El editor se crea recién con los datos cargados: así arranca con lo que ya tenía la comanda
  return <Editor id={id} productos={productos.datos} mesas={mesas} comanda={comanda.datos} />;
}

// Tarjeta con título e ícono, como las de la pantalla de comandas de Django
function Tarjeta({ icono, titulo, extra, children, className = "" }) {
  return (
    <section className={`tarjeta-comanda ${className}`}>
      <div className="tarjeta-comanda-titulo">
        <Icono nombre={icono} />
        <h2>{titulo}</h2>
        {extra && <span className="tarjeta-comanda-extra">{extra}</span>}
      </div>
      <div className="tarjeta-comanda-cuerpo">{children}</div>
    </section>
  );
}

function Editor({ id, productos, mesas, comanda }) {
  const esEdicion = !!id;
  const { usuario } = useAuth();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();

  const [mesa, setMesa] = useState(parametros.get("mesa") || "");
  const [buscarMesa, setBuscarMesa] = useState("");
  const [observaciones, setObservaciones] = useState(comanda?.observaciones_comanda || "");
  // [{tipo, id, nombre, precio, cantidad}]
  const [pedido, setPedido] = useState(() =>
    (comanda?.items || []).map(({ tipo: t, id: i, nombre, precio, cantidad }) => ({ tipo: t, id: i, nombre, precio, cantidad })),
  );
  const [buscar, setBuscar] = useState("");
  const [tipo, setTipo] = useState("todos");
  // Categoría de plato o tipo de bebida elegido en la segunda fila ("" = todas)
  const [categoria, setCategoria] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Con pagos, la web solo permite agregar: se recuerda lo mínimo de cada producto
  const minimos = useMemo(() => {
    if (!comanda?.pagos.length) return {};
    return Object.fromEntries(comanda.items.map((i) => [clave(i), i.cantidad]));
  }, [comanda]);

  const visibles = useMemo(() => {
    const texto = normalizar(buscar.trim());
    return productos.filter(
      (p) =>
        (tipo === "todos" || p.tipo === tipo) &&
        (!categoria || p.categoria === categoria) &&
        (normalizar(p.nombre).includes(texto) || normalizar(p.categoria).includes(texto)),
    );
  }, [productos, buscar, tipo, categoria]);

  // Categorías de platos o tipos de bebida que tienen productos, como la fila de Django
  const categorias = useMemo(() => {
    if (tipo === "todos") return [];
    const nombres = new Set(productos.filter((p) => p.tipo === tipo).map((p) => p.categoria).filter(Boolean));
    return [...nombres].sort((a, b) => a.localeCompare(b));
  }, [productos, tipo]);

  // Mesas libres agrupadas por ubicación (Salón, Patio), filtradas por el número buscado
  const gruposMesas = useMemo(() => {
    const libres = (mesas.datos || []).filter((m) => m.estado_mesa && !m.comanda_abierta && String(m.numero_mesa).includes(buscarMesa.trim()));
    const grupos = new Map();
    libres.forEach((m) => {
      const nombre = m.ubicacion_nombre || "Sin ubicación";
      if (!grupos.has(nombre)) grupos.set(nombre, []);
      grupos.get(nombre).push(m);
    });
    return [...grupos.entries()];
  }, [mesas.datos, buscarMesa]);
  const mesaElegida = (mesas.datos || []).find((m) => String(m.id_mesa) === String(mesa));

  const total = pedido.reduce((suma, i) => suma + Number(i.precio) * i.cantidad, 0);

  const agregar = (producto) =>
    setPedido((actual) => {
      const existe = actual.find((i) => clave(i) === clave(producto));
      if (existe) return actual.map((i) => (i === existe ? { ...i, cantidad: Math.min(MAXIMO, i.cantidad + 1) } : i));
      return [...actual, { tipo: producto.tipo, id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }];
    });

  const cambiarCantidad = (item, cantidad) => {
    const minimo = minimos[clave(item)] || 0;
    if (cantidad < Math.max(minimo, 1)) {
      if (minimo) return;
      setPedido((actual) => actual.filter((i) => clave(i) !== clave(item)));
      return;
    }
    setPedido((actual) => actual.map((i) => (clave(i) === clave(item) ? { ...i, cantidad: Math.min(MAXIMO, cantidad) } : i)));
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (!esEdicion && !mesa) return setError("Elegí una mesa.");
    if (!pedido.length) return setError("Agregá al menos un plato o una bebida.");
    const cuerpo = {
      observaciones: observaciones.trim(),
      items: pedido.map(({ tipo: t, id: i, cantidad }) => ({ tipo: t, id: i, cantidad })),
    };
    setGuardando(true);
    try {
      const { data } = esEdicion ? await api.patch(`/comandas/${id}/`, cuerpo) : await api.post("/comandas/", { ...cuerpo, mesa: Number(mesa) });
      navegar(`/comandas/${data.id_comanda}`);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  const volver = esEdicion ? `/comandas/${id}` : "/comandas";

  return (
    <form onSubmit={guardar} className="contenedor-comanda">
      <Encabezado
        titulo={esEdicion ? `Editar comanda #${id}` : "Registrar comanda"}
        icono={esEdicion ? "edit_square" : "add"}
        volver={volver}
      />
      <Notificar texto={error || mesas.error} onListo={() => setError("")} />
      {!!Object.keys(minimos).length && (
        <Alerta tipo="info">Esta comanda tiene pagos: podés agregar productos, pero no quitar ni reducir los que ya tenía.</Alerta>
      )}

      <div className="comanda-layout">
        <div className="comanda-izquierda">
          <Tarjeta icono="receipt_long" titulo="Datos del pedido">
            <div className="mb-3">
              <span className="form-label d-block">
                Mesa <span className="req">*</span>
              </span>
              {esEdicion ? (
                <div className="mesa-fija">
                  <Icono nombre="table_restaurant" /> Mesa {comanda.mesa_numero}
                </div>
              ) : (
                <>
                  <div className="buscador-ingredientes mb-2">
                    <Icono nombre="search" />
                    <input
                      type="search"
                      inputMode="numeric"
                      placeholder="Buscar por número de mesa"
                      aria-label="Buscar mesa por número"
                      value={buscarMesa}
                      onChange={(e) => setBuscarMesa(e.target.value)}
                    />
                  </div>
                  <p className="mesa-elegida">{mesaElegida ? `Mesa ${mesaElegida.numero_mesa} · ${mesaElegida.ubicacion_nombre}` : "Todavía no elegiste una mesa."}</p>
                  {gruposMesas.map(([ubicacion, lista]) => (
                    <fieldset key={ubicacion} className="grupo-mesas">
                      <legend>{ubicacion}</legend>
                      <div className="botones-mesa">
                        {lista.map((m) => (
                          <button
                            key={m.id_mesa}
                            type="button"
                            className={`boton-mesa ${String(m.id_mesa) === String(mesa) ? "elegida" : ""}`}
                            aria-pressed={String(m.id_mesa) === String(mesa)}
                            aria-label={`Mesa ${m.numero_mesa}`}
                            onClick={() => setMesa(String(m.id_mesa))}
                          >
                            {m.numero_mesa}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                  {mesas.datos && !gruposMesas.length && <p className="small text-danger mb-0">No hay mesas disponibles{buscarMesa ? " con ese número" : ""}.</p>}
                  {!!gruposMesas.length && <p className="form-text mb-0">Mesa disponible para tomar el pedido.</p>}
                </>
              )}
            </div>

            <div className="mb-3">
              <span className="form-label d-block">Mozo</span>
              <div className="tarjeta-mozo">
                <span className="mozo-avatar">
                  <Icono nombre="person" />
                </span>
                <span>
                  <strong className="d-block">{esEdicion ? comanda.mozo : usuario?.nombre}</strong>
                  {!esEdicion && usuario?.cargo && <span className="mozo-cargo">{usuario.cargo}</span>}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="observaciones" className="form-label">
                Observaciones (opcional)
              </label>
              <textarea
                id="observaciones"
                className="form-control"
                rows={3}
                maxLength={250}
                placeholder="Ej: sin cebolla, bien cocida ..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </Tarjeta>

          <Tarjeta icono="shopping_basket" titulo="Agregar productos" extra="Seleccioná platos y bebidas para la comanda.">
            <div className="buscador-ingredientes mb-3">
              <Icono nombre="search" />
              <input type="search" placeholder="Buscar plato o bebida..." aria-label="Buscar producto" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </div>
            <div className="pestanas-productos" role="group" aria-label="Tipo de producto">
              {PESTANAS.map((p) => (
                <button
                  key={p.valor}
                  type="button"
                  className={`pestana-producto ${tipo === p.valor ? "activa" : ""}`}
                  aria-pressed={tipo === p.valor}
                  onClick={() => {
                    setTipo(p.valor);
                    setCategoria(""); // Al cambiar de pestaña vuelve a "Todas las categorías"
                  }}
                >
                  {p.icono && <Icono nombre={p.icono} />} {p.texto}
                </button>
              ))}
            </div>
            {categorias.length > 0 && (
              <div className="tabs-categorias" role="group" aria-label={tipo === "plato" ? "Categoría de plato" : "Tipo de bebida"}>
                <button type="button" className={`cat-btn ${!categoria ? "activo" : ""}`} aria-pressed={!categoria} onClick={() => setCategoria("")}>
                  {tipo === "plato" ? "Todas las categorías" : "Todos los tipos"}
                </button>
                {categorias.map((c) => (
                  <button key={c} type="button" className={`cat-btn ${categoria === c ? "activo" : ""}`} aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="grilla-productos">
              {visibles.map((p) => (
                <div key={clave(p)} className="tarjeta-producto">
                  <div className="tarjeta-producto-info">
                    <strong>{p.nombre}</strong>
                    <small>
                      {p.tipo === "plato" ? "Platos" : "Bebidas"} | {p.categoria}
                    </small>
                    <span className="tarjeta-producto-precio">{dinero(p.precio)}</span>
                  </div>
                  <button type="button" className="boton-agregar" aria-label={`Agregar ${p.nombre}`} onClick={() => agregar(p)}>
                    <Icono nombre="add" />
                  </button>
                </div>
              ))}
              {!visibles.length && <p className="text-secondary">No hay productos disponibles con esa búsqueda.</p>}
            </div>
          </Tarjeta>
        </div>

        <aside className="comanda-derecha">
          <Tarjeta icono="shopping_cart" titulo="Resumen del pedido" className="resumen-pedido">
            {!pedido.length ? (
              <div className="carrito-vacio">
                <Icono nombre="remove_shopping_cart" />
                <p>No hay productos agregados</p>
              </div>
            ) : (
              <ul className="lista-pedido">
                {pedido.map((item) => (
                  <li key={clave(item)}>
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold text-truncate">{item.nombre}</div>
                      <div className="small text-secondary">
                        {dinero(item.precio)} · <strong>{dinero(Number(item.precio) * item.cantidad)}</strong>
                      </div>
                    </div>
                    <div className="contador-cantidad">
                      <button type="button" aria-label={`Quitar uno de ${item.nombre}`} onClick={() => cambiarCantidad(item, item.cantidad - 1)}>
                        <Icono nombre={item.cantidad === 1 && !minimos[clave(item)] ? "delete" : "remove"} />
                      </button>
                      <input
                        inputMode="numeric"
                        aria-label={`Cantidad de ${item.nombre}`}
                        value={item.cantidad}
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(/\D/g, ""));
                          if (n) cambiarCantidad(item, n);
                        }}
                      />
                      <button type="button" aria-label={`Agregar uno de ${item.nombre}`} onClick={() => cambiarCantidad(item, item.cantidad + 1)}>
                        <Icono nombre="add" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="total-pedido">
              <span>Total</span>
              <strong>{dinero(total)}</strong>
            </div>
            <div className="aviso-precios">
              <Icono nombre="info" /> Los precios se calculan automáticamente.
            </div>
            <div className="acciones-pedido">
              <Link className="btn btn-outline-secondary" to={volver}>
                Cancelar
              </Link>
              <button type="submit" className="btn btn-marca" disabled={guardando}>
                {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear comanda"}
              </button>
            </div>
          </Tarjeta>
        </aside>
      </div>
    </form>
  );
}
