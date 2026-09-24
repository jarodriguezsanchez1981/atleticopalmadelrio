import { describe, it, expect } from 'vitest';
import { parsearActa, normalizarNombre } from '../src/utils/rfafActa.js';

/** HTML mínimo con la misma estructura que usa RFAF en NFG_CmpPartido,
 * pero con datos inventados (no son personas reales). Cubre: goles de un
 * jugador de cada equipo (uno de ellos en propia puerta, que no debe
 * contarse), tarjeta amarilla y roja de jugadores, y una tarjeta de un
 * miembro del cuerpo técnico (no debe aparecer como jugador). */
const HTML_EJEMPLO = `
<html><body>
<div class="dashboard-stat">
  <div class="details">
    <div class="number">Goles</div>
    <div class="desc">
      <table class="table"><tbody>
        <tr><td><i class="fa-solid fa-futbol" style="color: #0fa020;"></i></td>
            <td><span class="font-blue">(10')</span> PEREZ GOMEZ, JUAN </td></tr>
        <tr><td><i class="fa-solid fa-futbol" style="color: rgb(21, 114, 228);"></i></td>
            <td><span class="font-blue">(20')</span> PEREZ GOMEZ, JUAN </td></tr>
        <tr><td><i class="fa-solid fa-futbol" style="color: red;"></i></td>
            <td><span class="font-blue">(30')</span> LOPEZ RUIZ, ALVARO </td></tr>
        <tr><td><i class="fa-solid fa-futbol" style="color: #0fa020;"></i></td>
            <td><span class="font-blue">(40')</span> GARCIA TORRES, MANUEL </td></tr>
      </tbody></table>
    </div>
  </div>
</div>
<div class="dashboard-stat">
  <div class="details">
    <div class="number">EQUIPO PRUEBA C.F. </div>
    <div class="desc">
      <h5><strong>Titulares</strong></h5>
      <table class="table"><tbody>
        <tr><td>7</td><td><img class="fotojug"></td><td>PEREZ GOMEZ, JUAN</td></tr>
        <tr><td>4</td><td><img class="fotojug"></td><td>LOPEZ RUIZ, ALVARO</td></tr>
      </tbody></table>
      <h5><strong>Suplentes</strong></h5>
      <table class="table"><tbody>
        <tr><td>15</td><td><img class="fotojug"></td><td>MARTINEZ DIAZ, SERGIO</td></tr>
      </tbody></table>
      <h4>Tarjetas</h4>
      <table class="table"><tbody>
        <tr><td><img src="https://files.rfaf.es/.../tarj_amar.gif"></td>
            <td><span class="font-blue">(35')</span> LOPEZ RUIZ, ALVARO </td></tr>
        <tr><td><img src="https://files.rfaf.es/.../tarj_roja.gif"></td>
            <td><span class="font-blue">(88')</span> MARTINEZ DIAZ, SERGIO </td></tr>
        <tr><td><img src="https://files.rfaf.es/.../tarj_amar.gif"></td>
            <td><span class="font-blue">(50')</span> ENTRENADOR APELLIDO, TECNICO </td></tr>
      </tbody></table>
    </div>
  </div>
</div>
<div class="dashboard-stat">
  <div class="details">
    <div class="number">OTRO EQUIPO C.F. </div>
    <div class="desc">
      <h5><strong>Titulares</strong></h5>
      <table class="table"><tbody>
        <tr><td>9</td><td><img class="fotojug"></td><td>GARCIA TORRES, MANUEL</td></tr>
      </tbody></table>
      <h5><strong>Suplentes</strong></h5>
      <table class="table"><tbody></tbody></table>
      <h4>Tarjetas</h4>
      <table class="table"><tbody></tbody></table>
    </div>
  </div>
</div>
</body></html>
`;

describe('rfafActa · normalizarNombre', () => {
  it('quita acentos, comas y mayúsculas/minúsculas', () => {
    expect(normalizarNombre('Pérez Gómez, Juan')).toBe('PEREZ GOMEZ JUAN');
  });
});

describe('rfafActa · parsearActa', () => {
  it('lanza si no encuentra al equipo pedido', () => {
    expect(() => parsearActa(HTML_EJEMPLO, 'EQUIPO QUE NO EXISTE')).toThrow();
  });

  it('extrae titulares y suplentes del equipo pedido', () => {
    const { jugadores } = parsearActa(HTML_EJEMPLO, 'EQUIPO PRUEBA C.F.');
    expect(jugadores).toHaveLength(3);
    expect(jugadores.find((j) => j.nombreNormalizado === 'PEREZ GOMEZ JUAN')).toMatchObject({ dorsal: 7, titular: true });
    expect(jugadores.find((j) => j.nombreNormalizado === 'MARTINEZ DIAZ SERGIO')).toMatchObject({ dorsal: 15, titular: false });
  });

  it('cuenta goles normales y de penalti, pero no los goles en propia puerta', () => {
    const { jugadores } = parsearActa(HTML_EJEMPLO, 'EQUIPO PRUEBA C.F.');
    const perez = jugadores.find((j) => j.nombreNormalizado === 'PEREZ GOMEZ JUAN');
    const lopez = jugadores.find((j) => j.nombreNormalizado === 'LOPEZ RUIZ ALVARO');
    expect(perez.goles).toBe(2); // gol normal + penalti
    expect(lopez.goles).toBe(0); // el suyo fue en propia puerta
  });

  it('no atribuye a un jugador el gol de un rival', () => {
    const { jugadores } = parsearActa(HTML_EJEMPLO, 'EQUIPO PRUEBA C.F.');
    expect(jugadores.some((j) => j.nombreNormalizado === 'GARCIA TORRES MANUEL')).toBe(false);
  });

  it('cuenta tarjetas amarillas y rojas de jugadores, ignorando las del cuerpo técnico', () => {
    const { jugadores } = parsearActa(HTML_EJEMPLO, 'EQUIPO PRUEBA C.F.');
    const lopez = jugadores.find((j) => j.nombreNormalizado === 'LOPEZ RUIZ ALVARO');
    const martinez = jugadores.find((j) => j.nombreNormalizado === 'MARTINEZ DIAZ SERGIO');
    expect(lopez.tarjeta_amarilla).toBe(1);
    expect(lopez.tarjeta_roja).toBe(0);
    expect(martinez.tarjeta_roja).toBe(1);
    // La amarilla del "entrenador" no debe sumarse a ningún jugador.
    const totalAmarillas = jugadores.reduce((acc, j) => acc + j.tarjeta_amarilla, 0);
    expect(totalAmarillas).toBe(1);
  });

  it('el otro equipo no interfiere con los datos del primero', () => {
    const { jugadores } = parsearActa(HTML_EJEMPLO, 'OTRO EQUIPO C.F.');
    expect(jugadores).toHaveLength(1);
    expect(jugadores[0].nombreNormalizado).toBe('GARCIA TORRES MANUEL');
    expect(jugadores[0].goles).toBe(1);
  });
});
