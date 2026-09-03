<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { promocionesService, plantillasService, categoriasService, jugadoresService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const plantillas = ref([]);
const categorias = ref([]);
const jugadores = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  const [plants, cats, jugs] = await Promise.all([
    plantillasService.listar(),
    categoriasService.listar(),
    jugadoresService.listar()
  ]);
  plantillas.value = plants;
  categorias.value = cats;
  jugadores.value = jugs;
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesPlantilla = computed(() =>
  plantillas.value
    .map(p => ({ label: `${p.categoria?.nombre || ''} / ${p.temporada?.nombre || ''}`, value: p.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesCategoria = computed(() =>
  categorias.value
    .map(c => ({ label: c.nombre, value: c.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesJugador = computed(() =>
  jugadores.value
    .map(j => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_plantilla', header: 'Plantilla', type: 'select', options: opcionesPlantilla.value, required: true },
  { field: 'id_categoria', header: 'Categoría destino', type: 'select', options: opcionesCategoria.value, required: true },
  { field: 'id_jugador', header: 'Jugador', type: 'select', options: opcionesJugador.value, required: true }
]);

const emptyItem = { id_plantilla: null, id_categoria: null, id_jugador: null };

function plantillaLabel(id) {
  const p = plantillas.value.find(p => p.id === id);
  return p ? `${p.categoria?.nombre || ''} / ${p.temporada?.nombre || ''}` : '—';
}

function categoriaLabel(id) {
  return categorias.value.find(c => c.id === id)?.nombre || '—';
}

function jugadorLabel(id) {
  const j = jugadores.value.find(j => j.id === id);
  return j ? `${j.nombre} ${j.apellidos}` : '—';
}
</script>

<template>
<SectionGuard seccion="promociones">
  <CrudDataTable
    title="Promociones"
    :columns="columns"
    :service="promocionesService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_plantilla="{ data }">
      {{ data.plantilla?.categoria?.nombre || plantillaLabel(data.id_plantilla) }} - {{ data.jugador ? `${data.jugador.nombre} ${data.jugador.apellidos}` : jugadorLabel(data.id_jugador) }}
    </template>
    <template #cell-id_categoria="{ data }">
      {{ data.categoria?.nombre || categoriaLabel(data.id_categoria) }}
    </template>
    <template #cell-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.nombre} ${data.jugador.apellidos}` : jugadorLabel(data.id_jugador) }}
    </template>
  </CrudDataTable>
</SectionGuard>
</template>