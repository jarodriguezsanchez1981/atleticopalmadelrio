<script setup>
import { computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { delegadosService } from '../../services';
import { validarDNI } from '../../utils/dni';

const opcionesTipo = [
  { label: 'Campo', value: 'campo' },
  { label: 'Equipo', value: 'equipo' }
];

const columns = computed(() => [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', validate: (v) => (v && !validarDNI(v) ? 'El DNI introducido no es válido.' : null) },
  { field: 'email', header: 'Email', type: 'text' },
  { field: 'telefono', header: 'Teléfono', type: 'text' },
  { field: 'fecha_nacimiento', header: 'F. Nacimiento', type: 'date' },
  { field: 'tipo', header: 'Tipo', type: 'select', options: opcionesTipo, required: true }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', dni: '', email: '', telefono: '', fecha_nacimiento: null, tipo: 'campo' };
</script>

<template>
  <CrudDataTable
    title="Delegados"
    :columns="columns"
    :service="delegadosService"
    :emptyItem="emptyItem"
    :canExport="true"
  >
    <template #cell-tipo="{ data }">
      {{ data.tipo === 'equipo' ? 'Equipo' : 'Campo' }}
    </template>
  </CrudDataTable>
</template>
