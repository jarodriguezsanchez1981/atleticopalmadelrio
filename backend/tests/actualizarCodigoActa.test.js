import { describe, it, expect } from 'vitest';
import { extraerCodActa } from '../src/utils/actualizarCodigoActa.js';

function filaPartido({ equipoLocal, equipoVisitante, codActa }) {
  const enlaceActa = codActa
    ? `<a class="btn btn-success btn-sm" href="/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=${codActa}&cod_acta=${codActa}" title="Acta del partido"></a>`
    : '';
  return `<tr>
    <td><a href="NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=${equipoLocal}">Equipo local</a></td>
    <td>${enlaceActa}</td>
    <td><a href="NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=${equipoVisitante}">Equipo visitante</a></td>
  </tr>`;
}

describe('extraerCodActa', () => {
  it('encuentra el CodActa de la fila donde aparece el equipo, sea local o visitante', () => {
    const html = [
      filaPartido({ equipoLocal: '111', equipoVisitante: '222', codActa: '9001' }),
      filaPartido({ equipoLocal: '407117', equipoVisitante: '333', codActa: '9002' }),
      filaPartido({ equipoLocal: '444', equipoVisitante: '407117', codActa: '9003' })
    ].join('\n');

    expect(extraerCodActa(html, '407117')).toBe('9002');
  });

  it('devuelve null cuando el equipo aparece pero el partido no tiene acta todavía', () => {
    const html = filaPartido({ equipoLocal: '407117', equipoVisitante: '333', codActa: null });
    expect(extraerCodActa(html, '407117')).toBeNull();
  });

  it('devuelve undefined cuando el equipo no aparece en ninguna fila de la jornada', () => {
    const html = filaPartido({ equipoLocal: '111', equipoVisitante: '222', codActa: '9001' });
    expect(extraerCodActa(html, '407117')).toBeUndefined();
  });
});
