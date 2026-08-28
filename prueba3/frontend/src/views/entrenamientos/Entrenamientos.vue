<script setup>
import { ref } from 'vue';
import EventosCalendario from '../../components/EventosCalendario.vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { entrenamientosService } from '../../services';
import { formatFecha } from '../../utils/formatFecha';

const calendario = ref();

const columns = [
  { field: 'fecha', header: 'Fecha', type: 'text', format: formatFecha },
  { field: 'plantilla', header: 'Categoría', type: 'text',
    format: (v) => v?.categoria?.alias || v?.categoria?.nombre || '—' },
  { field: 'lugar', header: 'Lugar', type: 'text',
    format: (v) => v?.nombre || '—' },
  { field: 'recurrente', header: 'Recurrente', type: 'text',
    format: (v) => v ? 'Sí' : 'No' }
];

const emptyItem = {};
</script>

<template>
  <div>
    <EventosCalendario
      ref="calendario"
      tipo="entrenamiento"
      title="Calendario de entrenamientos"
      subtitle="Pincha en un día para añadir un entrenamiento. Pincha en un evento para editar o eliminar."
    />

    <div class="mt-6">
      <CrudDataTable
        title="Listado de entrenamientos"
        :columns="columns"
        :service="entrenamientosService"
        :emptyItem="emptyItem"
        :canCreate="false"
        :canEdit="false"
        :canDelete="false"
        :canExport="false"
      />
    </div>
  </div>
</template>
