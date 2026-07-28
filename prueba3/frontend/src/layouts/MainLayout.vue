<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import { useAuthStore } from '../stores/auth.store';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const ALL_NAV = [
  { label: 'Calendario', icon: 'pi pi-calendar', to: '/calendario', seccion: 'calendario' },
  { label: 'Entrenamientos', icon: 'pi pi-stopwatch', to: '/entrenamientos', seccion: 'entrenamientos' },
  { label: 'Partidos', icon: 'pi pi-flag', to: '/partidos', seccion: 'partidos' },
  { label: 'Temporadas', icon: 'pi pi-clock', to: '/temporadas', seccion: 'temporadas' },
  { label: 'Lugares', icon: 'pi pi-map-marker', to: '/lugares', seccion: 'lugares' },
  { label: 'Categorías', icon: 'pi pi-sitemap', to: '/categorias', seccion: 'categorias' },
  { label: 'Jugadores', icon: 'pi pi-users', to: '/jugadores', seccion: 'jugadores' },
  { label: 'Entrenadores', icon: 'pi pi-id-card', to: '/entrenadores', seccion: 'entrenadores' },
  { label: 'Roles', icon: 'pi pi-key', to: '/roles', seccion: 'roles' },
  { label: 'Administración', icon: 'pi pi-shield', to: '/administracion', seccion: 'administracion' }
];

const navItems = computed(() => ALL_NAV.filter((item) => auth.puedeVer(item.seccion)));

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
  const activo = navItems.value.find((i) => i.to === route.path);
  return activo?.label || 'Intranet';
});

const rolLabel = computed(() => {
  const map = { administrador: 'Administrador', coordinador: 'Coordinador', entrenador: 'Entrenador' };
  return map[auth.rol] || auth.rol;
});
</script>

<template>
  <div class="min-h-screen flex bg-club-cream">
    <aside class="w-64 bg-club-green text-club-cream flex flex-col shrink-0">
      <div class="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img
          src="/escudo.png"
          alt="Escudo Atlético Palma del Río"
          class="w-12 h-12 object-contain shrink-0 drop-shadow"
          width="48"
          height="48"
        />
        <div class="leading-tight min-w-0">
          <p class="font-display text-sm tracking-wide">ATLÉTICO</p>
          <p class="font-display text-xs text-club-gold">PALMA DEL RÍO</p>
        </div>
      </div>

      <nav class="flex-1 py-4 space-y-1 overflow-y-auto">
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
