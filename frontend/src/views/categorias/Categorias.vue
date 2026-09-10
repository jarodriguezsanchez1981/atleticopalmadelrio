<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import { useToast } from 'primevue/usetoast';
import { categoriasService, tiposFutbolService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const crudRef = ref(null);
const toast = useToast();
const tiposFutbol = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  tiposFutbol.value = await tiposFutbolService.listar();
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesTipoFutbol = computed(() =>
  tiposFutbol.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'alias', header: 'Alias', type: 'text', required: false },
  { field: 'id_tipofutbol', header: 'Tipo de fútbol', type: 'select', options: opcionesTipoFutbol.value, required: true },
  { field: 'tiempopartido', header: 'Tiempo partido (min)', type: 'number', required: false },
  { field: 'tiempoentrenamiento', header: 'Tiempo entrenam. (min)', type: 'number', required: false },
  { field: 'orden', header: 'Orden', type: 'number', required: false }
]);

const emptyItem = { nombre: '', alias: '', id_tipofutbol: null, tiempopartido: null, tiempoentrenamiento: null, orden: null };

function nombreTipoFutbol(id) {
  return tiposFutbol.value.find(t => t.id === id)?.nombre || '—';
}

const dialogReordenVisible = ref(false);
const desdeReorden = ref(null);
const reordenando = ref(false);

function abrirDialogoReorden() {
  desdeReorden.value = null;
  dialogReordenVisible.value = true;
}

async function confirmarReorden() {
  if (!desdeReorden.value) return;
  reordenando.value = true;
  try {
    const resultado = await categoriasService.reordenar(desdeReorden.value);
    toast.add({ severity: 'success', summary: 'Reordenado', detail: resultado.message, life: 4000 });
    dialogReordenVisible.value = false;
    crudRef.value?.cargar();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo reordenar.',
      life: 4000
    });
  } finally {
    reordenando.value = false;
  }
}
</script>

<template>
<SectionGuard seccion="categorias">
  <CrudDataTable
    ref="crudRef"
    title="Categorías"
    seccion="categorias"
    :columns="columns"
    :service="categoriasService"
    :emptyItem="emptyItem"
  >
    <template #acciones>
      <Button label="Re-Orden" icon="pi pi-sort-numeric-up" outlined
              class="!text-club-green !border-club-green/50 hover:!bg-club-green/5"
              @click="abrirDialogoReorden" />
    </template>
    <template #cell-id_tipofutbol="{ data }">
      {{ data.tipofutbol?.nombre || nombreTipoFutbol(data.id_tipofutbol) }}
    </template>
  </CrudDataTable>

  <Dialog v-model:visible="dialogReordenVisible" modal header="Re-Orden de categorías"
          :style="{ width: '26rem' }">
    <div class="space-y-3 pt-1">
      <p class="text-sm text-ink-secondary">
        A las categorías con orden igual o mayor que el número indicado se les sumará 1,
        dejando hueco para insertar o mover una categoría a esa posición.
      </p>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-secondary">Desde el número <span class="text-club-garnet">*</span></label>
        <InputNumber v-model="desdeReorden" :min="1" :minFractionDigits="0" :maxFractionDigits="0"
                     class="w-full" inputClass="w-full" placeholder="Ej: 5" />
      </div>
    </div>
    <template #footer>
      <Button label="Cancelar" text @click="dialogReordenVisible = false" :disabled="reordenando" />
      <Button label="Reordenar" icon="pi pi-check" :loading="reordenando" :disabled="!desdeReorden"
              class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
              @click="confirmarReorden" />
    </template>
  </Dialog>
</SectionGuard>
</template>
