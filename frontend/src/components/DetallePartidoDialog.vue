<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import EquipacionPrenda from './EquipacionPrenda.vue';
import ResultadoJugadoresPartido from './ResultadoJugadoresPartido.vue';
import { partidosService } from '../services';
import { golesPartido } from '../utils/resultadoPartido';

/** Ficha de un partido en modo ver (solo lectura): fecha, lugar, escudos con
 * equipación y los goles de cada equipo debajo, y las estadísticas de los
 * jugadores. Los datos de los equipos (escudo, colores) los pasa quien la abre
 * porque ya los tiene cargados; el partido se pide al abrirla. */
const props = defineProps({
  visible: { type: Boolean, default: false },
  idPartido: { type: Number, default: null },
  equipoLocal: { type: Object, default: null },
  equipoVisitante: { type: Object, default: null }
});
const emit = defineEmits(['update:visible']);

const partido = ref(null);
const cargando = ref(false);

watch(() => [props.visible, props.idPartido], async ([visible, id]) => {
  if (!visible || !id) return;
  cargando.value = true;
  partido.value = null;
  try {
    partido.value = await partidosService.obtener(id);
  } catch {
    partido.value = null;
  } finally {
    cargando.value = false;
  }
}, { immediate: true });

const goles = computed(() => golesPartido(partido.value?.resultado));
const local = computed(() => props.equipoLocal || partido.value?.equipoLocal || null);
const visitante = computed(() => props.equipoVisitante || partido.value?.equipoVisitante || null);

const fecha = computed(() => {
  const d = partido.value?.fecha ? new Date(partido.value.fecha) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
});
const hora = computed(() => {
  const d = partido.value?.fecha ? new Date(partido.value.fecha) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  // Sin hora asignada el partido se guarda a las 00:00 UTC.
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return 'Por confirmar';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});
const lugar = computed(() => partido.value?.lugar?.nombre || local.value?.localidad || '—');
const evento = computed(() => ({
  base_id: props.idPartido,
  resultado: partido.value?.resultado,
  incidencias: partido.value?.incidencias,
  observaciones: partido.value?.observaciones,
  equipoLocal: local.value,
  equipoVisitante: visitante.value
}));
</script>

<template>
  <Dialog :visible="visible" modal class="w-full max-w-lg" @update:visible="emit('update:visible', $event)">
    <template #header>
      <div class="flex items-center gap-2">
        <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
        <span class="font-display text-club-green text-lg">{{ partido?.plantilla?.categoria?.nombre || 'Partido' }}</span>
        <span v-if="partido?.jornada" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          <i class="pi pi-star-fill"></i> Jornada {{ partido.jornada }}
        </span>
        <span v-if="partido?.suspendido" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
          <i class="pi pi-ban"></i> Suspendido
        </span>
      </div>
    </template>

    <div v-if="cargando" class="text-center text-sm text-ink-tertiary py-6">
      <i class="pi pi-spin pi-spinner"></i> Cargando partido…
    </div>
    <div v-else-if="partido" class="space-y-3">
      <div class="grid grid-cols-3 gap-2 text-center pb-2 border-b border-line">
        <div>
          <p class="text-xs text-ink-tertiary font-medium">Fecha</p>
          <p class="text-sm text-ink-secondary capitalize">{{ fecha }}</p>
        </div>
        <div>
          <p class="text-xs text-ink-tertiary font-medium">Hora</p>
          <p class="text-sm text-ink-secondary">{{ hora }}</p>
        </div>
        <div>
          <p class="text-xs text-ink-tertiary font-medium">Lugar</p>
          <p class="text-sm text-ink-secondary">{{ lugar }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 py-3">
        <div v-for="(eq, i) in [local, visitante]" :key="i" class="flex flex-col items-center gap-2">
          <img :src="eq?.escudo || '/escudo.png'" alt="Escudo" class="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
          <div class="flex items-center gap-2">
            <EquipacionPrenda tipo="camiseta" :color="eq?.camiseta || null" :size="28" />
            <EquipacionPrenda tipo="calzonas" :color="eq?.calzonas || null" :size="28" />
            <EquipacionPrenda tipo="medias" :color="eq?.medias || null" :size="28" />
          </div>
          <span class="text-sm font-medium text-ink-secondary text-center">{{ eq?.nombre || '—' }}</span>
          <span v-if="goles" class="font-display text-3xl font-extrabold text-club-green tabular-nums leading-none">
            {{ i === 0 ? goles.local : goles.visitante }}
          </span>
        </div>
      </div>

      <ResultadoJugadoresPartido :evento="evento" />

    </div>
    <div v-else class="text-center text-sm text-ink-tertiary py-6">No se pudo cargar el partido.</div>
  </Dialog>
</template>
