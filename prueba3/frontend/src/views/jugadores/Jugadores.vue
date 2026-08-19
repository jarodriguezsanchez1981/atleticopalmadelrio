<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { jugadoresService, categoriasService, temporadasService } from '../../services';
import { validarDNI } from '../../utils/dni';

const categorias = ref([]);
const temporadas = ref([]);

onMounted(async () => {
  const [cats, temps] = await Promise.all([
    categoriasService.listar(),
    temporadasService.listar()
  ]);
  categorias.value = cats;
  temporadas.value = temps;
});

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
  { field: 'dorsal', header: 'Dorsal', type: 'number', min: 1, max: 99 },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', required: true, validate: (v) => (!v ? false : validarDNI(v) ? null : 'El DNI introducido no es válido.') },
  { field: 'id_temporada', header: 'Temporada', type: 'select', options: opcionesTemporada.value, required: true },
  { field: 'ids_categorias', header: 'Categorías', type: 'multiselect', relation: 'categorias', options: opcionesCategoria.value, required: false }
]);

const emptyItem = { foto: null, dorsal: null, nombre: '', apellidos: '', dni: '', id_temporada: null, ids_categorias: [] };

function nombresCategorias(data) {
  if (data.categorias?.length) return data.categorias.map(c => `${c.nombre} (${c.temporada?.nombre || ''})`).join(', ');
  const ids = data.ids_categorias || [];
  return ids.map(id => opcionesCategoria.value.find(o => o.value === id)?.label || id).join(', ') || '—';
}

function nombreTemporada(id) {
  return temporadas.value.find(t => t.id === id)?.nombre || '—';
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <CrudDataTable
    title="Jugadores"
    :columns="columns"
    :service="jugadoresService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_temporada="{ data }">
      {{ data.temporada?.nombre || nombreTemporada(data.id_temporada) }}
    </template>
    <template #cell-ids_categorias="{ data }">
      {{ nombresCategorias(data) }}
    </template>
    <template #detail-ids_categorias="{ data }">
      {{ nombresCategorias(data) }}
    </template>

    <template #detail-extra="{ data }">
      <div class="border-t border-slate-200 pt-3 space-y-4">
        <div>
          <h3 class="font-display text-sm text-club-green mb-2 flex items-center gap-2">
            <i class="pi pi-flag"></i> Partidos disputados ({{ (data.convocatorias || []).length }})
          </h3>
          <ul v-if="(data.convocatorias || []).length" class="space-y-1 text-sm">
            <li v-for="c in data.convocatorias" :key="`p-${c.id}`" class="flex gap-2 text-slate-700">
              <span class="font-medium shrink-0">{{ formatearFecha(c.partido?.fecha) }}</span>
              <span>{{ c.partido?.equipo?.nombre || '—' }}</span>
              <span class="text-slate-400">·</span>
              <span>{{ c.partido?.lugar?.nombre || '—' }}</span>
              <span class="text-slate-400">·</span>
              <span>{{ c.partido?.categoria?.nombre || '—' }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-400">Sin partidos registrados.</p>
        </div>

        <div>
          <h3 class="font-display text-sm text-club-green mb-2 flex items-center gap-2">
            <i class="pi pi-stopwatch"></i> Entrenamientos ({{ (data.asistencias || []).length }})
          </h3>
          <ul v-if="(data.asistencias || []).length" class="space-y-1 text-sm">
            <li v-for="a in data.asistencias" :key="`e-${a.id}`" class="flex gap-2 text-slate-700">
              <span class="font-medium shrink-0">{{ formatearFecha(a.entrenamiento?.fecha) }}</span>
              <span :class="a.asistencia ? 'text-club-green' : 'text-red-500'">
                {{ a.asistencia ? 'Presente' : 'Ausente' }}
              </span>
              <span class="text-slate-400">·</span>
              <span>{{ a.entrenamiento?.lugar?.nombre || '—' }}</span>
              <span v-if="a.incidencias" class="text-slate-400">· {{ a.incidencias }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-400">Sin entrenamientos registrados.</p>
        </div>
      </div>
    </template>
  </CrudDataTable>
</template>
