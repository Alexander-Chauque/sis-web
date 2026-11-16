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
import { ELEMENTOS, MESAS, PILARES, PROPORCION, posicion, ZONAS } from "./planoSalon";

const MAXIMO = 999;
const clave = (item) => `${item.tipo}-${item.id}`;

// Notas rápidas por tipo de producto; las opuestas se reemplazan entre sí
const NOTAS = {
  plato: ["sin sal", "sin cebolla", "bien cocido", "jugoso", "sin picante"],
  bebida: ["sin hielo", "con hielo", "natural", "con limón"],
};
const OPUESTAS = { "sin hielo": "con hielo", "con hielo": "sin hielo", "bien cocido": "jugoso", jugoso: "bien cocido" };
const partesNota = (texto) =>
  texto
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
const tieneNota = (texto, nota) => partesNota(texto).some((p) => p.toLowerCase() === nota);

function alternarNota(texto, nota) {
  let lista = partesNota(texto);
  if (tieneNota(texto, nota)) {
    lista = lista.filter((p) => p.toLowerCase() !== nota);
  } else {
    const opuesta = OPUESTAS[nota];
    if (opuesta) lista = lista.filter((p) => p.toLowerCase() !== opuesta);
    lista.push(nota);
  }
  return lista.join(", ").slice(0, 120);
}

// Cada línea del carrito tiene su propia clave: el mismo producto puede ir en dos líneas con notas distintas
let siguienteLinea = 1;
const nuevaLinea = (datos) => ({ ...datos, linea: siguienteLinea++ });

const iniciales = (nombre = "") =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

