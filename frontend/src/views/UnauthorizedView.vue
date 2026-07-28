<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4">
    <h1 class="text-3xl font-bold text-red-600">Acceso no autorizado</h1>
    <p class="text-gray-600">Tu rol no tiene permiso para ver esta seccion.</p>
    <RouterLink to="/" class="text-club-primary underline">Volver al panel</RouterLink>
  </div>
</template>
