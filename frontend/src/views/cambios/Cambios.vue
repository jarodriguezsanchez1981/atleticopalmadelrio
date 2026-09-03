<script setup>
import { computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { cambiosService } from '../../services';
import Tag from 'primevue/tag';

const ENTIDADES = {
  usuarios: 'Usuarios',
  temporadas: 'Temporadas',
  lugares: 'Lugares', titulos: 'Títulos', divisiones: 'Divisiones',
  delegados: 'Delegados', categorias: 'Categorías', jugadores: 'Jugadores',
  entrenadores: 'Entrenadores', entrenamientos: 'Entrenamientos',
  partidos: 'Partidos', equipos: 'Equipos', 'tipos-futbol': 'Tipos de fútbol',
  patrocinadores: 'Patrocinadores', jornadas: 'Jornadas', sanciones: 'Sanciones',
  plantillas: 'Plantillas', 'entrenamientos-jugadores': 'Entrenamientos-Jugadores',
  calendario: 'Calendario', resultados: 'Resultados', promociones: 'Promociones'
};

const ACCION_SEVERITY = {
  crear: 'success', editar: 'info', eliminar: 'danger'
};

const columns = [
  { field: 'created_at', header: 'Fecha', type: 'text', enForm: false,
    format: (v) => {
      if (!v) return '—';
      const d = new Date(v);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
    }
  },
  { field: 'entidad', header: 'Entidad', type: 'text', enForm: false,
    format: (v) => ENTIDADES[v] || v },
  { field: 'accion', header: 'Acción', type: 'text', enForm: false },
  { field: 'usuario', header: 'Usuario', type: 'text', enForm: false, soloTabla: true },
  { field: 'id_registro', header: 'ID', type: 'text', enForm: false },
  { field: 'datos_previos', header: 'Antes', type: 'text', enForm: false,
    format: (v) => v ? JSON.stringify(v).substring(0, 80) + '…' : '—' },
  { field: 'datos_nuevos', header: 'Después', type: 'text', enForm: false,
    format: (v) => v ? JSON.stringify(v).substring(0, 80) + '…' : '—' }
];

const emptyItem = {};
</script>

<template>
<SectionGuard seccion="cambios">
  <div>
    <h1 class="font-display text-xl text-club-green mb-1 flex items-center gap-2">
      <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
      Cambios
    </h1>
    <p class="text-sm text-ink-tertiary mb-4">
      Registro de todas las acciones realizadas en la intranet.
    </p>

    <CrudDataTable
      title="Cambios"
    seccion="cambios"
      :columns="columns"
      :service="cambiosService"
      :emptyItem="emptyItem"
      :permisoCrear="false"
      :permisoEditar="false"
      :permisoEliminar="false"
      :canExport="false"
    >
      <template #cell-accion="{ data }">
        <Tag :value="data.accion" :severity="ACCION_SEVERITY[data.accion] || 'secondary'" />
      </template>
      <template #cell-usuario="{ data }">
        <span class="text-sm">{{ data.usuario?.nombre }} {{ data.usuario?.apellidos }}</span>
      </template>
      <template #cell-datos_previos="{ data }">
        <span class="text-xs text-ink-tertiary font-mono break-all">
          {{ data.datos_previos ? JSON.stringify(data.datos_previos).substring(0, 100) + '…' : '—' }}
        </span>
      </template>
      <template #cell-datos_nuevos="{ data }">
        <span class="text-xs text-ink-tertiary font-mono break-all">
          {{ data.datos_nuevos ? JSON.stringify(data.datos_nuevos).substring(0, 100) + '…' : '—' }}
        </span>
      </template>
      <template #detail-usuario="{ data }">
        {{ data.usuario?.nombre }} {{ data.usuario?.apellidos }} ({{ data.usuario?.usuario }})
      </template>
      <template #detail-datos_previos="{ data }">
        <pre v-if="data.datos_previos" class="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">{{ JSON.stringify(data.datos_previos, null, 2) }}</pre>
        <span v-else class="text-ink-tertiary">—</span>
      </template>
      <template #detail-datos_nuevos="{ data }">
        <pre v-if="data.datos_nuevos" class="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">{{ JSON.stringify(data.datos_nuevos, null, 2) }}</pre>
        <span v-else class="text-ink-tertiary">—</span>
      </template>
    </CrudDataTable>
  </div>
</SectionGuard>
</template>