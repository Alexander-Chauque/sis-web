# Los Cardones: web en React

Frontend web del sistema. Usa la API de Django (`MiSistemaSIS`) y sus datos de MySQL.

## Cómo ejecutarlo

1. Iniciar MySQL desde XAMPP.
2. Iniciar Django, desde la carpeta `MiSistemaSIS`:

   ```
   python manage.py runserver
   ```

3. Iniciar la web, desde esta carpeta:

   ```
   npm install
   npm run dev
   ```

4. Abrir <http://localhost:5173> y entrar con el usuario o correo de un empleado.

La dirección del backend se configura en `.env`, a partir de `.env.example`.

## Organización

- `src/services/api.js`: conexión con Django. Agrega el token y lo renueva cuando vence.
- `src/context/AuthContext.jsx`: sesión y permisos del usuario.
- `src/hooks/useCarga.js`: pide datos a la API y avisa si está cargando o falló.
- `src/components/`: diseño general, menú (`menu.js`), rutas protegidas y piezas comunes (`Comunes.jsx`).
- `src/utils/formato.js`: montos, fechas y exportación a CSV.
- `src/pages/`: una carpeta por módulo, igual que el sistema de Django.

Cada opción del menú y cada botón se muestran según los permisos del cargo.
Django vuelve a comprobar el permiso en cada pedido, así que ocultar un botón es solo comodidad.

## Pantallas

- **Inicio**: resumen del salón y accesos rápidos.
- **Inventario**: platos (con sus ingredientes), bebidas, ingredientes, categorías de platos y tipos de bebida.
- **Mesas y Comandas**: mesas (alta, edición, ocupar y liberar) y comandas (tomar pedido, editar, cambiar estado,
  cobrar total o parcial, anular, eliminar, comprobante y tickets de cocina, bar y parrilla).
- **Finanzas**: cajas (apertura, arqueo y cierre), gastos, ventas, categorías de gasto y métodos de pago.
- **Personal**: empleados (alta, edición, baja, reactivación y contraseña temporal), asistencias, turnos,
  cargos con sus permisos y el listado de permisos.
- **Control**: reportes (ventas, más vendidos, categorías, mozos y métodos de pago, con CSV e impresión)
  y auditoría (con filtros y CSV).
- **Mi cuenta**: perfil, cambio de contraseña y mis permisos.
- **Login**: con usuario o correo. Si la contraseña es temporal, pide una nueva antes de entrar.
  "¿Olvidaste tu contraseña?" abre la recuperación por correo de Django.
