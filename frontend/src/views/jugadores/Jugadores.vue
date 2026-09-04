<script setup>
import { computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { jugadoresService } from '../../services';
import { validarDNI } from '../../utils/dni';
import { formatFechaCorta } from '../../utils/formatFecha';

const columns = computed(() => [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', validate: (v) => (!v ? false : validarDNI(v) ? null : 'El DNI introducido no es válido.') },
  { field: 'email', header: 'Email', type: 'text' },
  { field: 'telefono', header: 'Teléfono', type: 'text' },
  { field: 'fecha_nacimiento', header: 'F. Nacimiento', type: 'date', format: formatFechaCorta }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', dni: '', email: '', telefono: '', fecha_nacimiento: null };

function formatearPlantilla(p) {
  const parts = [];
  if (p.categoria?.alias) parts.push(p.categoria.alias);
  else if (p.categoria?.nombre) parts.push(p.categoria.nombre);
  if (p.temporada?.nombre) parts.push(p.temporada.nombre);
  if (p.division?.nombre) parts.push(p.division.nombre);
  return parts.join(' / ') || '—';
}
</script>

<template>
<SectionGuard seccion="jugadores">
  <CrudDataTable
    title="Jugadores"
    seccion="jugadores"
    :columns="columns"
    :service="jugadoresService"
    :emptyItem="emptyItem"
    :canExport="true"
  >
    <template #detail-extra="{ data }">
      <div v-if="(data.plantillas || []).length" class="border-t border-line pt-3">
        <h3 class="font-display text-sm text-club-green mb-2 flex items-center gap-2">
          <i class="pi pi-table"></i> Plantillas ({{ data.plantillas.length }})
        </h3>
        <DataTable :value="data.plantillas" class="ar-datatable text-sm" stripedRows size="small" dataKey="id">
          <Column header="Plantilla">
            <template #body="{ data: p }">{{ formatearPlantilla(p) }}</template>
          </Column>
        </DataTable>
      </div>
    </template>
  </CrudDataTable>
</SectionGuard>
</template>