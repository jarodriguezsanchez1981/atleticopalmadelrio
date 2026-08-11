<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { entrenadoresService, categoriasService, temporadasService, titulosService } from '../../services';
import { validarDNI } from '../../utils/dni';

const categorias = ref([]);
const temporadas = ref([]);
const titulos = ref([]);

onMounted(async () => {
  const [cats, temps, tits] = await Promise.all([
    categoriasService.listar(),
    temporadasService.listar(),
    titulosService.listar()
  ]);
  categorias.value = cats;
  temporadas.value = temps;
  titulos.value = tits;
});

const opcionesTitulo = computed(() =>
  titulos.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesTemporada = computed(() =>
  temporadas.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({
    label: `${c.nombre} (${c.temporada?.nombre || ''})`,
    value: c.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', required: true, validate: (v) => (!v ? false : validarDNI(v) ? null : 'El DNI introducido no es válido.') },
  { field: 'ids_titulos', header: 'Títulos', type: 'multiselect', relation: 'titulos', options: opcionesTitulo.value, required: false },
  { field: 'id_temporada', header: 'Temporada', type: 'select', options: opcionesTemporada.value, required: true },
  { field: 'ids_categorias', header: 'Categorías', type: 'multiselect', relation: 'categorias', options: opcionesCategoria.value, required: false }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', dni: '', ids_titulos: [], id_temporada: null, ids_categorias: [] };

function nombresTitulos(data) {
  if (data.titulos?.length) return data.titulos.map(t => t.nombre).join(', ');
  const ids = data.ids_titulos || [];
  return ids.map(id => opcionesTitulo.value.find(o => o.value === id)?.label || id).join(', ') || '—';
}

function nombresCategorias(data) {
  if (data.categorias?.length) return data.categorias.map(c => `${c.nombre} (${c.temporada?.nombre || ''})`).join(', ');
  const ids = data.ids_categorias || [];
  return ids.map(id => opcionesCategoria.value.find(o => o.value === id)?.label || id).join(', ') || '—';
}

function nombreTemporada(id) {
  return temporadas.value.find(t => t.id === id)?.nombre || '—';
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
    <template #cell-id_temporada="{ data }">
      {{ data.temporada?.nombre || nombreTemporada(data.id_temporada) }}
    </template>
    <template #cell-ids_categorias="{ data }">
      {{ nombresCategorias(data) }}
    </template>
    <template #detail-ids_titulos="{ data }">
      {{ nombresTitulos(data) }}
    </template>
    <template #detail-ids_categorias="{ data }">
      {{ nombresCategorias(data) }}
    </template>
  </CrudDataTable>
</template>
