<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import { useAuthStore } from '../stores/auth.store';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const navItems = computed(() => {
  const items = [
    { label: 'Calendario', icon: 'pi pi-calendar', to: '/calendario' },
    { label: 'Entrenamientos', icon: 'pi pi-stopwatch', to: '/entrenamientos' },
    { label: 'Partidos', icon: 'pi pi-flag', to: '/partidos' },
    { label: 'Categorías', icon: 'pi pi-sitemap', to: '/categorias' },
    { label: 'Jugadores', icon: 'pi pi-users', to: '/jugadores' }
  ];
  if (auth.esAdministrador) {
    items.push({ label: 'Administración', icon: 'pi pi-shield', to: '/administracion' });
  }
  return items;
});

const menu = ref();
const userMenuItems = [
  {
    label: 'Cerrar sesión',
    icon: 'pi pi-sign-out',
    command: () => {
      auth.logout();
      router.push({ name: 'login' });
    }
  }
];

const tituloPagina = computed(() => {
  const activo = navItems.value.find(i => i.to === route.path);
  return activo?.label || 'Intranet';
});

const rolLabel = computed(() => {
  const map = { administrador: 'Administrador', coordinador: 'Coordinador', entrenador: 'Entrenador' };
  return map[auth.rol] || auth.rol;
});
</script>

<template>
  <div class="min-h-screen flex bg-club-cream">
    <!-- Sidebar -->
    <aside class="w-64 bg-club-green text-club-cream flex flex-col shrink-0">
      <div class="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <img src="/escudo.svg" alt="Escudo" class="w-10 h-10" />
        <div class="leading-tight">
          <p class="font-display text-sm tracking-wide">ATLÉTICO</p>
          <p class="font-display text-xs text-club-gold">PALMA DEL RÍO</p>
        </div>
      </div>

      <nav class="flex-1 py-4 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-5 py-2.5 text-sm text-club-cream/85 hover:bg-white/10 hover:text-club-cream transition-colors"
          active-class="!bg-white/15 !text-club-cream border-r-2 border-club-gold"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- Contenido -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <h2 class="font-display text-club-green text-lg">{{ tituloPagina }}</h2>

        <button class="flex items-center gap-3" @click="menu.toggle($event)">
          <div class="text-right leading-tight hidden sm:block">
            <p class="text-sm font-medium text-slate-700">{{ auth.nombreCompleto }}</p>
            <p class="text-xs text-slate-400">{{ rolLabel }}</p>
          </div>
          <Avatar :label="auth.user?.nombre?.[0] || 'U'" shape="circle" class="!bg-club-green !text-club-cream" />
        </button>
        <Menu ref="menu" :model="userMenuItems" :popup="true" />
      </header>

      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
