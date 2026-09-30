import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { reducirEscudo, LADO_MAX_ESCUDO } from '../src/utils/escudo.utils.js';

async function pngDataUrl(width, height) {
  const buffer = await sharp({ create: { width, height, channels: 4, background: { r: 200, g: 30, b: 30, alpha: 0.5 } } })
    .png({ compressionLevel: 0 })
    .toBuffer();
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function medidas(dataUrl) {
  return sharp(Buffer.from(dataUrl.split(',')[1], 'base64')).metadata();
}

describe('Utilidad reducirEscudo', () => {
  it('reduce una imagen grande al lado máximo conservando proporción y transparencia', async () => {
    const original = await pngDataUrl(800, 400);
    const reducido = await reducirEscudo(original);

    expect(reducido.length).toBeLessThan(original.length);
    const meta = await medidas(reducido);
    expect(meta.width).toBe(LADO_MAX_ESCUDO);
    expect(meta.height).toBe(LADO_MAX_ESCUDO / 2);
    expect(meta.hasAlpha).toBe(true);
  });

  it('deja igual una imagen que ya es pequeña', async () => {
    const original = await pngDataUrl(64, 64);
    expect(await reducirEscudo(original)).toBe(original);
  });

  it('deja igual lo que no es una imagen raster en base64', async () => {
    expect(await reducirEscudo(null)).toBe(null);
    expect(await reducirEscudo('https://ejemplo.com/escudo.png')).toBe('https://ejemplo.com/escudo.png');
    const svg = 'data:image/svg+xml;base64,PHN2Zy8+';
    expect(await reducirEscudo(svg)).toBe(svg);
  });

  it('devuelve el original si la imagen está corrupta', async () => {
    const roto = 'data:image/png;base64,AAAAAAAA';
    expect(await reducirEscudo(roto)).toBe(roto);
  });
});
