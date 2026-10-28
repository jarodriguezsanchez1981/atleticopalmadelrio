<script setup>
import { formatFechaCorta } from '../utils/formatFecha';

/** Desplegable de un jugador en Estadísticas Goles / Sanciones: los partidos en
 * que marcó (partidos_goles) o vio tarjeta (partidos_tarjetas), del listado de
 * /estadisticas. También el de Equipo Contrario (partidos en que nos marcan,
 * de /estadisticas/goles-contra). */
defineProps({
  partidos: { type: Array, default: () => [] },
  tipo: { type: String, required: true },          // 'goles' | 'sanciones'
  // Columna "Jugó de" (titular / suplente): solo donde el acta lo dice (Senior A).
  conTitular: { type: Boolean, default: true }
});

/** [12, 70] -> "12', 70'" */
function textoMinutos(minutos) {
  return minutos?.length ? minutos.map((m) => `${m}'`).join(', ') : '';
}
/** [{ minuto: 12 }, { minuto: 70, penalti: true }, { minuto: 80, propia: true }] -> "12', 70' (p), 80' (pp)" */
function textoMinutosGoles(goles) {
  return goles?.length
    ? goles.map((g) => `${g.minuto}'${g.penalti ? ' (p)' : ''}${g.propia ? ' (pp)' : ''}`).join(', ')
    : '';
}
</script>

<template>
  <div class="overflow-x-auto py-1">
    <table class="text-sm border-collapse">
      <thead>
        <tr class="text-xs text-ink-tertiary">
          <th class="text-left font-medium px-2 py-1">Jornada</th>
          <th class="text-left font-medium px-2 py-1">Fecha</th>
          <th class="text-left font-medium px-2 py-1">Rival</th>
          <template v-if="tipo === 'goles'">
            <th class="text-center font-medium px-2 py-1">Goles</th>
            <th class="text-left font-medium px-2 py-1">Minutos</th>
            <th v-if="conTitular" class="text-left font-medium px-2 py-1">Jugó de</th>
          </template>
          <template v-else>
            <th class="text-center font-medium px-2 py-1">TA</th>
            <th class="text-center font-medium px-2 py-1">TR</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in partidos" :key="p.id_partido" class="border-t border-line">
          <td class="px-2 py-1">{{ p.jornada ?? '—' }}</td>
          <td class="px-2 py-1 whitespace-nowrap">{{ formatFechaCorta(p.fecha) }}</td>
          <td class="px-2 py-1 whitespace-nowrap">{{ p.rival || '—' }} <span class="text-ink-tertiary">({{ p.es_local ? 'casa' : 'fuera' }})</span></td>
          <template v-if="tipo === 'goles'">
            <td class="px-2 py-1 text-center">{{ p.goles }}</td>
            <td class="px-2 py-1 whitespace-nowrap">{{ textoMinutosGoles(p.minutos_goles) || '—' }}</td>
            <td v-if="conTitular" class="px-2 py-1 whitespace-nowrap">{{ p.titular ? 'Titular' : 'Suplente' }}</td>
          </template>
          <template v-else>
            <td class="px-2 py-1 text-center whitespace-nowrap">
              <template v-if="p.amarillas">{{ p.amarillas }}<span v-if="textoMinutos(p.minutos_amarillas)" class="text-ink-tertiary"> · {{ textoMinutos(p.minutos_amarillas) }}</span></template>
              <template v-else>—</template>
            </td>
            <td class="px-2 py-1 text-center whitespace-nowrap">
              <template v-if="p.rojas">{{ p.rojas }}<span v-if="textoMinutos(p.minutos_rojas)" class="text-ink-tertiary"> · {{ textoMinutos(p.minutos_rojas) }}</span></template>
              <template v-else>—</template>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
