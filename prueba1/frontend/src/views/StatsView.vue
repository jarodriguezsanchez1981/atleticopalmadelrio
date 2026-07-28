<script setup>
import { ref, onMounted, watch } from 'vue';
import Dropdown from 'primevue/dropdown';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useAuthStore } from '../stores/auth.store';
import categoryService from '../services/category.service';
import matchService from '../services/match.service';

const auth = useAuthStore();
const categories = ref([]);
const selectedCategory = ref(null);
const stats = ref([]);
const loading = ref(false);

async function loadCategories() {
  categories.value = await categoryService.list();
  if (categories.value.length > 0) selectedCategory.value = categories.value[0].id;
}

async function loadStats() {
  if (!selectedCategory.value) return;
  loading.value = true;
  try {
    stats.value = await matchService.categoryStats(selectedCategory.value);
  } finally {
    loading.value = false;
  }
}

watch(selectedCategory, loadStats);
onMounted(loadCategories);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">
      Estadisticas {{ auth.canManage ? 'Globales' : 'del Equipo' }}
    </h1>

    <Dropdown
      v-model="selectedCategory"
      :options="categories"
      optionLabel="name"
      optionValue="id"
      placeholder="Selecciona categoria"
      class="mb-4 w-64"
    />

    <DataTable :value="stats" :loading="loading" paginator :rows="15" stripedRows sortField="goles" :sortOrder="-1">
      <Column field="dorsal" header="Dorsal" sortable style="width: 90px" />
      <Column header="Jugador">
        <template #body="{ data }">{{ data.name }} {{ data.surname }}</template>
      </Column>
      <Column field="partidos_convocado" header="Convocatorias" sortable />
      <Column field="partidos_titular" header="Titularidades" sortable />
      <Column field="minutos_totales" header="Minutos" sortable />
      <Column field="goles" header="Goles" sortable />
      <Column field="amarillas" header="Amarillas" sortable />
      <Column field="rojas" header="Rojas" sortable />
    </DataTable>
  </div>
</template>
