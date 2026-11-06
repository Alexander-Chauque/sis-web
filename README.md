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
- `src/components/`: diseño general y rutas protegidas.
- `src/pages/`: una pantalla por archivo.

## Pantallas

- Login
- Panel de inicio
- Ingredientes: listar, buscar, crear, editar y cambiar estado
