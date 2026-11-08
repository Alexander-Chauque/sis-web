// Listado de gastos
import { useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { CabeceraDetalle, Subtarjeta, Subtarjetas } from "../../components/Detalle";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { api, mensajeDeError } from "../../services/api";
import { dinero, fechaHora, montoValido, textoMonto } from "../../utils/formato";

function FormularioGasto({ gasto, categorias, onCerrar, onGuardado }) {
  const [descripcion, setDescripcion] = useState(gasto?.descripcion_gasto || "");
  const [monto, setMonto] = useState(gasto ? String(Number(gasto.monto_gasto)) : "");
  const [categoria, setCategoria] = useState(gasto ? String(gasto.categoria) : "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError("");
    if (!descripcion.trim()) return setError("La descripción es obligatoria.");
    if (!montoValido(monto)) return setError("El monto debe ser un número mayor que cero, con hasta 2 decimales.");
    if (!categoria) return setError("Seleccioná una categoría.");
    const cuerpo = { descripcion_gasto: descripcion.trim(), monto_gasto: textoMonto(monto), cat_gasto: Number(categoria) };
    setGuardando(true);
    try {
      if (gasto) await api.patch(`/gastos/${gasto.id_gasto}/`, cuerpo);
      else await api.post("/gastos/", cuerpo);
      onGuardado();
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  const opciones = categorias.filter((c) => c.estado_categoria_gasto || String(c.id_categoria_gasto) === categoria);

  return (
    <Modal titulo={gasto ? "Editar gasto" : "Registrar gasto"} onCerrar={onCerrar} onEnviar={guardar} enviando={guardando}>
      <Alerta>{error}</Alerta>
      <Campo id="gasto-descripcion" etiqueta="Descripción *">
        <input id="gasto-descripcion" className="form-control" required placeholder="Ej. Compra de lavandina" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
      <div className="row g-3">
        <Campo id="gasto-monto" etiqueta="Monto *" prefijo="$" className="col-6">
          <input id="gasto-monto" className="form-control" inputMode="decimal" required value={monto} onChange={(e) => setMonto(e.target.value)} />
        </Campo>
        <Campo id="gasto-categoria" etiqueta="Categoría *" className="col-6">
          <select id="gasto-categoria" className="form-select" required value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Elegí</option>
            {opciones.map((c) => (
              <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>
                {c.nombre_categoria_gasto}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {!opciones.length && (
        <p className="small text-danger mb-0">
          No hay categorías de gasto activas. Creá una en <Link to="/finanzas/categorias-gasto">Categorías de gasto</Link>.
        </p>
      )}
    </Modal>
  );
}

export default function Gastos() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const [borrador, setBorrador] = useState("");
  const [filtros, setFiltros] = useState({ buscar: "", pagina: 1, por_pagina: 10 });
  const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
  const gastos = useCarga("/gastos/", consulta);
  const categorias = useCarga("/categorias-gasto/");
  const [formulario, setFormulario] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const datos = gastos.datos;

  const eliminar = async (g) => {
    if (!await confirmar(`¿Eliminar el gasto "${g.descripcion_gasto}" de ${dinero(g.monto_gasto)}?`)) return;
    setError("");
    try {
      await api.delete(`/gastos/${g.id_gasto}/`);
      setAviso("El gasto se eliminó correctamente.");
      gastos.recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  const alGuardar = () => {
    setAviso("El gasto se guardó correctamente.");
    setFormulario(null);
    gastos.recargar();
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Gastos" subtitulo="Administra los gastos registrados." icono="attach_money">
        {puede("caja:leer") && (
          <Link className="btn btn-outline-secondary" to="/finanzas/categorias-gasto">
            <Icono nombre="category" /> Categorías de gastos
          </Link>
        )}
        {puede("caja:escribir") && datos?.caja_abierta && (
          <button type="button" className="btn btn-marca" disabled={!categorias.datos} onClick={() => setFormulario({ nuevo: true })}>
            <Icono nombre="add" /> Nuevo gasto
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || gastos.error} onListo={() => setError("")} />
      {datos &&
        (datos.caja_abierta ? (
          <Alerta tipo="info">
            Los gastos nuevos se registran en la <Link to={`/finanzas/cajas/${datos.caja_abierta}`}>caja #{datos.caja_abierta}</Link>.
          </Alerta>
        ) : (
          <Alerta tipo="warning">
            No hay una caja abierta. <Link to="/finanzas/cajas">Abrí una caja</Link> antes de registrar gastos.
          </Alerta>
        ))}

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros((f) => ({ ...f, buscar: borrador.trim(), pagina: 1 }))}
            onLimpiar={() => {
              setBorrador("");
              setFiltros((f) => ({ ...f, buscar: "", pagina: 1 }));
            }}
          >
            <FiltroBuscar id="buscar-gasto" etiqueta="Descripción o categoría" valor={borrador} onCambiar={setBorrador} placeholder="Ej. limpieza..." />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={filtros.por_pagina} onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, pagina: 1 }))} />
        {!datos ? (
          gastos.cargando && <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">N.º gasto</th>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Empleado</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className={gastos.cargando ? "opacity-50" : ""}>
                {datos.resultados.map((g) => (
                  <tr key={g.id_gasto}>
                    <td className="fw-semibold">#{g.id_gasto}</td>
                    <td className="text-nowrap">{fechaHora(g.fecha_hora_gasto)}</td>
                    <td>{g.categoria_nombre}</td>
                    <td>{g.descripcion_gasto}</td>
                    <td>{g.empleado}</td>
                    <td className="text-nowrap">{dinero(g.monto_gasto)}</td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="ver" titulo={`Ver el gasto #${g.id_gasto}`} onClick={() => setDetalle(g)} />
                        {puede("caja:modificar") && (
                          <BotonAccion
                            tipo="editar"
                            titulo={`Modificar el gasto #${g.id_gasto}`}
                            disabled={!categorias.datos}
                            onClick={() => (g.caja_abierta ? setFormulario(g) : setError("No se pueden modificar gastos de una caja cerrada."))}
                          />
                        )}
                        {puede("caja:eliminar") && (
                          <BotonAccion
                            tipo="eliminar"
                            titulo={`Eliminar el gasto #${g.id_gasto}`}
                            onClick={() => (g.caja_abierta ? eliminar(g) : setError("No se pueden eliminar gastos de una caja cerrada."))}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!datos.resultados.length && <Vacio columnas={7}>No hay gastos para mostrar.</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        {datos && (
          <PaginacionNumeros pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} nombre="gastos" onPagina={(p) => setFiltros((f) => ({ ...f, pagina: p }))} />
        )}
      </ListadoLayout>

      {formulario && categorias.datos && (
        <FormularioGasto gasto={formulario.nuevo ? null : formulario} categorias={categorias.datos} onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />
      )}
      {detalle && (
        <Modal titulo="Detalle del gasto" icono="attach_money" onCerrar={() => setDetalle(null)} grande>
          <CabeceraDetalle etiqueta={`Gasto N.º ${detalle.id_gasto}`} titulo={detalle.descripcion_gasto} />
          <Subtarjetas>
            <Subtarjeta icono="payments" etiqueta="Monto" destacada>
              {dinero(detalle.monto_gasto)}
            </Subtarjeta>
            <Subtarjeta icono="category" etiqueta="Categoría">
              {detalle.categoria_nombre}
            </Subtarjeta>
            <Subtarjeta icono="schedule" etiqueta="Fecha y hora">
              {fechaHora(detalle.fecha_hora_gasto)}
            </Subtarjeta>
            <Subtarjeta icono="person" etiqueta="Empleado">
              {detalle.empleado}
            </Subtarjeta>
            <Subtarjeta icono="point_of_sale" etiqueta="Caja">
              <Link to={`/finanzas/cajas/${detalle.caja}`}>#{detalle.caja}</Link>
            </Subtarjeta>
          </Subtarjetas>
        </Modal>
      )}
    </div>
  );
}
