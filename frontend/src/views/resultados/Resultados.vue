<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { resultadosService, partidosService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const partidos = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  partidos.value = await partidosService.listar();
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

function etiquetaPartido(p) {
  let fecha = '—';
  if (p.fecha) {
    const d = new Date(p.fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    fecha = `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }
  const local = p.equipoLocal?.nombre || '';
  const visitante = p.equipoVisitante?.nombre || '';
  return `${fecha} · ${local} vs ${visitante}`;
}

const opcionesPartido = computed(() =>
  partidos.value
    .map((p) => ({ label: etiquetaPartido(p), value: p.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

function nombrePartido(id) {
  const p = partidos.value.find((x) => x.id === id);
  return p ? etiquetaPartido(p) : '—';
}

const columns = computed(() => [
  { field: 'id_partido', header: 'Partido', type: 'select', options: opcionesPartido.value, required: true },
  { field: 'resultado', header: 'Resultado', type: 'text', required: true },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = {
  id_partido: null,
  resultado: '',
  incidencias: ''
};
</script>

<template>
<SectionGuard seccion="resultados">
  <CrudDataTable
    title="Resultados"
    seccion="resultados"
    :columns="columns"
    :service="resultadosService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_partido="{ data }">
      {{ data.partido ? etiquetaPartido(data.partido) : nombrePartido(data.id_partido) }}
    </template>
    <template #detail-id_partido="{ data }">
      {{ data.partido ? etiquetaPartido(data.partido) : nombrePartido(data.id_partido) }}
    </template>
  </CrudDataTable>
</SectionGuard>
</template>
