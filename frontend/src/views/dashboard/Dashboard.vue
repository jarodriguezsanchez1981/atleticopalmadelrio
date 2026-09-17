<script setup>
import { ref, onMounted } from 'vue';
import { partidosService, entrenamientosService } from '../../services';

const PALMA_ID = 73;

const cargando = ref(true);
const proximosPartidos = ref([]);
const proximosEntrenamientos = ref([]);

function inicioHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function cargar() {
  cargando.value = true;
  try {
    const desde = inicioHoy();
    const [partidos, entrenamientos] = await Promise.all([
      partidosService.listar({ desde }),
      entrenamientosService.listar({ desde })
    ]);
    proximosPartidos.value = partidos
      .slice()
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(0, 5);
    proximosEntrenamientos.value = entrenamientos
      .slice()
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(0, 5);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);

function categoriaNombre(item) {
  return item.plantilla?.categoria?.alias || item.plantilla?.categoria?.nombre || '—';
}

function rival(p) {
  const esLocalPalma = Number(p.id_equipo_local) === PALMA_ID;
  const nombre = esLocalPalma ? p.equipoVisitante?.nombre : p.equipoLocal?.nombre;
  return { nombre: nombre || '—', esLocal: esLocalPalma };
}

function formatoFechaHora(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  const dia = d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${hora}`;
}
</script>

<template>
<SectionGuard seccion="dashboard">
  <div>
    <h1 class="font-display text-xl text-club-green mb-1 flex items-center gap-2">
      <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
      Dashboard
    </h1>
    <p class="text-sm text-ink-tertiary mb-4">
      Resumen de la próxima actividad del club.
    </p>

    <div v-if="cargando" class="text-center py-8 text-ink-tertiary">
      <i class="pi pi-spin pi-spinner text-xl block mb-2"></i>
      Cargando...
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-line p-4">
        <h2 class="font-display text-sm text-club-green mb-3 flex items-center gap-2">
          <i class="pi pi-flag"></i> Próximos partidos
        </h2>
        <div v-if="!proximosPartidos.length" class="text-sm text-ink-tertiary py-4 text-center">
          Sin partidos programados.
        </div>
        <div
          v-for="p in proximosPartidos"
          :key="p.id"
          class="flex items-center justify-between gap-2 py-2 border-b border-line last:border-b-0"
        >
          <div class="min-w-0">
            <div class="text-xs font-semibold text-club-green">{{ formatoFechaHora(p.fecha) }}</div>
            <div class="text-sm font-medium text-ink-primary truncate">
              {{ rival(p).esLocal ? 'vs' : '@' }} {{ rival(p).nombre }}
            </div>
          </div>
          <span class="text-xs bg-club-green/10 text-club-green px-2 py-0.5 rounded-full whitespace-nowrap">
            {{ categoriaNombre(p) }}
          </span>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-line p-4">
        <h2 class="font-display text-sm text-club-green mb-3 flex items-center gap-2">
          <i class="pi pi-stopwatch"></i> Próximos entrenamientos
        </h2>
        <div v-if="!proximosEntrenamientos.length" class="text-sm text-ink-tertiary py-4 text-center">
          Sin entrenamientos programados.
        </div>
        <div
          v-for="e in proximosEntrenamientos"
          :key="e.id"
          class="flex items-center justify-between gap-2 py-2 border-b border-line last:border-b-0"
        >
          <div class="min-w-0">
            <div class="text-xs font-semibold text-club-green">{{ formatoFechaHora(e.fecha) }}</div>
            <div class="text-sm font-medium text-ink-primary truncate">{{ e.lugar?.nombre || '—' }}</div>
          </div>
          <span class="text-xs bg-club-green/10 text-club-green px-2 py-0.5 rounded-full whitespace-nowrap">
            {{ categoriaNombre(e) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</SectionGuard>
</template>
