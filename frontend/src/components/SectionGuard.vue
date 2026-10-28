<script setup>
import { useAuthStore } from '../stores/auth.store';
const props = defineProps({ seccion: { type: String, required: true } });
const auth = useAuthStore();
</script>

<template>
  <div v-if="auth.puedeVer(seccion)">
    <slot />
  </div>
  <div v-else class="text-center py-16 text-ink-tertiary">
    <i class="pi pi-lock text-4xl block mb-3"></i>
    <p class="text-lg font-medium">No tienes permiso para ver esta sección.</p>
    <p class="text-sm mt-1">Contacta con un administrador si crees que es un error.</p>
  </div>
</template>
