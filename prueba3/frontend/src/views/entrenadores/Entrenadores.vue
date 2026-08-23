<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { entrenadoresService, titulosService } from '../../services';
import { validarDNI } from '../../utils/dni';

const titulos = ref([]);

onMounted(async () => {
  titulos.value = await titulosService.listar();
});

const opcionesTitulo = computed(() =>
  titulos.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', required: true, validate: (v) => (!v ? false : validarDNI(v) ? null : 'El DNI introducido no es válido.') },
  { field: 'ids_titulos', header: 'Títulos', type: 'multiselect', relation: 'titulos', options: opcionesTitulo.value, required: false }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', dni: '', ids_titulos: [] };

function nombresTitulos(data) {
  if (data.titulos?.length) return data.titulos.map(t => t.nombre).join(', ');
  const ids = data.ids_titulos || [];
  return ids.map(id => opcionesTitulo.value.find(o => o.value === id)?.label || id).join(', ') || '—';
}
</script>

<template>
  <CrudDataTable
    title="Entrenadores"
    :columns="columns"
    :service="entrenadoresService"
    :emptyItem="emptyItem"
  >
    <template #cell-ids_titulos="{ data }">
      {{ nombresTitulos(data) }}
    </template>
    <template #detail-ids_titulos="{ data }">
      {{ nombresTitulos(data) }}
    </template>
  </CrudDataTable>
</template>
