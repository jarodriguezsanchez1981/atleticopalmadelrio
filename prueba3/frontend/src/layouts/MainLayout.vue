<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import { useAuthStore } from '../stores/auth.store';
import FooterSponsors from '../components/FooterSponsors.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const CLUB_SECTIONS = [
  'plantillas', 'jugadores', 'entrenadores', 'delegados',
  'categorias', 'division', 'titulos', 'temporadas',
  'lugares', 'patrocinadores'
];

const ADMIN_SECTIONS = ['administracion', 'roles'];

const ALL_NAV = [
  { label: 'Calendario', icon: 'pi pi-calendar', to: '/calendario', seccion: 'calendario' },
  { label: 'Entrenamientos', icon: 'pi pi-stopwatch', to: '/entrenamientos', seccion: 'entrenamientos' },
  { label: 'Partidos', icon: 'pi pi-flag', to: '/partidos', seccion: 'partidos' },
  { label: 'Equipos', icon: 'pi pi-trophy', to: '/equipos', seccion: 'equipos' },
  { label: 'Jornadas', icon: 'pi pi-calendar-plus', to: '/categoria-calendario', seccion: 'categoria_calendario' },
  { label: 'Sanciones', icon: 'pi pi-ban', to: '/sanciones', seccion: 'sanciones' }
];

const clubNavItems = computed(() => {
  const items = [
    { label: 'Plantillas', icon: 'pi pi-table', to: '/plantillas', seccion: 'plantillas' },
    { label: 'Jugadores', icon: 'pi pi-users', to: '/jugadores', seccion: 'jugadores' },
    { label: 'Entrenadores', icon: 'pi pi-id-card', to: '/entrenadores', seccion: 'entrenadores' },
    { label: 'Delegados', icon: 'pi pi-user-plus', to: '/delegados', seccion: 'delegados' },
    { label: 'Categorías', icon: 'pi pi-sitemap', to: '/categorias', seccion: 'categorias' },
    { label: 'División', icon: 'pi pi-tags', to: '/division', seccion: 'division' },
    { label: 'Títulos', icon: 'pi pi-graduation-cap', to: '/titulos', seccion: 'titulos' },
    { label: 'Temporadas', icon: 'pi pi-clock', to: '/temporadas', seccion: 'temporadas' },
    { label: 'Lugares', icon: 'pi pi-map-marker', to: '/lugares', seccion: 'lugares' },
    { label: 'Patrocinadores', icon: 'pi pi-briefcase', to: '/patrocinadores', seccion: 'patrocinadores' }
  ];
  return items.filter((item) => auth.puedeVer(item.seccion));
});

const adminNavItems = computed(() => {
  const items = [
    { label: 'Administración', icon: 'pi pi-cog', to: '/administracion', seccion: 'administracion' },
    { label: 'Roles', icon: 'pi pi-shield', to: '/roles', seccion: 'roles' }
  ];
  return items.filter((item) => auth.puedeVer(item.seccion));
});

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
  const allItems = [...navItems.value, ...clubNavItems.value, ...adminNavItems.value];
  const activo = allItems.find((i) => i.to === route.path);
  return activo?.label || 'Intranet';
});

const clubOpen = ref(false);
const adminOpen = ref(false);

const isClubActive = computed(() => CLUB_SECTIONS.some(s => route.path === '/' + s));
const isAdminActive = computed(() => ADMIN_SECTIONS.some(s => route.path === '/' + s));
</script>

<template>
  <div class="min-h-screen flex bg-club-cream">
    <aside class="w-64 bg-white flex flex-col shrink-0 border-r border-line">
      <div class="flex items-center gap-3 px-5 py-5 border-b border-line">
        <img
          src="/escudo.png"
          alt="Escudo Atlético Palma del Río"
          class="w-10 h-10 object-contain shrink-0"
          width="40"
          height="40"
        />
        <div class="leading-tight min-w-0">
          <p class="font-display text-sm text-ink-primary">Atlético</p>
          <p class="font-display text-xs text-ink-tertiary">Palma del Río</p>
        </div>
      </div>

      <nav class="flex-1 py-3 space-y-0.5 overflow-y-auto px-3">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-ink-secondary hover:bg-fill-hover hover:text-ink-primary transition-colors"
          active-class="!bg-club-green !text-white"
        >
          <i :class="item.icon" class="text-[0.85rem]" />
          <span>{{ item.label }}</span>
        </router-link>

        <!-- Sección Club -->
        <div v-if="clubNavItems.length" class="mt-4 pt-3 border-t border-line">
          <button
            @click="clubOpen = !clubOpen"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-ink-secondary hover:bg-fill-hover hover:text-ink-primary transition-colors w-full"
            :class="{ '!bg-club-green !text-white': isClubActive }"
          >
            <i class="pi pi-building text-[0.85rem]" />
            <span class="flex-1 text-left">Club</span>
            <i :class="clubOpen ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[0.7rem]" />
          </button>
          <div v-show="clubOpen" class="ml-4 mt-1 space-y-0.5">
            <router-link
              v-for="item in clubNavItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-ink-secondary hover:bg-fill-hover hover:text-ink-primary transition-colors"
              active-class="!bg-club-green !text-white"
            >
              <i :class="item.icon" class="text-[0.85rem]" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>

        <!-- Panel Administración -->
        <div v-if="adminNavItems.length" class="mt-4 pt-3 border-t border-line">
          <button
            @click="adminOpen = !adminOpen"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-ink-secondary hover:bg-fill-hover hover:text-ink-primary transition-colors w-full"
            :class="{ '!bg-club-green !text-white': isAdminActive }"
          >
            <i class="pi pi-server text-[0.85rem]" />
            <span class="flex-1 text-left">Panel Administración</span>
            <i :class="adminOpen ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[0.7rem]" />
          </button>
          <div v-show="adminOpen" class="ml-4 mt-1 space-y-0.5">
            <router-link
              v-for="item in adminNavItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-ink-secondary hover:bg-fill-hover hover:text-ink-primary transition-colors"
              active-class="!bg-club-green !text-white"
            >
              <i :class="item.icon" class="text-[0.85rem]" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-14 bg-white border-b border-line flex items-center justify-between px-6">
        <h2 class="font-display text-ink-primary text-lg">{{ tituloPagina }}</h2>

        <button class="flex items-center gap-3" @click="menu.toggle($event)">
          <div class="text-right leading-tight hidden sm:block">
            <p class="text-sm font-medium text-ink-secondary">{{ auth.nombreCompleto }}</p>
          </div>
          <Avatar :label="auth.user?.nombre?.[0] || 'U'" shape="circle" class="!bg-club-green !text-white" />
        </button>
        <Menu ref="menu" :model="userMenuItems" :popup="true" />
      </header>

      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>

      <FooterSponsors :with-border="false" />
    </div>
  </div>
</template>
