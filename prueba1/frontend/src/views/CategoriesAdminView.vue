<script setup>
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import categoryService from '../services/category.service';

const categories = ref([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    categories.value = await categoryService.list();
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Gestion de Categorias</h1>
      <Button label="Nueva categoria" icon="pi pi-plus" />
    </div>

    <DataTable :value="categories" :loading="loading" stripedRows>
      <Column field="name" header="Categoria" />
      <Column field="season" header="Temporada" />
      <Column field="description" header="Descripcion" />
      <Column header="Acciones">
        <template #body>
          <Button icon="pi pi-pencil" text />
          <Button icon="pi pi-trash" text severity="danger" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
