<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { minutosService, plantillasService, temporadasService } from '../../services';
import { estiloTabla } from '../../utils/estiloTabla';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';

/** Minutos jugados por los jugadores en los partidos de la plantilla Senior A
 * de la temporada actual (los rellena "Finalizar Acta" en Partidos). */
const CATEGORIA = CATEGORIA_CON_MINUTOS;

const plantilla = ref(null);
const filas = ref([]);
const cargando = ref(false);
let unsubCambio = null;

async function cargar() {
  cargando.value = true;
  try {
    const [plantillas, temporadas] = await Promise.all([plantillasService.listar(), temporadasService.listar()]);
    plantilla.value = filtrarPlantillasTemporadaActual(plantillas, temporadas)
      .find((p) => p.categoria?.nombre === CATEGORIA) || null;
    filas.value = plantilla.value
      ? (await minutosService.listar({ id_plantilla: plantilla.value.id }))
        .map((f) => ({ ...f, jugador: `${f.nombre} ${f.apellidos}` }))
      : [];
  } finally {
    cargando.value = false;
  }
}

const titulo = computed(() => plantilla.value
  ? `${plantilla.value.categoria?.nombre} / ${plantilla.value.temporada?.nombre || ''}`
  : CATEGORIA);

onMounted(async () => {
  await cargar();
  unsubCambio = suscribirseCambio(cargar);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});
</script>

<template>
<SectionGuard seccion="minutos">
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="font-display text-xl text-club-green">Minutos</h1>
      <p class="text-sm text-ink-tertiary">
        Partidos y minutos jugados en los partidos de <strong>{{ titulo }}</strong>, según las actas de RFAF
        (se rellenan al pulsar "Finalizar Acta" en cada partido). Los minutos local / visitante dependen de si el
        PALMA jugaba en casa o fuera.
      </p>
    </div>
    <div v-if="!cargando && !plantilla" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      No hay plantilla {{ CATEGORIA }} en la temporada actual.
    </div>
    <DataTable v-else v-bind="estiloTabla" :value="filas" :loading="cargando" dataKey="id_jugador"
               sortField="minutos" :sortOrder="-1">
      <Column field="jugador" header="Jugador" sortable />
      <Column field="partidos" header="Partidos" sortable style="width: 120px" class="text-center" />
      <Column field="minutos_local" header="Minutos local" sortable style="width: 140px" class="text-center" />
      <Column field="minutos_visitante" header="Minutos visitante" sortable style="width: 150px" class="text-center" />
      <Column field="minutos" header="Minutos" sortable style="width: 120px" class="text-center" />
      <template #empty>
        <div class="text-center text-ink-tertiary py-4 text-sm">Todavía no hay minutos: finaliza el acta de los partidos.</div>
      </template>
    </DataTable>
  </div>
</SectionGuard>
</template>
