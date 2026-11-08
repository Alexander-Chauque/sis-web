// Cargos y permisos
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Cargando } from "../../components/Cargando";
import { Alerta, Campo, Encabezado, Modal, Vacio } from "../../components/Comunes";
import { Notificar } from "../../components/Mensajes";
import { CabeceraDetalle, SeccionDetalle, Subtarjeta, Subtarjetas } from "../../components/Detalle";
import { Icono } from "../../components/Icono";
import { BotonAccion, CabeceraResultados, FiltroBuscar, FiltroCasillas, ListadoLayout, PaginacionNumeros, PanelFiltros } from "../../components/Listado";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useConfirmar } from "../../hooks/useConfirmar";
import { usePaginaLocal } from "../../hooks/usePaginaLocal";
import { api, mensajeDeError } from "../../services/api";
import { dinero, montoValido, normalizar, textoMonto } from "../../utils/formato";

function FormularioCargo({ cargo, onCerrar, onGuardado }) {
  const [nombre, setNombre] = useState(cargo?.nombre_cargo || "");
  const [descripcion, setDescripcion] = useState(cargo?.descripcion_cargo || "");
  const [nivel, setNivel] = useState(cargo ? String(cargo.nivel_acceso) : "1");
  const [sueldo, setSueldo] = useState(cargo ? String(Number(cargo.sueldo_cargo)) : "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError("");
    if (!nombre.trim()) return setError("Ingresá el nombre del cargo.");
    if (!/^\d+$/.test(nivel)) return setError("El nivel de acceso debe ser un número entero.");
    if (!montoValido(sueldo, { permitirCero: true })) return setError("Ingresá un sueldo válido.");
    const cuerpo = { nombre_cargo: nombre.trim(), descripcion_cargo: descripcion.trim(), nivel_acceso: Number(nivel), sueldo_cargo: textoMonto(sueldo) };
    setGuardando(true);
    try {
      const { data } = cargo ? await api.patch(`/cargos/${cargo.id_cargo}/`, cuerpo) : await api.post("/cargos/", cuerpo);
      onGuardado(data, !cargo);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={cargo ? `Editar cargo ${cargo.nombre_cargo}` : "Nuevo cargo"} onCerrar={onCerrar} onEnviar={guardar} enviando={guardando}>
      <Alerta>{error}</Alerta>
      <Campo id="cargo-nombre" etiqueta="Nombre *">
        <input id="cargo-nombre" className="form-control" maxLength={100} required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>
      <div className="row g-3">
        <Campo id="cargo-nivel" etiqueta="Nivel de acceso *" className="col-6 mb-3" ayuda="Solo gestionás cargos de nivel menor al tuyo. 5 o más es administrador.">
          <input id="cargo-nivel" type="number" min={1} className="form-control" required value={nivel} onChange={(e) => setNivel(e.target.value)} />
        </Campo>
        <Campo id="cargo-sueldo" etiqueta="Sueldo *" prefijo="$" className="col-6 mb-3">
          <input id="cargo-sueldo" className="form-control" inputMode="decimal" required value={sueldo} onChange={(e) => setSueldo(e.target.value)} />
        </Campo>
      </div>
      <Campo id="cargo-descripcion" etiqueta="Descripción (opcional)" className="mb-0">
        <textarea id="cargo-descripcion" className="form-control" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
    </Modal>
  );
}

// Matriz de módulos por acciones
function AsignarPermisos({ cargo, catalogo, onCerrar, onGuardado }) {
  const { puede } = useAuth();
  const detalle = useCarga(`/cargos/${cargo.id_cargo}/`);
  const [elegidos, setElegidos] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const actuales = useMemo(() => new Set(detalle.datos?.permisos || []), [detalle.datos]);
  const marcados = elegidos || actuales;
  const porClave = useMemo(() => Object.fromEntries(catalogo.permisos.map((p) => [`${p.modulo}:${p.accion}`, p])), [catalogo]);

  const alternar = (id) => {
    const nuevo = new Set(marcados);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    setElegidos(nuevo);
  };

  const guardar = async () => {
    setError("");
    setGuardando(true);
    try {
      await api.post(`/cargos/${cargo.id_cargo}/permisos/`, { permisos: [...marcados] });
      onGuardado(marcados.size);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={`Permisos de ${cargo.nombre_cargo}`} onCerrar={onCerrar} onEnviar={detalle.datos ? guardar : undefined} enviando={guardando} grande>
      <Alerta>{error || detalle.error}</Alerta>
      {!catalogo.es_administrador && <p className="small text-secondary">Solo podés dar permisos que vos tenés. Quitar sí está permitido.</p>}
      {detalle.cargando ? (
        <Cargando />
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle text-center mb-0">
            <thead>
              <tr>
                <th scope="col" className="text-start">Módulo</th>
                {catalogo.acciones.map((a) => (
                  <th scope="col" key={a.valor}>{a.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalogo.modulos.map((m) => (
                <tr key={m.valor}>
                  <th scope="row" className="text-start fw-normal">{m.nombre}</th>
                  {catalogo.acciones.map((a) => {
                    const permiso = porClave[`${m.valor}:${a.valor}`];
                    if (!permiso) return <td key={a.valor} className="text-secondary" title="Este permiso no existe todavía">—</td>;
                    const id = permiso.id_tipo_permiso;
                    // Sin el permiso propio, solo se puede quitar
                    const bloqueado = !catalogo.es_administrador && !actuales.has(id) && !puede(`${m.valor}:${a.valor}`);
                    return (
                      <td key={a.valor}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          aria-label={`${m.nombre}: ${a.nombre}`}
                          checked={marcados.has(id)}
                          disabled={bloqueado}
                          onChange={() => alternar(id)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

const SIN_NIVEL_CARGO = "No podés gestionar un cargo con un nivel de acceso igual o superior al tuyo.";

// Permisos que ya tiene un cargo, solo para mirar
function VerPermisos({ cargo, catalogo, onCerrar }) {
  const detalle = useCarga(`/cargos/${cargo.id_cargo}/`);
  const nombres = useMemo(() => {
    const ids = new Set(detalle.datos?.permisos || []);
    return catalogo.permisos.filter((p) => ids.has(p.id_tipo_permiso));
  }, [detalle.datos, catalogo]);

  return (
    <Modal titulo="Permisos del cargo" icono="verified_user" onCerrar={onCerrar} grande>
      <Alerta>{detalle.error}</Alerta>
      <CabeceraDetalle etiqueta="Nombre del cargo" titulo={cargo.nombre_cargo} />
      <Subtarjetas>
        <Subtarjeta icono="military_tech" etiqueta="Nivel de acceso" destacada>
          {cargo.nivel_acceso}
        </Subtarjeta>
        <Subtarjeta icono="payments" etiqueta="Sueldo">
          {dinero(cargo.sueldo_cargo)}
        </Subtarjeta>
        <Subtarjeta icono="groups" etiqueta="Empleados">
          {cargo.total_empleados}
        </Subtarjeta>
      </Subtarjetas>
      <div className="mt-4">
        <SeccionDetalle
          icono="verified_user"
          titulo="Permisos asignados"
          extra={<span className="contador-seleccionados">{cargo.nivel_acceso >= 5 ? "Todos" : `${nombres.length} permisos`}</span>}
        >
          {detalle.cargando ? (
            <Cargando />
          ) : cargo.nivel_acceso >= 5 ? (
            <p className="mb-0">Es un cargo de administrador: tiene todos los permisos.</p>
          ) : nombres.length ? (
            <table className="tabla-detalle">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Módulo</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {nombres.map((p, n) => (
                  <tr key={p.id_tipo_permiso}>
                    <td className="text-secondary">{n + 1}</td>
                    <td>
                      <span className="celda-con-icono">
                        <Icono nombre="shield_person" className="icono-naranja" />
                        {p.modulo_nombre}
                      </span>
                    </td>
                    <td>{p.accion_nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-secondary mb-0">Este cargo todavía no tiene permisos.</p>
          )}
        </SeccionDetalle>
      </div>
    </Modal>
  );
}

export default function Cargos() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const cargos = useCarga("/cargos/");
  const catalogo = useCarga("/permisos/");
  const [borrador, setBorrador] = useState("");
  const [buscar, setBuscar] = useState("");
  const [formulario, setFormulario] = useState(null);
  const [asignando, setAsignando] = useState(null);
  const [viendo, setViendo] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const lista = useMemo(() => cargos.datos || [], [cargos.datos]);
  const filtrados = useMemo(() => {
    const texto = normalizar(buscar.trim());
    return lista.filter((c) => normalizar(c.nombre_cargo).includes(texto) || normalizar(c.descripcion_cargo).includes(texto));
  }, [lista, buscar]);
  const paginado = usePaginaLocal(filtrados, buscar);
  const reemplazar = (cargo) => cargos.setDatos((l) => l.map((c) => (c.id_cargo === cargo.id_cargo ? cargo : c)));

  const eliminar = async (cargo) => {
    if (!await confirmar(`¿Eliminar el cargo "${cargo.nombre_cargo}"?`)) return;
    setError("");
    try {
      await api.delete(`/cargos/${cargo.id_cargo}/`);
      cargos.setDatos((l) => l.filter((c) => c.id_cargo !== cargo.id_cargo));
      setAviso(`Se eliminó el cargo "${cargo.nombre_cargo}".`);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Cargos" subtitulo="Administra los cargos y niveles de acceso del sistema.">
        {puede("empleados:leer") && (
          <Link className="btn btn-outline-secondary" to="/empleados">
            <Icono nombre="arrow_back" /> Volver a Empleados
          </Link>
        )}
        {puede("cargos:escribir") && (
          <button type="button" className="btn btn-marca" onClick={() => setFormulario({ nuevo: true })}>
            <Icono nombre="add" /> Nuevo cargo
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || cargos.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setBuscar(borrador)}
            onLimpiar={() => {
              setBorrador("");
              setBuscar("");
            }}
          >
            <FiltroBuscar id="buscar-cargo" valor={borrador} onCambiar={setBorrador} placeholder="Nombre del cargo..." />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {cargos.cargando ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Nivel</th>
                  <th scope="col">Sueldo</th>
                  <th scope="col">Permisos</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((c) => (
                  <tr key={c.id_cargo}>
                    <td className="fw-semibold">{c.nombre_cargo}</td>
                    <td className="text-secondary">{c.descripcion_cargo || "—"}</td>
                    <td>{c.nivel_acceso}</td>
                    <td className="text-nowrap">{dinero(c.sueldo_cargo)}</td>
                    <td>
                      <span className="badge text-bg-success">{c.nivel_acceso >= 5 ? "Todos" : `${c.total_permisos} permisos`}</span>
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <BotonAccion tipo="eliminar" icono="visibility" titulo={`Ver permisos de ${c.nombre_cargo}`} disabled={!catalogo.datos} onClick={() => setViendo(c)} />
                        {puede("cargos:modificar") && (
                          <>
                            <BotonAccion
                              tipo="ver"
                              icono="admin_panel_settings"
                              titulo={`Asignar permisos a ${c.nombre_cargo}`}
                              disabled={!catalogo.datos}
                              onClick={() => (c.gestionable ? setAsignando(c) : setError(SIN_NIVEL_CARGO))}
                            />
                            <BotonAccion tipo="editar" titulo={`Modificar ${c.nombre_cargo}`} onClick={() => (c.gestionable ? setFormulario(c) : setError(SIN_NIVEL_CARGO))} />
                          </>
                        )}
                        {puede("cargos:eliminar") && (
                          <BotonAccion
                            tipo="desactivar"
                            icono="delete"
                            titulo={`Eliminar ${c.nombre_cargo}`}
                            onClick={() => {
                              if (!c.gestionable) setError(SIN_NIVEL_CARGO);
                              else if (c.total_empleados > 0) setError(`No se puede eliminar el cargo "${c.nombre_cargo}" porque tiene empleados asignados.`);
                              else eliminar(c);
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && <Vacio columnas={6}>{lista.length ? "Ningún cargo coincide con la búsqueda." : "Todavía no hay cargos."}</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre="cargos" onPagina={paginado.irA} />
      </ListadoLayout>

      {formulario && (
        <FormularioCargo
          cargo={formulario.nuevo ? null : formulario}
          onCerrar={() => setFormulario(null)}
          onGuardado={(cargo, esNuevo) => {
            if (esNuevo) cargos.setDatos((l) => [...l, cargo].sort((a, b) => a.nombre_cargo.localeCompare(b.nombre_cargo)));
            else reemplazar(cargo);
            setAviso(`Se guardó el cargo "${cargo.nombre_cargo}".`);
            setFormulario(null);
          }}
        />
      )}
      {asignando && catalogo.datos && (
        <AsignarPermisos
          cargo={asignando}
          catalogo={catalogo.datos}
          onCerrar={() => setAsignando(null)}
          onGuardado={(total) => {
            reemplazar({ ...asignando, total_permisos: total });
            setAviso(`Se actualizaron los permisos de "${asignando.nombre_cargo}".`);
            setAsignando(null);
          }}
        />
      )}
      {viendo && catalogo.datos && <VerPermisos cargo={viendo} catalogo={catalogo.datos} onCerrar={() => setViendo(null)} />}
    </div>
  );
}

const FILTROS_PERMISOS = { buscar: "", modulos: [], acciones: [] };

function NuevoPermiso({ datos, onCerrar, onCreado }) {
  const [modulo, setModulo] = useState("");
  const [accion, setAccion] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const crear = async () => {
    setError("");
    if (!modulo || !accion) return setError("Elegí el módulo y la acción.");
    setEnviando(true);
    try {
      const { data } = await api.post("/permisos/", { modulo, accion });
      onCreado(data);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Nuevo permiso" onCerrar={onCerrar} onEnviar={crear} enviando={enviando} textoEnviar="Crear permiso">
      <Alerta>{error}</Alerta>
      <Campo id="perm-modulo" etiqueta="Módulo *">
        <select id="perm-modulo" className="form-select" value={modulo} onChange={(e) => setModulo(e.target.value)}>
          <option value="">Elegí</option>
          {datos.modulos.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.nombre}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="perm-accion" etiqueta="Acción *" className="mb-0">
        <select id="perm-accion" className="form-select" value={accion} onChange={(e) => setAccion(e.target.value)}>
          <option value="">Elegí</option>
          {datos.acciones.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.nombre}
            </option>
          ))}
        </select>
      </Campo>
    </Modal>
  );
}

export function Permisos() {
  const { puede } = useAuth();
  const confirmar = useConfirmar();
  const catalogo = useCarga("/permisos/");
  const [borrador, setBorrador] = useState(FILTROS_PERMISOS);
  const [filtros, setFiltros] = useState(FILTROS_PERMISOS);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const datos = catalogo.datos;
  const filtrados = useMemo(() => {
    const texto = normalizar(filtros.buscar.trim());
    return (datos?.permisos || []).filter((p) => {
      if (filtros.modulos.length && !filtros.modulos.includes(p.modulo)) return false;
      if (filtros.acciones.length && !filtros.acciones.includes(p.accion)) return false;
      return [p.modulo_nombre, p.accion_nombre, p.descripcion].some((v) => normalizar(v).includes(texto));
    });
  }, [datos, filtros]);
  const paginado = usePaginaLocal(filtrados, JSON.stringify(filtros));

  const eliminar = async (permiso) => {
    if (!await confirmar(`¿Eliminar el permiso ${permiso.modulo_nombre} - ${permiso.accion_nombre}? Se quitará de todos los cargos.`)) return;
    setError("");
    try {
      await api.delete(`/permisos/${permiso.id_tipo_permiso}/`);
      catalogo.setDatos((d) => ({ ...d, permisos: d.permisos.filter((p) => p.id_tipo_permiso !== permiso.id_tipo_permiso) }));
      setAviso("Permiso eliminado.");
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  return (
    <div className="contenedor-listado">
      <Encabezado titulo="Permisos" subtitulo="Administra los permisos del sistema por módulo y acción." icono="shield_person">
        {puede("empleados:leer") && (
          <Link className="btn btn-outline-secondary" to="/empleados">
            <Icono nombre="arrow_back" /> Volver a Empleados
          </Link>
        )}
        {datos && puede("cargos:escribir") && (
          <button type="button" className="btn btn-marca" onClick={() => setCreando(true)}>
            <Icono nombre="add" /> Nuevo permiso
          </button>
        )}
      </Encabezado>
      <Notificar tipo="success" texto={aviso} onListo={() => setAviso("")} />
      <Notificar texto={error || catalogo.error} onListo={() => setError("")} />

      <ListadoLayout
        filtros={
          <PanelFiltros
            onAplicar={() => setFiltros(borrador)}
            onLimpiar={() => {
              setBorrador(FILTROS_PERMISOS);
              setFiltros(FILTROS_PERMISOS);
            }}
          >
            <FiltroBuscar id="buscar-permiso" valor={borrador.buscar} onCambiar={(v) => setBorrador({ ...borrador, buscar: v })} placeholder="Módulo o acción..." />
            <FiltroCasillas
              titulo="Módulo"
              largo
              opciones={(datos?.modulos || []).map((m) => ({ valor: m.valor, texto: m.nombre }))}
              elegidos={borrador.modulos}
              onCambiar={(v) => setBorrador({ ...borrador, modulos: v })}
            />
            <FiltroCasillas
              titulo="Acción"
              todos="Todas"
              opciones={(datos?.acciones || []).map((a) => ({ valor: a.valor, texto: a.nombre }))}
              elegidos={borrador.acciones}
              onCambiar={(v) => setBorrador({ ...borrador, acciones: v })}
            />
          </PanelFiltros>
        }
      >
        <CabeceraResultados porPagina={paginado.porPagina} onPorPagina={paginado.cambiarPorPagina} />
        {catalogo.cargando ? (
          <Cargando />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Módulo</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginado.filas.map((p) => (
                  <tr key={p.id_tipo_permiso}>
                    <td className="fw-semibold">{p.modulo_nombre}</td>
                    <td>{p.accion_nombre}</td>
                    <td className="text-secondary">{p.descripcion || `Permite ${p.accion_nombre.toLowerCase()} en ${p.modulo_nombre}.`}</td>
                    <td>
                      <div className="acciones-tabla">
                        {puede("cargos:eliminar") || datos?.es_administrador ? (
                          <BotonAccion
                            tipo="eliminar"
                            titulo={`Eliminar el permiso ${p.modulo_nombre} - ${p.accion_nombre}`}
                            onClick={() => (datos?.es_administrador ? eliminar(p) : setError("Solo un administrador puede eliminar permisos."))}
                          />
                        ) : (
                          <span className="small text-secondary">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && <Vacio columnas={4}>{datos?.permisos.length ? "Ningún permiso coincide con los filtros." : "Todavía no hay permisos."}</Vacio>}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionNumeros pagina={paginado.pagina} porPagina={paginado.porPagina} total={paginado.total} nombre="permisos" onPagina={paginado.irA} />
      </ListadoLayout>

      {creando && datos && (
        <NuevoPermiso
          datos={datos}
          onCerrar={() => setCreando(false)}
          onCreado={(data) => {
            catalogo.setDatos((d) => ({ ...d, permisos: [...d.permisos, data] }));
            setAviso(`Permiso creado: ${data.modulo_nombre} - ${data.accion_nombre}. Asignalo a un cargo desde Cargos.`);
            setCreando(false);
          }}
        />
      )}
    </div>
  );
}
