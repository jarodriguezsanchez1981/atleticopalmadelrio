<script setup>
import { ref, computed, watch } from 'vue';
import { partidosService } from '../services';

/** Estadísticas de los jugadores de un partido (los que han jugado, y aparte
 * los que no), incidencias y observaciones, para la vista del partido
 * (calendarios y ficha de Jornadas), debajo de los escudos con los goles.
 * El partido se pide al abrirla; sin permiso de Partidos no se ven los
 * jugadores, y las incidencias/observaciones salen de los datos del evento. */
const props = defineProps({
  evento: { type: Object, required: true }
});

const partido = ref(null);
const cargando = ref(false);

const idPartido = computed(() => props.evento?.base_id ?? Number(String(props.evento?.id || '').split('-').pop()));

watch(idPartido, async (id) => {
  partido.value = null;
  if (!id) return;
  cargando.value = true;
  try {
    partido.value = await partidosService.obtener(id);
  } catch {
    partido.value = null;
  } finally {
    cargando.value = false;
  }
}, { immediate: true });

function nombre(pj) {
  const p = pj.jugador || pj.equipoJugador;
  return p ? `${p.nombre} ${p.apellidos}` : '—';
}

/** Titulares primero, luego los que entran (por minuto) y al final los que no juegan. */
function orden(pj) {
  if (pj.titular === true || pj.titular === 1) return [0, 0];
  if (pj.minuto_entrada != null) return [1, pj.minuto_entrada];
  if (pj.titular === false || pj.titular === 0) return [2, 0];
  return [1, 0];
}

const equipos = computed(() => {
  const jugadores = partido.value?.partidoJugadores || [];
  const conMinutos = jugadores.some((pj) => pj.minutos != null);
  return [
    { clave: 'local', nombre: props.evento?.equipoLocal?.nombre || partido.value?.equipoLocal?.nombre || 'Local', esLocal: true },
    { clave: 'visitante', nombre: props.evento?.equipoVisitante?.nombre || partido.value?.equipoVisitante?.nombre || 'Visitante', esLocal: false }
  ].map((eq) => {
    const delEquipo = jugadores
      .filter((pj) => !!pj.es_local === eq.esLocal)
      .sort((a, b) => {
        const [ga, va] = orden(a);
        const [gb, vb] = orden(b);
        return ga - gb || va - vb || nombre(a).localeCompare(nombre(b), 'es');
      });
    return {
      ...eq,
      conMinutos,
      filas: delEquipo.filter((pj) => !noHaJugado(pj)),
      noJugaron: delEquipo.filter(noHaJugado)
    };
  }).filter((eq) => eq.filas.length || eq.noJugaron.length);
});

/** Suplente que no llegó a entrar (con datos del acta). */
function noHaJugado(pj) {
  return (pj.titular === false || pj.titular === 0) && pj.minuto_entrada == null;
}

const incidencias = computed(() => partido.value?.incidencias ?? props.evento?.incidencias ?? '');
const observaciones = computed(() => partido.value?.observaciones ?? props.evento?.observaciones ?? '');
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="cargando" class="text-center text-xs text-ink-tertiary py-2">
      <i class="pi pi-spin pi-spinner"></i> Cargando jugadores…
    </div>

    <div v-for="eq in equipos" :key="eq.clave" class="flex flex-col gap-1">
      <h4 class="text-xs font-semibold text-club-green">{{ eq.nombre }}</h4>
      <div v-if="eq.filas.length" class="overflow-x-auto rounded-lg border border-line">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-club-green/5 text-ink-tertiary">
              <th class="text-left font-medium px-2 py-1.5">Jugador</th>
              <th class="font-medium px-1.5 py-1.5" title="Goles">Goles</th>
              <th class="font-medium px-1.5 py-1.5" title="Tarjetas amarillas"><span class="tarjeta tarjeta-amarilla" aria-label="Amarillas"></span></th>
              <th class="font-medium px-1.5 py-1.5" title="Tarjetas rojas"><span class="tarjeta tarjeta-roja" aria-label="Rojas"></span></th>
              <th v-if="eq.conMinutos" class="font-medium px-1.5 py-1.5">Min.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pj in eq.filas" :key="`${pj.id_jugador}-${pj.id_equipo_jugador}`" class="border-t border-line">
              <td class="px-2 py-1 text-ink-primary">
                <span class="inline-flex items-center gap-1.5">
                  {{ nombre(pj) }}
                  <span v-if="pj.minuto_entrada != null" class="inline-flex items-center gap-0.5 font-semibold text-green-700" :title="`Entra en el minuto ${pj.minuto_entrada}`">
                    <i class="pi pi-arrow-left text-[0.6rem]"></i>{{ pj.minuto_entrada }}'
                  </span>
                  <span v-if="pj.minuto_salida != null" class="inline-flex items-center gap-0.5 font-semibold text-red-700" :title="`Sale en el minuto ${pj.minuto_salida}`">
                    <i class="pi pi-arrow-right text-[0.6rem]"></i>{{ pj.minuto_salida }}'
                  </span>
                </span>
              </td>
              <td class="text-center px-1.5 py-1" :class="pj.goles ? 'font-semibold text-ink-primary' : 'text-ink-tertiary'">{{ pj.goles || 0 }}</td>
              <td class="text-center px-1.5 py-1" :class="pj.tarjeta_amarilla ? 'font-semibold text-yellow-700' : 'text-ink-tertiary'">{{ pj.tarjeta_amarilla || 0 }}</td>
              <td class="text-center px-1.5 py-1" :class="pj.tarjeta_roja ? 'font-semibold text-red-700' : 'text-ink-tertiary'">{{ pj.tarjeta_roja || 0 }}</td>
              <td v-if="eq.conMinutos" class="text-center px-1.5 py-1 text-ink-secondary">{{ pj.minutos ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="eq.noJugaron.length" class="text-xs text-ink-secondary mt-1">
        <span class="font-semibold text-ink-tertiary">No han jugado ({{ eq.noJugaron.length }}):</span>
        {{ eq.noJugaron.map(nombre).join(', ') }}
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 text-sm">
      <div>
        <p class="text-xs font-semibold text-club-green mb-0.5"><i class="pi pi-exclamation-circle mr-1"></i>Incidencias</p>
        <p v-if="incidencias" class="text-ink-secondary whitespace-pre-line">{{ incidencias }}</p>
        <p v-else class="text-ink-tertiary">Sin incidencias</p>
      </div>
      <div>
        <p class="text-xs font-semibold text-club-green mb-0.5"><i class="pi pi-comment mr-1"></i>Observaciones</p>
        <p v-if="observaciones" class="text-ink-secondary whitespace-pre-line">{{ observaciones }}</p>
        <p v-else class="text-ink-tertiary">Sin observaciones</p>
      </div>
    </div>
  </div>
</template>
