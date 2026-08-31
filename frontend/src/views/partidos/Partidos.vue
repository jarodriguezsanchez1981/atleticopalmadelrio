<script setup>
import { ref } from 'vue';
import EventosCalendario from '../../components/EventosCalendario.vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { partidosService } from '../../services';
import { formatFecha } from '../../utils/formatFecha';

const calendario = ref();

const columns = [
  { field: 'fecha', header: 'Fecha', type: 'text', format: formatFecha },
  { field: 'plantilla', header: 'Categoría', type: 'text',
    format: (v) => v?.categoria?.alias || v?.categoria?.nombre || '—' },
  { field: 'equipoLocal', header: 'Local', type: 'text',
    format: (v) => v?.nombre || '—' },
  { field: 'equipoVisitante', header: 'Visitante', type: 'text',
    format: (v) => v?.nombre || '—' },
  { field: 'resultado', header: 'Resultado', type: 'text' },
  { field: 'lugar', header: 'Lugar', type: 'text',
    format: (v) => v?.nombre || v || '—' }
];

const emptyItem = {};
</script>

<template>
  <div>
    <EventosCalendario
      ref="calendario"
      tipo="partido"
      title="Calendario de partidos"
      subtitle="Pincha en un día para añadir un partido. Pincha en un evento para editar o eliminar."
    />

    <div class="mt-6">
      <CrudDataTable
        title="Listado de partidos"
        :columns="columns"
        :service="partidosService"
        :emptyItem="emptyItem"
        :canCreate="false"
        :canEdit="false"
        :canDelete="false"
        :canExport="false"
      />
    </div>
  </div>
</template>
