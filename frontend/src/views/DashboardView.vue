<script setup>
import { useAuthStore } from '../stores/auth.store';

const auth = useAuthStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Hola, {{ auth.user?.name }}</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-lg shadow p-4">
        <p class="text-sm text-gray-500">Rol</p>
        <p class="text-lg font-semibold capitalize">{{ auth.role }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <p class="text-sm text-gray-500">Categorias asignadas</p>
        <p class="text-lg font-semibold">{{ auth.categoryIds.length || 'Todas' }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <p class="text-sm text-gray-500">Acceso de gestion</p>
        <p class="text-lg font-semibold">{{ auth.canManage ? 'Si' : 'Solo lectura / asistencia' }}</p>
      </div>
    </div>

    <p class="mt-6 text-gray-600">
      Usa el menu lateral para acceder al calendario, la plantilla, entrenamientos,
      partidos y estadisticas. Las opciones de gestion (crear/editar) solo se muestran
      si tu rol tiene permiso.
    </p>
  </div>
</template>
