<script setup>
import { ref, onMounted, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Calendar from 'primevue/calendar';
import trainingService from '../services/training.service';
import matchService from '../services/match.service';

const from = ref(startOfMonth());
const to = ref(endOfMonth());
const trainings = ref([]);
const matches = ref([]);
const loading = ref(false);

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function fmt(date) {
  return date.toISOString().slice(0, 10);
}

async function load() {
  loading.value = true;
  try {
    const [t, m] = await Promise.all([
      trainingService.listByRange(fmt(from.value), fmt(to.value)),
      matchService.listByRange(fmt(from.value), fmt(to.value)),
    ]);
    trainings.value = t;
    matches.value = m;
  } finally {
    loading.value = false;
  }
}

const events = computed(() => {
  const trainingEvents = trainings.value.map((t) => ({
    id: `t-${t.id}`,
    type: 'Entrenamiento',
    date: t.event_date,
    time: t.start_time,
    location: t.location,
    category: t.category_name,
    detail: t.notes || '-',
  }));
  const matchEvents = matches.value.map((m) => ({
    id: `m-${m.id}`,
    type: 'Partido',
    date: m.event_date,
    time: m.start_time,
    location: m.location,
    category: m.category_name,
    detail: `${m.home_away === 'local' ? 'vs' : '@'} ${m.rival}`,
  }));
  return [...trainingEvents, ...matchEvents].sort((a, b) => a.date.localeCompare(b.date));
});

onMounted(load);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Calendario Global</h1>
      <div class="flex items-center gap-2">
        <Calendar v-model="from" dateFormat="dd/mm/yy" @date-select="load" />
        <span>a</span>
        <Calendar v-model="to" dateFormat="dd/mm/yy" @date-select="load" />
      </div>
    </div>

    <DataTable :value="events" :loading="loading" paginator :rows="10" stripedRows>
      <Column field="date" header="Fecha" sortable />
      <Column field="time" header="Hora" />
      <Column header="Tipo">
        <template #body="{ data }">
          <Tag :severity="data.type === 'Partido' ? 'warning' : 'info'" :value="data.type" />
        </template>
      </Column>
      <Column field="category" header="Categoria" />
      <Column field="location" header="Lugar" />
      <Column field="detail" header="Detalle" />
    </DataTable>
  </div>
</template>
