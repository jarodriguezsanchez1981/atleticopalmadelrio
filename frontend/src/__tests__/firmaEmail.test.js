import { describe, it, expect } from 'vitest';
import { generarFirmaHtml, URL_ESCUDO, NOMBRE_CLUB } from '../utils/firmaEmail.js';

describe('firmaEmail · generarFirmaHtml', () => {
  it('incluye los datos, el club y el escudo por URL pública', () => {
    const html = generarFirmaHtml({ nombre: 'Ana López', cargo: 'Coordinadora', telefono: '600 11 22 33', email: 'ana@club.es', web: 'www.club.es' });
    expect(html).toContain('Ana López');
    expect(html).toContain('Coordinadora');
    expect(html).toContain(NOMBRE_CLUB);
    expect(html).toContain(`src="${URL_ESCUDO}"`);
    expect(html).toContain('href="tel:600112233"');
    expect(html).toContain('href="mailto:ana@club.es"');
    expect(html).toContain('href="https://www.club.es"');
  });

  it('escapa el texto escrito para que no se pueda inyectar HTML', () => {
    const html = generarFirmaHtml({ nombre: '<script>alert(1)</script>', cargo: '"><img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('solo admite colores hexadecimales', () => {
    const html = generarFirmaHtml({ nombre: 'A', colorPrincipal: 'red;background:url(x)' });
    expect(html).not.toContain('url(x)');
    expect(html).toContain('#0F3D22');
  });

  it('sin escudo ni aviso legal no los incluye', () => {
    const html = generarFirmaHtml({ nombre: 'A', mostrarEscudo: false, mostrarAviso: false });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('RGPD');
  });

  it('muestra el icono y el enlace solo de las redes rellenadas', () => {
    const html = generarFirmaHtml({ nombre: 'A', instagram: '@palma', twitter: 'https://x.com/palma' });
    // Instagram por nombre de usuario (sin la @) y Twitter por enlace completo.
    expect(html).toContain('href="https://instagram.com/palma"');
    expect(html).toContain('redes/instagram.png');
    expect(html).toContain('alt="Instagram"');
    expect(html).toContain('href="https://x.com/palma"');
    expect(html).toContain('redes/twitter.png');
    // Las no rellenadas no aparecen.
    expect(html).not.toContain('redes/facebook.png');
    expect(html).not.toContain('redes/youtube.png');
  });

  it('sin ninguna red social no añade la línea de iconos', () => {
    const html = generarFirmaHtml({ nombre: 'A' });
    expect(html).not.toContain('redes/');
  });
});