// Mozos: un botón por mozo, se elige con un toque
function ElegirMozo({ mozos, elegido, onElegir }) {
  if (!mozos) return <Cargando />;
  return (
    <fieldset className="elegir-mozo">
      <legend className="form-label">Mozo</legend>
      <div className="mozos-opciones">
        {mozos.map((m) => (
          <label key={m.id} className="mozo-opcion" title={m.cargo}>
            <input type="radio" name="mozo" value={m.id} checked={String(m.id) === String(elegido)} onChange={() => onElegir(String(m.id))} />
            <span className="mozo-iniciales" aria-hidden="true">
              {iniciales(m.nombre)}
            </span>
            {m.nombre}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
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
  const mozos = useCarga("/comandas/mozos/");

  if (productos.cargando || comanda.cargando) return <Cargando />;
  const error = productos.error || comanda.error;
  if (error) return <Alerta>{error}</Alerta>;
  if (comanda.datos && !comanda.datos.esta_abierta) {
    return <Alerta tipo="warning">La comanda #{id} está cerrada: no se puede editar.</Alerta>;
  }
  // El editor se crea recién con los datos cargados: así arranca con lo que ya tenía la comanda
  return <Editor id={id} productos={productos.datos} mesas={mesas} comanda={comanda.datos} mozos={mozos} />;
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

// Estado de cada mesa del plano según la API
function estadoDeMesa(mesa) {
  if (!mesa) return "sin-cargar";
  if (mesa.comanda_abierta) return "ocupada";
  return mesa.estado_mesa ? "libre" : "sin-pedido";
}

// Plano del local: una mesa libre se elige con un toque; una con pedido lleva a su comanda
function PlanoMesas({ mesas, elegida, onElegir }) {
  const { puede } = useAuth();
  if (!mesas) return <Cargando />;
  const porNumero = new Map(mesas.map((m) => [m.numero_mesa, m]));
  const enPlano = new Set(MESAS.map((m) => m.numero));
  const fuera = mesas.filter((m) => !enPlano.has(m.numero_mesa) && ["libre", "sin-pedido"].includes(estadoDeMesa(m)));
  const lugares = MESAS.map((lugar) => ({ ...lugar, mesa: porNumero.get(lugar.numero), estado: estadoDeMesa(porNumero.get(lugar.numero)) }));
  const cuantas = (estado) => lugares.filter((l) => l.estado === estado).length;
  const actual = mesas.find((m) => String(m.id_mesa) === String(elegida));
  const destino = (idComanda) => (puede("comandas:modificar") ? `/comandas/${idComanda}/editar` : `/comandas/${idComanda}`);

  const boton = (mesa, texto, estado, extra = {}) => {
    const esElegida = String(mesa.id_mesa) === String(elegida);
    return (
      <button
        key={mesa.id_mesa}
        type="button"
        className={`plano-mesa plano-mesa--${estado} ${esElegida ? "plano-mesa--elegida" : ""}`}
        aria-pressed={esElegida}
        title={`Mesa ${mesa.numero_mesa}${estado === "sin-pedido" ? " · Ocupada sin pedido" : " · Libre"}`}
        onClick={() => onElegir(String(mesa.id_mesa))}
        {...extra}
      >
        {texto}
      </button>
    );
  };

  return (
    <div className="plano-elegir">
      <div className="plano-cabecera">
        <p className="plano-elegida" aria-live="polite">
          {actual ? (
            <>
              Mesa elegida: <strong>Mesa {actual.numero_mesa} · {actual.ubicacion_nombre}</strong>
            </>
          ) : (
            "Tocá una mesa libre del plano."
          )}
        </p>
        <ul className="plano-leyenda">
          <li>
            <span className="plano-muestra plano-muestra--libre" /> Libre ({cuantas("libre")})
          </li>
          <li>
            <span className="plano-muestra plano-muestra--ocupada" /> Con pedido ({cuantas("ocupada")})
          </li>
          {cuantas("sin-pedido") > 0 && (
            <li>
              <span className="plano-muestra plano-muestra--sin-pedido" /> Ocupada sin pedido ({cuantas("sin-pedido")})
            </li>
          )}
          <li>
            <span className="plano-muestra plano-muestra--elegida" /> Elegida
          </li>
        </ul>
      </div>

      <div className="plano-desplazable">
        <div className="plano" style={{ aspectRatio: PROPORCION }}>
          {ZONAS.map((z) => (
            <div key={z.nombre} className={`plano-zona ${z.clase}`} style={posicion(z.x, z.y, z.ancho, z.alto)}>
              <span className="plano-zona-nombre">{z.nombre}</span>
            </div>
          ))}
          {ELEMENTOS.map((e) => (
            <div key={e.nombre} className={`plano-elemento ${e.clase}`} style={posicion(e.x, e.y, e.ancho, e.alto)} aria-hidden="true">
              <span>{e.nombre}</span>
            </div>
          ))}
          {PILARES.map((pos, i) => (
            <div key={i} className="plano-pilar" style={pos} aria-hidden="true" />
          ))}
          {lugares.map((l) => {
            const texto = (
              <>
                <strong>{l.numero}</strong>
                <small>{l.capacidad} p.</small>
              </>
            );
            if (l.estado === "libre" || l.estado === "sin-pedido") {
              return boton(l.mesa, texto, l.estado, { style: l.pos, "aria-label": `Mesa ${l.numero}, ${l.capacidad} lugares` });
            }
            if (l.estado === "ocupada") {
              return (
                <Link
                  key={l.numero}
                  to={destino(l.mesa.comanda_abierta)}
                  className="plano-mesa plano-mesa--ocupada"
                  style={l.pos}
                  title={`Mesa ${l.numero} · Comanda #${l.mesa.comanda_abierta}`}
                  aria-label={`Mesa ${l.numero}, con pedido: abrir la comanda ${l.mesa.comanda_abierta}`}
                >
                  {texto}
                </Link>
              );
            }
            return (
              <div key={l.numero} className="plano-mesa plano-mesa--sin-cargar" style={l.pos} title={`Mesa ${l.numero} · No está cargada`}>
                {texto}
              </div>
            );
          })}
        </div>
      </div>

      {fuera.length > 0 && (
        <div className="plano-fuera">
          <span>Fuera del plano:</span>
          {fuera.map((m) => boton(m, `Mesa ${m.numero_mesa}`, estadoDeMesa(m)))}
        </div>
      )}
    </div>
  );
}

function Editor({ id, productos, mesas, comanda, mozos }) {
  const esEdicion = !!id;
  const { usuario } = useAuth();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();

  const [mesa, setMesa] = useState(parametros.get("mesa") || "");
  // Por defecto, el que está usando el sistema (o el mozo que ya tenía la comanda)
  const [mozo, setMozo] = useState(String((esEdicion ? comanda.mozo_id : usuario?.id_empleado) ?? ""));
  const [observaciones, setObservaciones] = useState(comanda?.observaciones_comanda || "");
  // [{linea, tipo, id, nombre, precio, cantidad, nota}]
  const [pedido, setPedido] = useState(() =>
    (comanda?.items || []).map(({ tipo: t, id: i, nombre, precio, cantidad, observacion }) =>
      nuevaLinea({ tipo: t, id: i, nombre, precio, cantidad, nota: observacion || "" }),
    ),
  );
  const [buscar, setBuscar] = useState("");
  const [tipo, setTipo] = useState("todos");
  // Categoría de plato o tipo de bebida elegido en la segunda fila ("" = todas)
  const [categoria, setCategoria] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Con pagos, la web solo permite agregar: se recuerda lo mínimo de cada producto (sumando sus líneas)
  const minimos = useMemo(() => {
    if (!comanda?.pagos.length) return {};
    const suma = {};
    comanda.items.forEach((i) => {
      suma[clave(i)] = (suma[clave(i)] || 0) + i.cantidad;
    });
    return suma;
  }, [comanda]);
  const totalDe = (lista, k) => lista.filter((i) => clave(i) === k).reduce((s, i) => s + i.cantidad, 0);

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

  const total = pedido.reduce((suma, i) => suma + Number(i.precio) * i.cantidad, 0);

  // Suma uno a la línea del producto que no tiene nota; si no hay, abre una línea nueva
  const agregar = (producto) =>
    setPedido((actual) => {
      const existe = actual.find((i) => clave(i) === clave(producto) && !i.nota);
      if (existe) return actual.map((i) => (i === existe ? { ...i, cantidad: Math.min(MAXIMO, i.cantidad + 1) } : i));
      return [...actual, nuevaLinea({ tipo: producto.tipo, id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, nota: "" })];
    });

  // ¿Se puede bajar esta línea a esa cantidad sin quedar debajo de lo ya cobrado?
  const permitido = (item, cantidad) => {
    const minimo = minimos[clave(item)] || 0;
    return totalDe(pedido, clave(item)) - item.cantidad + cantidad >= minimo;
  };

  const cambiarCantidad = (item, cantidad) => {
    if (!permitido(item, Math.max(cantidad, 0))) return;
    if (cantidad < 1) {
      setPedido((actual) => actual.filter((i) => i.linea !== item.linea));
      return;
    }
    setPedido((actual) => actual.map((i) => (i.linea === item.linea ? { ...i, cantidad: Math.min(MAXIMO, cantidad) } : i)));
  };

  const cambiarNota = (item, nota) => setPedido((actual) => actual.map((i) => (i.linea === item.linea ? { ...i, nota } : i)));

  // Separa una unidad en otra línea, para darle otra nota (ej: 2 con hielo y 1 sin hielo)
  const separar = (item) =>
    setPedido((actual) => {
      const lugar = actual.findIndex((i) => i.linea === item.linea);
      const nueva = nuevaLinea({ ...item, cantidad: 1, nota: "" });
      const copia = actual.map((i) => (i.linea === item.linea ? { ...i, cantidad: i.cantidad - 1 } : i));
      copia.splice(lugar + 1, 0, nueva);
      return copia;
    });

  const guardar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (!esEdicion && !mesa) return setError("Elegí una mesa.");
    if (!pedido.length) return setError("Agregá al menos un plato o una bebida.");
    const cuerpo = {
      observaciones: observaciones.trim(),
      items: pedido.map(({ tipo: t, id: i, cantidad, nota }) => ({ tipo: t, id: i, cantidad, observacion: nota.trim() })),
      ...(mozo ? { mozo: Number(mozo) } : {}),
    };
    setGuardando(true);
    try {
      const { data } = esEdicion ? await api.patch(`/comandas/${id}/`, cuerpo) : await api.post("/comandas/", { ...cuerpo, mesa: Number(mesa) });
      // Como en Django: se imprime el ticket y después se vuelve al listado
      navegar(`/comandas/${data.id_comanda}/tickets?imprimir=1`);
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
      <Notificar texto={error || mesas.error || mozos.error} onListo={() => setError("")} />
      {!!Object.keys(minimos).length && (
        <Alerta tipo="info">Esta comanda tiene pagos: podés agregar productos, pero no quitar ni reducir los que ya tenía.</Alerta>
      )}

      {!esEdicion && (
        <Tarjeta icono="table_restaurant" titulo="Mesa" className="tarjeta-plano">
          <PlanoMesas mesas={mesas.datos} elegida={mesa} onElegir={setMesa} />
        </Tarjeta>
      )}

      <div className="comanda-layout">
        <div className="comanda-izquierda">
          <Tarjeta icono="receipt_long" titulo="Datos del pedido">
            {esEdicion && (
              <div className="mb-3">
                <span className="form-label d-block">Mesa</span>
                <div className="mesa-fija">
                  <Icono nombre="table_restaurant" /> Mesa {comanda.mesa_numero}
                </div>
              </div>
            )}

            <ElegirMozo mozos={mozos.datos} elegido={mozo} onElegir={setMozo} />

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
                  <li key={item.linea} className="item-carrito">
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold text-truncate">{item.nombre}</div>
                      <div className="small text-secondary">
                        {dinero(item.precio)} · <strong>{dinero(Number(item.precio) * item.cantidad)}</strong>
                      </div>
                    </div>
                    <div className="contador-cantidad">
                      <button type="button" aria-label={`Quitar uno de ${item.nombre}`} onClick={() => cambiarCantidad(item, item.cantidad - 1)}>
                        <Icono nombre={item.cantidad === 1 && permitido(item, 0) ? "delete" : "remove"} />
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
                    <div className="nota-linea">
                      <input
                        type="text"
                        className="form-control form-control-sm nota-item"
                        maxLength={120}
                        aria-label={`Nota para ${item.nombre}`}
                        placeholder={item.tipo === "bebida" ? "Nota para el bar (ej: sin hielo)" : "Nota para la cocina (ej: sin sal)"}
                        value={item.nota}
                        onChange={(e) => cambiarNota(item, e.target.value)}
                      />
                      <div className="notas-rapidas" role="group" aria-label={`Notas rápidas para ${item.nombre}`}>
                        {NOTAS[item.tipo].map((nota) => {
                          const activa = tieneNota(item.nota, nota);
                          return (
                            <button
                              key={nota}
                              type="button"
                              className={`nota-rapida ${activa ? "activa" : ""}`}
                              aria-pressed={activa}
                              onClick={() => cambiarNota(item, alternarNota(item.nota, nota))}
                            >
                              {nota}
                            </button>
                          );
                        })}
                      </div>
                      {item.cantidad > 1 && (
                        <button type="button" className="btn-separar" onClick={() => separar(item)}>
                          <Icono nombre="call_split" /> Separar una con otra nota
                        </button>
                      )}
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
