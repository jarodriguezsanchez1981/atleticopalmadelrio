<script setup>
import { ref, onMounted, watch } from 'vue';
import Dropdown from 'primevue/dropdown';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import { useAuthStore } from '../stores/auth.store';
import categoryService from '../services/category.service';
import playerService from '../services/player.service';

const auth = useAuthStore();
const categories = ref([]);
const selectedCategory = ref(null);
const players = ref([]);
const loading = ref(false);

async function loadCategories() {
  categories.value = await categoryService.list();
  // entrenador: preselecciona su categoria si solo tiene una
  if (!auth.canManage && categories.value.length > 0) {
    selectedCategory.value = categories.value[0].id;
  } else if (categories.value.length > 0) {
    selectedCategory.value = categories.value[0].id;
  }
}

async function loadPlayers() {
  if (!selectedCategory.value) return;
  loading.value = true;
  try {
    players.value = await playerService.listByCategory(selectedCategory.value);
  } finally {
    loading.value = false;
  }
}

const statusSeverity = {
  disponible: 'success',
  lesionado: 'danger',
  recuperacion: 'warning',
  sancionado: 'secondary',
};

watch(selectedCategory, loadPlayers);
onMounted(loadCategories);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Gestion de Plantilla</h1>
      <Button v-if="auth.canManage" label="Nuevo jugador" icon="pi pi-plus" />
    </div>

    <Dropdown
      v-model="selectedCategory"
      :options="categories"
      optionLabel="name"
      optionValue="id"
      placeholder="Selecciona categoria"
      class="mb-4 w-64"
    />

    <DataTable :value="players" :loading="loading" paginator :rows="10" stripedRows>
      <Column field="dorsal" header="Dorsal" sortable style="width: 90px" />
      <Column header="Jugador">
        <template #body="{ data }">{{ data.name }} {{ data.surname }}</template>
      </Column>
      <Column field="federative_license" header="Licencia" />
      <Column header="Estado fisico">
        <template #body="{ data }">
          <Tag :severity="statusSeverity[data.physical_status]" :value="data.physical_status" />
        </template>
      </Column>
      <Column field="phone" header="Telefono" />
      <Column field="email" header="Email" />
      <Column v-if="auth.canManage" header="Acciones">
        <template #body>
          <Button icon="pi pi-pencil" text />
          <Button icon="pi pi-trash" text severity="danger" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
