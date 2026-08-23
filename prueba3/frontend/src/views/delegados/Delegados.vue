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
  { field: 'dni', header: 'DNI', type: 'text', required: true, validate: (v) => (!v ? false : validarDNI(v) ? null : 'El DNI introducido no es válido.') },
  { field: 'tipo', header: 'Tipo', type: 'select', options: opcionesTipo, required: true }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', dni: '', tipo: 'campo' };
</script>

<template>
  <CrudDataTable
    title="Delegados"
    :columns="columns"
    :service="delegadosService"
    :emptyItem="emptyItem"
  >
    <template #cell-tipo="{ data }">
      {{ data.tipo === 'equipo' ? 'Equipo' : 'Campo' }}
    </template>
  </CrudDataTable>
</template>
