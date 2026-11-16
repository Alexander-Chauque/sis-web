// Plano del local de Los Cardones (el mismo de la versión Django, ventas/plano_salon.py).
// Las posiciones están en el dibujo original y se pasan a porcentajes del lienzo.

// Parte del plano que se dibuja (x, y, ancho, alto)
const LIENZO = { x: 190, y: 140, ancho: 1810, alto: 425 };
const MESA_LADO = 54;
const PILAR_DIAMETRO = 36;

export const PROPORCION = `${LIENZO.ancho} / ${LIENZO.alto}`;

export function posicion(x, y, ancho, alto) {
  return {
    left: `${((x - LIENZO.x) * 100) / LIENZO.ancho}%`,
    top: `${((y - LIENZO.y) * 100) / LIENZO.alto}%`,
    width: `${(ancho * 100) / LIENZO.ancho}%`,
    height: `${(alto * 100) / LIENZO.alto}%`,
  };
}

export const ZONAS = [
  { nombre: "Patio", x: 196, y: 168, ancho: 172, alto: 380, clase: "zona-patio" },
  { nombre: "Salón", x: 397, y: 155, ancho: 1228, alto: 405, clase: "zona-salon" },
  { nombre: "Cocina y servicios", x: 1627, y: 155, ancho: 363, alto: 405, clase: "zona-servicio" },
];

export const ELEMENTOS = [
  { nombre: "Escenario", x: 839, y: 453, ancho: 308, alto: 81, clase: "elemento-destacado" },
  { nombre: "Barra de caja", x: 1310, y: 217, ancho: 199, alto: 64, clase: "elemento-destacado" },
  { nombre: "Barra de tragos", x: 1566, y: 288, ancho: 59, alto: 152, clase: "elemento-destacado elemento-vertical" },
  { nombre: "Vajilla", x: 1667, y: 155, ancho: 185, alto: 53, clase: "" },
  { nombre: "Depósito 2", x: 1889, y: 155, ancho: 99, alto: 98, clase: "" },
  { nombre: "Emplatados", x: 1662, y: 271, ancho: 145, alto: 54, clase: "" },
  { nombre: "Hornos", x: 1635, y: 363, ancho: 46, alto: 71, clase: "" },
  { nombre: "Cocinas", x: 1689, y: 363, ancho: 82, alto: 71, clase: "" },
  { nombre: "Parrilla", x: 1780, y: 363, ancho: 82, alto: 71, clase: "" },
  { nombre: "Depósito", x: 1892, y: 313, ancho: 91, alto: 90, clase: "" },
  { nombre: "Baño hombres", x: 1627, y: 444, ancho: 162, alto: 53, clase: "" },
  { nombre: "Baño de cocina", x: 1789, y: 444, ancho: 201, alto: 53, clase: "" },
  { nombre: "Baño damas", x: 1753, y: 497, ancho: 181, alto: 63, clase: "" },
];

export const PILARES = [
  [640, 199],
  [966, 199],
  [640, 299],
  [966, 299],
  [1246, 299],
  [640, 534],
  [1328, 534],
].map(([x, y]) => posicion(x - PILAR_DIAMETRO / 2, y - PILAR_DIAMETRO / 2, PILAR_DIAMETRO, PILAR_DIAMETRO));

const fila = (numeros, xs, y, capacidades) =>
  numeros.map((numero, i) => ({ numero, capacidad: capacidades[i], pos: posicion(xs[i], y, MESA_LADO, MESA_LADO) }));

// Mesas: número, lugares y posición
export const MESAS = [
  // Patio
  ...fila([5, 6], [206, 297], 182, [4, 4]),
  ...fila([7, 8], [206, 297], 291, [4, 4]),
  ...fila([9], [206], 381, [4]),
  ...fila([10, 12], [206, 306], 481, [4, 4]),
  // Salón, fila de arriba
  ...fila([1, 2, 3, 4, 11, 13, 14, 15], [468, 549, 694, 785, 857, 1002, 1084, 1156], 173, Array(8).fill(4)),
  // Salón, segunda fila
  ...fila([16], [468], 254, [2]),
  ...fila([17, 18, 19, 20, 21, 22], [694, 776, 857, 1002, 1084, 1156], 263, [3, 2, 2, 3, 2, 2]),
  // Salón, a la izquierda del escenario
  ...fila([23, 24, 25, 26, 27], [413, 486, 558, 658, 731], 417, [4, 4, 4, 4, 6]),
  ...fila([28, 29, 30, 31, 32], [413, 486, 558, 658, 731], 489, Array(5).fill(4)),
  // Salón, a la derecha del escenario
  ...fila([33, 34, 35, 36, 37], [1183, 1256, 1364, 1427, 1491], 417, [6, 4, 4, 4, 4]),
  ...fila([38, 39, 40, 41, 42], [1183, 1256, 1364, 1427, 1491], 489, [4, 4, 4, 4, 6]),
];
