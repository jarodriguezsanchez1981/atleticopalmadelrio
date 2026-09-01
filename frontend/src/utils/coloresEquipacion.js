/**
 * Paleta de colores de equipación (camiseta, calzonas, medias).
 */
export const COLORES_EQUIPACION = [
  { nombre: 'Blanco', hex: '#FFFFFF' },
  { nombre: 'Negro', hex: '#000000' },
  { nombre: 'Rojo', hex: '#D62A2A' },
  { nombre: 'Azul', hex: '#1D4ED8' },
  { nombre: 'Azul marino', hex: '#1E3A5F' },
  { nombre: 'Celeste', hex: '#7DD3FC' },
  { nombre: 'Amarillo', hex: '#FACC15' },
  { nombre: 'Verde', hex: '#15803D' },
  { nombre: 'Verde oscuro', hex: '#14532D' },
  { nombre: 'Naranja', hex: '#F97316' },
  { nombre: 'Rosa', hex: '#F472B6' },
  { nombre: 'Morado', hex: '#7C3AED' },
  { nombre: 'Violeta', hex: '#8B5CF6' },
  { nombre: 'Granate', hex: '#7A1E2B' },
  { nombre: 'Burdeos', hex: '#800020' },
  { nombre: 'Gris', hex: '#6B7280' },
  { nombre: 'Marrón', hex: '#8B5E3C' },
  { nombre: 'Turquesa', hex: '#0D9488' }
];

export const OPCIONES_COLOR = COLORES_EQUIPACION.map((c) => ({ label: c.nombre, value: c.nombre }));

const SIN_COLOR = '#9CA3AF';

export function hexColor(nombre) {
  if (!nombre) return SIN_COLOR;
  const n = String(nombre).trim().toLowerCase();
  const directo = COLORES_EQUIPACION.find((c) => c.nombre.toLowerCase() === n);
  if (directo) return directo.hex;
  const parcial = COLORES_EQUIPACION.find((c) => n.includes(c.nombre.toLowerCase()));
  return parcial ? parcial.hex : SIN_COLOR;
}
