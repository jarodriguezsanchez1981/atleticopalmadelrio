<script setup>
/**
 * Calendario solo lectura: entrenamientos, partidos y festivos nacionales ES.
 */
import { ref, onMounted, computed } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import { calendarioService, categoriasService } from '../../services';
import { eventosFestivosFullCalendar } from '../../utils/festivosEspana';

const categorias = ref([]);
const filtroCategoria = ref(null);
const calendarRef = ref();
const eventoSeleccionado = ref(null);
const dialogVisible = ref(false);

const opcionesCategoria = computed(() => [
  { label: 'Todas las categorías', value: null },
  ...categorias.value.map(c => ({ label: `${c.nombre} (${c.temporada?.nombre || ''})`, value: c.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
]);

const COLOR_ENTRENAMIENTO = '#0B3D2E';
const COLOR_PARTIDO = '#7A1E2B';
const COLOR_FESTIVO = '#D97706';

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

    const festivos = eventosFestivosFullCalendar(fetchInfo.startStr, fetchInfo.endStr).map(f => ({
      ...f,
      display: 'auto',
      color: COLOR_FESTIVO,
      backgroundColor: '#FDE68A',
      borderColor: '#D97706',
      textColor: '#78350F'
    }));

    successCallback([...mapeados, ...festivos]);
  } catch (err) {
    failureCallback(err);
  }
}

function onEventClick(info) {
  eventoSeleccionado.value = {
    ...info.event.extendedProps,
    titulo: info.event.extendedProps?.titulo || info.event.title,
    inicio: info.event.extendedProps?.inicio || info.event.start
  };
  dialogVisible.value = true;
}

function refrescar() {
  calendarRef.value?.getApi().refetchEvents();
}

const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: esLocale,
  height: 'auto',
  firstDay: 1,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,multiMonthYear'
  },
  buttonText: {
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    year: 'Año'
  },
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  slotLabelFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  events: fetchEventos,
  eventClick: onEventClick,
  editable: false,
  selectable: false,
  dayMaxEvents: 4,
  fixedWeekCount: false
};

onMounted(async () => {
  categorias.value = await categoriasService.listar();
});

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  // Si es solo fecha (festivo all-day), sin hora
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div>
        <h1 class="font-display text-xl text-club-green flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
          Calendario
        </h1>
        <p class="text-sm text-slate-500">
          Entrenamientos, partidos y festivos nacionales de España. Solo lectura.
        </p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span class="w-3 h-3 rounded-full inline-block" style="background:#0B3D2E"></span> Entrenamiento
          <span class="w-3 h-3 rounded-full inline-block ml-2" style="background:#7A1E2B"></span> Partido
          <span class="w-3 h-3 rounded-full inline-block ml-2" style="background:#D97706"></span> Festivo
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

    <div class="bg-white rounded-xl shadow-sm p-4 calendario-club">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <Dialog v-model:visible="dialogVisible" modal class="w-full max-w-md">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">Detalle del evento</span>
        </div>
      </template>

      <div v-if="eventoSeleccionado" class="space-y-3">
        <Tag
          :severity="eventoSeleccionado.tipo === 'partido' ? 'danger' : (eventoSeleccionado.tipo === 'festivo' ? 'warn' : 'success')"
          :value="eventoSeleccionado.tipo === 'partido' ? 'Partido' : (eventoSeleccionado.tipo === 'festivo' ? 'Festivo nacional' : 'Entrenamiento')"
        />

        <h3 class="font-display text-lg text-club-green">{{ eventoSeleccionado.titulo }}</h3>

        <div class="text-sm text-slate-600 space-y-1.5">
          <p><i class="pi pi-calendar mr-2"></i>{{ formatearFecha(eventoSeleccionado.inicio) }}</p>
          <p v-if="eventoSeleccionado.lugar">
            <i class="pi pi-map-marker mr-2"></i>{{ eventoSeleccionado.lugar }}
          </p>
          <p v-if="eventoSeleccionado.categoria">
            <i class="pi pi-sitemap mr-2"></i>
            {{ eventoSeleccionado.categoria.nombre }}
            ({{ eventoSeleccionado.categoria.temporada?.nombre || '' }})
          </p>
          <p v-if="eventoSeleccionado.equipo">
            <i class="pi pi-flag mr-2"></i>Rival: {{ eventoSeleccionado.equipo.nombre }}
          </p>
          <p v-if="eventoSeleccionado.incidencias">
            <i class="pi pi-exclamation-circle mr-2"></i>{{ eventoSeleccionado.incidencias }}
          </p>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style>
.calendario-club .fc-festivo-nacional,
.calendario-club .fc-event[style*="215, 119, 6"],
.calendario-club .fc-daygrid-event {
  border-radius: 4px;
}
.calendario-club .fc-toolbar-title {
  font-size: 1.15rem;
  text-transform: capitalize;
}
.calendario-club .fc-col-header-cell-cushion,
.calendario-club .fc-daygrid-day-number {
  text-transform: capitalize;
}
</style>
