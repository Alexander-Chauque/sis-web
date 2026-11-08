// Ícono de Material Symbols (la misma fuente de íconos que usa la web de Django)
export function Icono({ nombre, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {nombre}
    </span>
  );
}
