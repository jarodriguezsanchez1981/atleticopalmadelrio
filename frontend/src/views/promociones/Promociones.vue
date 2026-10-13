<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { estiloTabla } from '../../utils/estiloTabla';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { promocionesService, plantillasService, categoriasService, jugadoresService, temporadasService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual, obtenerTemporadaActual } from '../../utils/temporadaActual';

const plantillas = ref([]);
const temporadas = ref([]);
const categorias = ref([]);
const jugadores = ref([]);
const resumen = ref([]);
// Filas desplegadas (partidos de la promoción) de cada tabla, por plantilla.
const desplegadas = ref({});
let unsubCambio = null;

async function cargarOpciones() {
  const [plants, temps, cats, jugs, res] = await Promise.all([
    plantillasService.listar({ basico: 1 }),
    temporadasService.listar(),
    categoriasService.listar(),
    jugadoresService.listar({ basico: 1 }),
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
  // Temporada actual por la propia promoción (un entrenador no ve las
  // plantillas de origen de otras categorías, p. ej. la de Juvenil).
  const actual = obtenerTemporadaActual(temporadas.value);
  const porPlantilla = new Map();
  for (const p of resumen.value) {
    if (actual && Number(p.plantilla?.id_temporada) !== Number(actual.id)) continue;
    if (!porPlantilla.has(p.id_plantilla)) {
      porPlantilla.set(p.id_plantilla, {
        id: p.id_plantilla,
        titulo: `${p.plantilla?.categoria?.nombre || 'Plantilla'} · ${p.plantilla?.temporada?.nombre || ''}`,
        grupo: p.plantilla?.categoria?.grupo ?? null,
        orden: p.plantilla?.categoria?.orden ?? 999,
        id_tipofutbol: p.plantilla?.categoria?.id_tipofutbol ?? null,
        tipofutbol: p.plantilla?.categoria?.tipofutbol?.nombre || 'Sin tipo de fútbol',
        filas: []
      });
    }
    porPlantilla.get(p.id_plantilla).filas.push({
      id: p.id,
      jugador: p.jugador ? `${p.jugador.nombre} ${p.jugador.apellidos}` : jugadorLabel(p.id_jugador),
      destino: p.categoria?.nombre || categoriaLabel(p.id_categoria),
      promocion_rfaf: p.promocion_rfaf,
      promocion_categoria: p.promocion_categoria,
      partidos: p.partidos || []
    });
  }
  return [...porPlantilla.values()]
    .sort((a, b) => Number(a.orden) - Number(b.orden) || a.titulo.localeCompare(b.titulo, 'es'))
    .map((t) => ({
      ...t,
      filas: t.filas.sort((a, b) =>
        (b.promocion_rfaf + b.promocion_categoria) - (a.promocion_rfaf + a.promocion_categoria)
        || a.jugador.localeCompare(b.jugador, 'es'))
    }));
});

/** Las tablas en una sección por tipo de fútbol (Fútbol 7, Fútbol 11), cada
 * una con sus plantillas por orden de categoría. */
const seccionesPorTipo = computed(() => {
  const porTipo = new Map();
  for (const t of tablasPorPlantilla.value) {
    if (!porTipo.has(t.id_tipofutbol)) porTipo.set(t.id_tipofutbol, { id: t.id_tipofutbol, titulo: t.tipofutbol, tablas: [] });
    porTipo.get(t.id_tipofutbol).tablas.push(t);
  }
  return [...porTipo.values()].sort((a, b) => (a.id ?? 99) - (b.id ?? 99));
});

function formatoFecha(fecha) {
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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
    ocultarTabla
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
    <!-- Una sección por tipo de fútbol; dentro, una tabla debajo de otra por orden de categoría. -->
    <div v-for="s in seccionesPorTipo" :key="s.id ?? 'sin-tipo'" class="mb-6 last:mb-0">
    <h3 class="font-display text-base font-bold text-club-green border-b border-line pb-1 mb-3">{{ s.titulo }}</h3>
    <div class="flex flex-col gap-4">
      <div v-for="t in s.tablas" :key="t.id">
        <div class="flex items-center justify-between gap-2 mb-2">
          <h3 class="text-sm font-semibold text-ink-primary">{{ t.titulo }}</h3>
          <span class="text-xs text-ink-tertiary">Grupo {{ t.grupo ?? '—' }}</span>
        </div>
        <!-- Mismo ancho de columnas en todas las tablas (table-layout fijo); cada
             fila se despliega con los partidos que ha jugado en la promoción. -->
        <DataTable v-bind="estiloTabla" :value="t.filas" dataKey="id"
                   v-model:expandedRows="desplegadas[t.id]"
                   :tableStyle="{ tableLayout: 'fixed', minWidth: '640px' }">
          <Column expander style="width: 3rem" />
          <Column field="jugador" header="Jugador" sortable style="width: 34%" />
          <Column field="destino" header="Promociona a" sortable style="width: 26%" />
          <Column field="promocion_rfaf" header="Promoción RFAF" sortable style="width: 20%" class="text-center" />
          <Column field="promocion_categoria" header="Promoción Categoría" sortable style="width: 20%" class="text-center" />
          <template #expansion="{ data }">
            <div v-if="!data.partidos.length" class="text-sm text-ink-tertiary py-2 px-2">
              No ha jugado ningún partido con otra plantilla.
            </div>
            <div v-else class="overflow-x-auto py-1">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-xs text-ink-tertiary text-left">
                    <th class="font-medium p-2">Fecha</th>
                    <th class="font-medium p-2 text-center">Jornada</th>
                    <th class="font-medium p-2">Categoría</th>
                    <th class="font-medium p-2">Rival</th>
                    <th class="font-medium p-2 text-center">Resultado</th>
                    <th class="font-medium p-2">Promoción</th>
                    <th class="font-medium p-2 text-center">Min.</th>
                    <th class="font-medium p-2 text-center">Goles</th>
                    <th class="font-medium p-2 text-center">TA</th>
                    <th class="font-medium p-2 text-center">TR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in data.partidos" :key="p.id_partido" class="border-t border-line">
                    <td class="p-2 whitespace-nowrap tabular-nums">{{ formatoFecha(p.fecha) }}</td>
                    <td class="p-2 text-center tabular-nums">{{ p.jornada ?? '—' }}</td>
                    <td class="p-2 whitespace-nowrap">{{ p.categoria || '—' }}</td>
                    <td class="p-2">{{ p.es_local ? 'vs' : '@' }} {{ p.rival || '—' }}</td>
                    <td class="p-2 text-center tabular-nums whitespace-nowrap">{{ p.suspendido ? 'Suspendido' : (p.resultado || '—') }}</td>
                    <td class="p-2 whitespace-nowrap">{{ p.tipo === 'rfaf' ? 'RFAF' : 'Categoría' }}</td>
                    <td class="p-2 text-center tabular-nums">{{ p.minutos ?? '—' }}</td>
                    <td class="p-2 text-center tabular-nums">{{ p.goles }}</td>
                    <td class="p-2 text-center tabular-nums">{{ p.tarjeta_amarilla }}</td>
                    <td class="p-2 text-center tabular-nums">{{ p.tarjeta_roja }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </DataTable>
      </div>
    </div>
    </div>
  </section>
  </div>
</SectionGuard>
</template>