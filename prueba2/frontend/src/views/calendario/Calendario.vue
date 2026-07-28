<script setup>
/**
 * Sección "Calendario" (requisito nº3):
 * - Pinta entrenamientos y partidos de todas las categorías.
 * - Filtrable por semana / mes / año (y opcionalmente por categoría).
 * - SOLO LECTURA: no hay alta, edición ni borrado desde aquí a propósito;
 *   el backend (`/api/calendario`) tampoco expone esas operaciones.
 */
import { ref, onMounted, computed } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import { calendarioService, categoriasService } from '../../services';

const categorias = ref([]);
const filtroCategoria = ref(null);
const calendarRef = ref();
const eventoSeleccionado = ref(null);
const dialogVisible = ref(false);

const opcionesCategoria = computed(() => [
  { label: 'Todas las categorías', value: null },
  ...categorias.value.map(c => ({ label: `${c.nombre} (${c.temporada})`, value: c.id }))
]);

// Colores por tipo de evento (usando la paleta del club)
const COLOR_ENTRENAMIENTO = '#0B3D2E'; // verde club
const COLOR_PARTIDO = '#7A1E2B';       // grana club

async function fetchEventos(fetchInfo, successCallback, failureCallback) {
  try {
    const eventos = await calendarioService.eventos({
      desde: fetchInfo.startStr,
      hasta: fetchInfo.endStr,
      id_categoria: filtroCategoria.value || undefined
    });

    const mapeados = eventos.map(e => ({
      id: e.id,
      title: e.titulo,
      start: e.inicio,
      color: e.tipo === 'partido' ? COLOR_PARTIDO : COLOR_ENTRENAMIENTO,
      extendedProps: e
    }));

    successCallback(mapeados);
  } catch (err) {
    failureCallback(err);
  }
}

function onEventClick(info) {
  eventoSeleccionado.value = info.event.extendedProps;
  dialogVisible.value = true;
}

function refrescar() {
  calendarRef.value?.getApi().refetchEvents();
}

const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: 'es',
  height: 'auto',
  firstDay: 1, // semanas empiezan en lunes
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    // El propio FullCalendar ya permite alternar semana / mes / año
    right: 'dayGridMonth,timeGridWeek,dayGridYear'
  },
  buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', year: 'Año' },
  events: fetchEventos,
  eventClick: onEventClick,
  editable: false,     // no se puede arrastrar/mover -> solo lectura
  selectable: false,   // no se pueden crear eventos haciendo clic/arrastrando
  dayMaxEvents: 3
};

onMounted(async () => {
  categorias.value = await categoriasService.listar();
});

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div>
        <h1 class="font-display text-xl text-club-green">Calendario</h1>
        <p class="text-sm text-slate-500">Entrenamientos y partidos de todas las categorías. Solo lectura.</p>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span class="w-3 h-3 rounded-full inline-block" style="background:#0B3D2E"></span> Entrenamiento
          <span class="w-3 h-3 rounded-full inline-block ml-3" style="background:#7A1E2B"></span> Partido
        </div>
        <Select
          v-model="filtroCategoria"
          :options="opcionesCategoria"
          optionLabel="label"
          optionValue="value"
          class="w-64"
          @change="refrescar"
        />
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <!-- Detalle del evento (solo lectura) -->
    <Dialog v-model:visible="dialogVisible" modal header="Detalle del evento" class="w-full max-w-md">
      <div v-if="eventoSeleccionado" class="space-y-3">
        <Tag :severity="eventoSeleccionado.tipo === 'partido' ? 'danger' : 'success'"
             :value="eventoSeleccionado.tipo === 'partido' ? 'Partido' : 'Entrenamiento'" />

        <h3 class="font-display text-lg text-club-green">{{ eventoSeleccionado.titulo }}</h3>

        <div class="text-sm text-slate-600 space-y-1.5">
          <p><i class="pi pi-calendar mr-2"></i>{{ formatearFecha(eventoSeleccionado.inicio) }}</p>
          <p><i class="pi pi-map-marker mr-2"></i>{{ eventoSeleccionado.lugar }}</p>
          <p v-if="eventoSeleccionado.categoria">
            <i class="pi pi-sitemap mr-2"></i>{{ eventoSeleccionado.categoria.nombre }} ({{ eventoSeleccionado.categoria.temporada }})
          </p>
          <p v-if="eventoSeleccionado.equipo_rival">
            <i class="pi pi-flag mr-2"></i>Rival: {{ eventoSeleccionado.equipo_rival }}
            <span v-if="eventoSeleccionado.resultado"> · Resultado: {{ eventoSeleccionado.resultado }}</span>
          </p>
          <p v-if="eventoSeleccionado.incidencias">
            <i class="pi pi-exclamation-circle mr-2"></i>{{ eventoSeleccionado.incidencias }}
          </p>
        </div>
      </div>
    </Dialog>
  </div>
</template>
