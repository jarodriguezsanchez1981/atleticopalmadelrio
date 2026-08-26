<script setup>
import { computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { jugadoresService } from '../../services';
import { validarDNI } from '../../utils/dni';

const columns = computed(() => [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', validate: (v) => (!v ? false : validarDNI(v) ? null : 'El DNI introducido no es válido.') },
  { field: 'email', header: 'Email', type: 'text' },
  { field: 'telefono', header: 'Teléfono', type: 'text' },
  { field: 'fecha_nacimiento', header: 'F. Nacimiento', type: 'date' }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', dni: '', email: '', telefono: '', fecha_nacimiento: null };

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
    :canExport="true"
  >
    <template #detail-extra="{ data }">
      <div class="border-t border-line pt-3 space-y-4">
        <div>
          <h3 class="font-display text-sm text-club-green mb-2 flex items-center gap-2">
            <i class="pi pi-stopwatch"></i> Entrenamientos ({{ (data.asistencias || []).length }})
          </h3>
          <ul v-if="(data.asistencias || []).length" class="space-y-1 text-sm">
            <li v-for="a in data.asistencias" :key="`e-${a.id}`" class="flex gap-2 text-ink-secondary">
              <span class="font-medium shrink-0">{{ formatearFecha(a.entrenamiento?.fecha) }}</span>
              <span :class="a.asistencia ? 'text-club-green' : 'text-red-500'">
                {{ a.asistencia ? 'Presente' : 'Ausente' }}
              </span>
              <span class="text-ink-tertiary">·</span>
              <span>{{ a.entrenamiento?.lugar?.nombre || '—' }}</span>
              <span v-if="a.incidencias" class="text-ink-tertiary">· {{ a.incidencias }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-ink-tertiary">Sin entrenamientos registrados.</p>
        </div>
      </div>
    </template>
  </CrudDataTable>
</template>
