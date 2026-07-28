<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const auth = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-club-primary text-white flex flex-col">
      <div class="p-4 text-xl font-bold border-b border-white/10">Club Futbol</div>

      <nav class="flex-1 p-2 space-y-1">
        <RouterLink to="/" class="nav-link"><i class="pi pi-home mr-2" />Panel</RouterLink>
        <RouterLink to="/calendario" class="nav-link"><i class="pi pi-calendar mr-2" />Calendario</RouterLink>
        <RouterLink to="/plantilla" class="nav-link"><i class="pi pi-users mr-2" />Plantilla</RouterLink>
        <RouterLink to="/entrenamientos" class="nav-link"><i class="pi pi-bolt mr-2" />Entrenamientos</RouterLink>
        <RouterLink to="/partidos" class="nav-link"><i class="pi pi-flag mr-2" />Partidos</RouterLink>
        <RouterLink to="/estadisticas" class="nav-link"><i class="pi pi-chart-bar mr-2" />Estadisticas</RouterLink>

        <!-- Solo admin y coordinador gestionan categorias -->
        <RouterLink v-if="auth.canManage" to="/categorias" class="nav-link">
          <i class="pi pi-sitemap mr-2" />Categorias
        </RouterLink>
      </nav>

      <div class="p-4 border-t border-white/10 text-sm">
        <p class="font-semibold">{{ auth.user?.name }}</p>
        <p class="text-white/60 capitalize">{{ auth.role }}</p>
        <button class="mt-2 text-club-accent hover:underline" @click="handleLogout">
          Cerrar sesion
        </button>
      </div>
    </aside>

    <!-- Contenido -->
    <main class="flex-1 p-6 overflow-y-auto">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.nav-link {
  @apply flex items-center px-3 py-2 rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors;
}
.router-link-active.nav-link {
  @apply bg-club-accent/90 text-club-primary font-semibold;
}
</style>
