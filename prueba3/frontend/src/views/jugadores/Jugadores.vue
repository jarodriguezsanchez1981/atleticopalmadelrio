<script setup>
import { computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { jugadoresService } from '../../services';
import { validarDNI } from '../../utils/dni';
import { formatFecha } from '../../utils/formatFecha';

const columns = computed(() => [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', validate: (v) => (!v ? false : validarDNI(v) ? null : 'El DNI introducido no es válido.') },
  { field: 'email', header: 'Email', type: 'text' },
  { field: 'telefono', header: 'Teléfono', type: 'text' },
  { field: 'fecha_nacimiento', header: 'F. Nacimiento', type: 'date', format: formatFecha }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', dni: '', email: '', telefono: '', fecha_nacimiento: null };

function formatearFecha(fecha) {
  return formatFecha(fecha);
}

function formatearPlantilla(p) {
  const parts = [];
  if (p.categoria?.alias) parts.push(p.categoria.alias);
  else if (p.categoria?.nombre) parts.push(p.categoria.nombre);
  if (p.temporada?.nombre) parts.push(p.temporada.nombre);
  if (p.division?.nombre) parts.push(p.division.nombre);
  return parts.join(' / ') || '—';
}

function formatearPartido(p) {
  const local = p.equipoLocal?.nombre || '—';
  const visitante = p.equipoVisitante?.nombre || '—';
  const fecha = formatearFecha(p.fecha);
  return { local, visitante, fecha };
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
            <i class="pi pi-table"></i> Plantillas ({{ (data.plantillas || []).length }})
          </h3>
          <div v-if="(data.plantillas || []).length" class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Plantilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Dorsal</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Talla</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in data.plantillas" :key="p.id" class="hover:bg-club-cream/50">
                  <td class="border border-line p-2 text-ink-secondary">{{ formatearPlantilla(p) }}</td>
                  <td class="border border-line p-2 text-center text-ink-secondary">{{ p.PlantillaJugador?.dorsal || '—' }}</td>
                  <td class="border border-line p-2 text-center text-ink-secondary">{{ p.PlantillaJugador?.talla || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-ink-tertiary">Sin plantillas asignadas.</p>
        </div>

        <div>
          <h3 class="font-display text-sm text-club-green mb-2 flex items-center gap-2">
            <i class="pi pi-flag"></i> Partidos ({{ (data.plantillas || []).reduce((acc, p) => acc + (p.partidos?.length || 0), 0) }})
          </h3>
          <div v-if="(data.plantillas || []).some(p => p.partidos?.length)" class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Fecha</th>
                  <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Local</th>
                  <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Visitante</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Plantilla</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in data.plantillas" :key="p.id">
                  <template v-for="partido in (p.partidos || [])" :key="partido.id">
                    <tr class="hover:bg-club-cream/50">
                      <td class="border border-line p-2 text-center text-ink-secondary">{{ formatearFecha(partido.fecha) }}</td>
                      <td class="border border-line p-2 text-ink-secondary">{{ partido.equipoLocal?.nombre || '—' }}</td>
                      <td class="border border-line p-2 text-ink-secondary">{{ partido.equipoVisitante?.nombre || '—' }}</td>
                      <td class="border border-line p-2 text-center text-ink-tertiary text-xs">{{ formatearPlantilla(p) }}</td>
                    </tr>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-ink-tertiary">Sin partidos registrados.</p>
        </div>
      </div>
    </template>
  </CrudDataTable>
</template>
