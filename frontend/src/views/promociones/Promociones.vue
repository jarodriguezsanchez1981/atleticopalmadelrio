<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { estiloTabla } from '../../utils/estiloTabla';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { promocionesService, plantillasService, categoriasService, jugadoresService, temporadasService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';

const plantillas = ref([]);
const temporadas = ref([]);
const categorias = ref([]);
const jugadores = ref([]);
const resumen = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  const [plants, temps, cats, jugs, res] = await Promise.all([
    plantillasService.listar(),
    temporadasService.listar(),
    categoriasService.listar(),
    jugadoresService.listar(),
    promocionesService.resumen()
  ]);
  plantillas.value = plants;
  temporadas.value = temps;
  categorias.value = cats;
  jugadores.value = jugs;
  resumen.value = res;
}

/** Una tabla por plantilla (de la temporada actual) con sus jugadores
 * promocionados y cuántos partidos han jugado fuera de ella: en su mismo grupo
 * de categoría (Promoción RFAF) o en otro (Promoción Categoría). */
const tablasPorPlantilla = computed(() => {
  const actuales = new Set(filtrarPlantillasTemporadaActual(plantillas.value, temporadas.value).map((p) => p.id));
  const porPlantilla = new Map();
  for (const p of resumen.value) {
    if (!actuales.has(p.id_plantilla)) continue;
    if (!porPlantilla.has(p.id_plantilla)) {
      porPlantilla.set(p.id_plantilla, {
        id: p.id_plantilla,
        titulo: `${p.plantilla?.categoria?.nombre || 'Plantilla'} · ${p.plantilla?.temporada?.nombre || ''}`,
        grupo: p.plantilla?.categoria?.grupo ?? null,
        orden: p.plantilla?.categoria?.orden ?? 999,
        filas: []
      });
    }
    porPlantilla.get(p.id_plantilla).filas.push({
      id: p.id,
      jugador: p.jugador ? `${p.jugador.nombre} ${p.jugador.apellidos}` : jugadorLabel(p.id_jugador),
      destino: p.categoria?.nombre || categoriaLabel(p.id_categoria),
      promocion_rfaf: p.promocion_rfaf,
      promocion_categoria: p.promocion_categoria
    });
  }
  return [...porPlantilla.values()]
    .sort((a, b) => a.orden - b.orden)
    .map((t) => ({
      ...t,
      filas: t.filas.sort((a, b) =>
        (b.promocion_rfaf + b.promocion_categoria) - (a.promocion_rfaf + a.promocion_categoria)
        || a.jugador.localeCompare(b.jugador, 'es'))
    }));
});

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesPlantilla = computed(() =>
  filtrarPlantillasTemporadaActual(plantillas.value, temporadas.value)
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
    .map(j => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_plantilla', header: 'Plantilla', type: 'select', options: opcionesPlantilla.value, required: true },
  { field: 'id_categoria', header: 'Categoría destino', type: 'select', options: opcionesCategoria.value, required: true },
  { field: 'id_jugador', header: 'Jugador', type: 'select', options: opcionesJugador.value, required: true }
]);

const emptyItem = { id_plantilla: null, id_categoria: null, id_jugador: null };

/** Nombre de la plantilla en la tabla: solo su categoría (sin temporada ni jugador). */
function plantillaLabel(id) {
  return plantillas.value.find(p => p.id === id)?.categoria?.nombre || '—';
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
  <div class="flex flex-col gap-6">
  <CrudDataTable
    title="Promociones"
    seccion="promociones"
    :columns="columns"
    :service="promocionesService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_plantilla="{ data }">
      {{ data.plantilla?.categoria?.nombre || plantillaLabel(data.id_plantilla) }}
    </template>
    <template #cell-id_categoria="{ data }">
      {{ data.categoria?.nombre || categoriaLabel(data.id_categoria) }}
    </template>
    <template #cell-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.nombre} ${data.jugador.apellidos}` : jugadorLabel(data.id_jugador) }}
    </template>
  </CrudDataTable>

  <section v-if="tablasPorPlantilla.length" class="flex flex-col gap-4">
    <div>
      <h2 class="font-display text-lg font-bold text-club-green">Promociones por plantilla</h2>
      <p class="text-sm text-ink-tertiary">
        Partidos jugados con otra plantilla de la temporada: <strong>Promoción RFAF</strong> si su categoría es del
        mismo grupo que la del jugador, <strong>Promoción Categoría</strong> si es de otro grupo (o no tiene grupo).
      </p>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <div v-for="t in tablasPorPlantilla" :key="t.id">
        <div class="flex items-center justify-between gap-2 mb-2">
          <h3 class="text-sm font-semibold text-ink-primary">{{ t.titulo }}</h3>
          <span class="text-xs text-ink-tertiary">Grupo {{ t.grupo ?? '—' }}</span>
        </div>
        <DataTable v-bind="estiloTabla" :value="t.filas" dataKey="id">
          <Column field="jugador" header="Jugador" sortable />
          <Column field="destino" header="Promociona a" sortable />
          <Column field="promocion_rfaf" header="Promoción RFAF" sortable style="width: 130px" class="text-center" />
          <Column field="promocion_categoria" header="Promoción Categoría" sortable style="width: 150px" class="text-center" />
        </DataTable>
      </div>
    </div>
  </section>
  </div>
</SectionGuard>
</template>