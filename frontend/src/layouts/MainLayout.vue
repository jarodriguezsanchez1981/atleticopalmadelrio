<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import Drawer from 'primevue/drawer';
import { useAuthStore } from '../stores/auth.store';
import { useMediaQuery } from '../composables/useMediaQuery';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const isMobile = useMediaQuery('(max-width: 767px)');
const drawerVisible = ref(false);

function navegar() {
  drawerVisible.value = false;
}

const CLUB_SECTIONS = [
  'plantillas', 'promociones', 'jugadores', 'entrenadores', 'delegados',
  'categorias', 'division', 'posicion', 'titulos', 'temporadas',
  'lugares', 'material', 'entrenamientos'
];

const COMPETICION_SECTIONS = ['categoria_calendario', 'torneo', 'equipos', 'equipos_jugadores', 'partidos', 'sanciones', 'informes'];

const ADMIN_SECTIONS = ['administracion', 'cambios'];

const ALL_NAV = [
  { label: 'Calendario', icon: 'pi pi-calendar', to: '/calendario', seccion: 'calendario' },
];

const clubNavItems = computed(() => {
  const items = [
    { label: 'Plantillas', icon: 'pi pi-table', to: '/plantillas', seccion: 'plantillas' },
    { label: 'Promociones', icon: 'pi pi-arrow-up', to: '/promociones', seccion: 'promociones' },
    { label: 'Jugadores', icon: 'pi pi-users', to: '/jugadores', seccion: 'jugadores' },
    { label: 'Entrenadores', icon: 'pi pi-id-card', to: '/entrenadores', seccion: 'entrenadores' },
    { label: 'Delegados', icon: 'pi pi-user-plus', to: '/delegados', seccion: 'delegados' },
    { label: 'Categorías', icon: 'pi pi-sitemap', to: '/categorias', seccion: 'categorias' },
    { label: 'División', icon: 'pi pi-tags', to: '/division', seccion: 'division' },
    { label: 'Posición', icon: 'pi pi-directions', to: '/posicion', seccion: 'posicion' },
    { label: 'Títulos', icon: 'pi pi-graduation-cap', to: '/titulos', seccion: 'titulos' },
    { label: 'Temporadas', icon: 'pi pi-clock', to: '/temporadas', seccion: 'temporadas' },
    { label: 'Lugares', icon: 'pi pi-map-marker', to: '/lugares', seccion: 'lugares' },
    { label: 'Material', icon: 'pi pi-box', to: '/material', seccion: 'material' },
    { label: 'Entrenamientos', icon: 'pi pi-stopwatch', to: '/entrenamientos', seccion: 'entrenamientos' }
  ];
  return items.filter((item) => auth.puedeVer(item.seccion));
});

const competicionNavItems = computed(() => {
  const items = [
    { label: 'Jornadas', icon: 'pi pi-calendar-plus', to: '/categoria-calendario', seccion: 'categoria_calendario' },
    { label: 'Torneo', icon: 'pi pi-trophy', to: '/torneo', seccion: 'torneo' },
    { label: 'Equipos', icon: 'pi pi-trophy', to: '/equipos', seccion: 'equipos' },
    { label: 'Jugadores de Equipos', icon: 'pi pi-user', to: '/equipos-jugadores', seccion: 'equipos_jugadores' },
    { label: 'Partidos', icon: 'pi pi-flag', to: '/partidos', seccion: 'partidos' },
    { label: 'Sanciones', icon: 'pi pi-ban', to: '/sanciones', seccion: 'sanciones' },
    { label: 'Informes', icon: 'pi pi-file', to: '/informes', seccion: 'informes' }
  ];
  return items.filter((item) => auth.puedeVer(item.seccion));
});

const adminNavItems = computed(() => {
  const items = [
    { label: 'Administración', icon: 'pi pi-cog', to: '/administracion', seccion: 'administracion' },
    { label: 'Cambios', icon: 'pi pi-history', to: '/cambios', seccion: 'cambios' }
  ];
  return items.filter((item) => auth.puedeVer(item.seccion));
});

const navItems = computed(() => ALL_NAV.filter((item) => auth.puedeVer(item.seccion)));

const ROL_LABELS = { coordinador: 'Coordinador', entrenador: 'Entrenador' };
const rolLabel = computed(() => ROL_LABELS[auth.rol] || auth.rol);

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
  const allItems = [...navItems.value, ...clubNavItems.value, ...competicionNavItems.value, ...adminNavItems.value];
  const activo = allItems.find((i) => i.to === route.path);
  return activo?.label || 'Intranet';
});

const clubOpen = ref(false);
const adminOpen = ref(false);
const competicionOpen = ref(false);

const isClubActive = computed(() => CLUB_SECTIONS.some(s => route.path === '/' + s));
const isAdminActive = computed(() => ADMIN_SECTIONS.some(s => route.path === '/' + s));
const isCompeticionActive = computed(() => COMPETICION_SECTIONS.some(s => route.path === '/' + s));
</script>

<template>
  <div class="min-h-screen flex bg-club-cream">

    <!-- Sidebar Desktop -->
    <aside v-if="!isMobile" class="w-64 bg-club-green flex flex-col shrink-0 shadow-panel relative z-10">
      <div class="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img
          src="/escudo.png"
          alt="Escudo Atlético Palma del Río"
          class="w-10 h-10 object-contain shrink-0"
          width="40"
          height="40"
        />
        <div class="leading-tight min-w-0">
          <p class="font-display text-sm text-white">Atlético</p>
          <p class="font-display text-xs text-white/60">Palma del Río</p>
        </div>
      </div>

      <nav class="flex-1 py-3 space-y-0.5 overflow-y-auto px-3">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          active-class="!bg-white/10 !text-white !font-medium !border-l-2 !border-white !pl-[10px]"
        >
          <i :class="item.icon" class="text-[0.85rem]" />
          <span>{{ item.label }}</span>
        </router-link>

        <!-- Sección Club -->
        <div v-if="clubNavItems.length" class="mt-4 pt-3 border-t border-white/10">
          <button
            @click="clubOpen = !clubOpen"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            :class="{ '!bg-white/10 !text-white !font-medium': isClubActive }"
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
              class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              active-class="!bg-white/10 !text-white !font-medium !border-l-2 !border-white !pl-[10px]"
            >
              <i :class="item.icon" class="text-[0.85rem]" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>

        <!-- Sección Competición -->
        <div v-if="competicionNavItems.length" class="mt-4 pt-3 border-t border-white/10">
          <button
            @click="competicionOpen = !competicionOpen"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            :class="{ '!bg-white/10 !text-white !font-medium': isCompeticionActive }"
          >
            <i class="pi pi-trophy text-[0.85rem]" />
            <span class="flex-1 text-left">Competición</span>
            <i :class="competicionOpen ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[0.7rem]" />
          </button>
          <div v-show="competicionOpen" class="ml-4 mt-1 space-y-0.5">
            <router-link
              v-for="item in competicionNavItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              active-class="!bg-white/10 !text-white !font-medium !border-l-2 !border-white !pl-[10px]"
            >
              <i :class="item.icon" class="text-[0.85rem]" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>

        <!-- Panel Administración -->
        <div v-if="adminNavItems.length" class="mt-4 pt-3 border-t border-white/10">
          <button
            @click="adminOpen = !adminOpen"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            :class="{ '!bg-white/10 !text-white !font-medium': isAdminActive }"
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
              class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              active-class="!bg-white/10 !text-white !font-medium !border-l-2 !border-white !pl-[10px]"
            >
              <i :class="item.icon" class="text-[0.85rem]" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>
      </nav>
    </aside>

    <!-- Drawer Mobile -->
    <Drawer v-model:visible="drawerVisible" :showCloseIcon="true" class="!w-72">
      <template #header>
        <div class="flex items-center gap-3">
          <img src="/escudo.png" alt="Escudo" class="w-10 h-10 object-contain" />
          <div class="leading-tight">
            <p class="font-display text-sm text-white">Atlético</p>
            <p class="font-display text-xs text-white/60">Palma del Río</p>
          </div>
        </div>
      </template>
      <nav class="space-y-0.5">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          active-class="!bg-white/10 !text-white !font-medium !border-l-2 !border-white !pl-[10px]"
          @click="navegar"
        >
          <i :class="item.icon" class="text-[0.85rem]" />
          <span>{{ item.label }}</span>
        </router-link>

        <div v-if="clubNavItems.length" class="mt-4 pt-3 border-t border-white/10">
          <button
            @click="clubOpen = !clubOpen"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            :class="{ '!bg-white/10 !text-white !font-medium': isClubActive }"
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
              class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              active-class="!bg-white/10 !text-white !font-medium !border-l-2 !border-white !pl-[10px]"
              @click="navegar"
            >
              <i :class="item.icon" class="text-[0.85rem]" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>

        <div v-if="competicionNavItems.length" class="mt-4 pt-3 border-t border-white/10">
          <button
            @click="competicionOpen = !competicionOpen"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            :class="{ '!bg-white/10 !text-white !font-medium': isCompeticionActive }"
          >
            <i class="pi pi-trophy text-[0.85rem]" />
            <span class="flex-1 text-left">Competición</span>
            <i :class="competicionOpen ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[0.7rem]" />
          </button>
          <div v-show="competicionOpen" class="ml-4 mt-1 space-y-0.5">
            <router-link
              v-for="item in competicionNavItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              active-class="!bg-white/10 !text-white !font-medium !border-l-2 !border-white !pl-[10px]"
              @click="navegar"
            >
              <i :class="item.icon" class="text-[0.85rem]" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>

        <div v-if="adminNavItems.length" class="mt-4 pt-3 border-t border-white/10">
          <button
            @click="adminOpen = !adminOpen"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            :class="{ '!bg-white/10 !text-white !font-medium': isAdminActive }"
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
              class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              active-class="!bg-white/10 !text-white !font-medium !border-l-2 !border-white !pl-[10px]"
              @click="navegar"
            >
              <i :class="item.icon" class="text-[0.85rem]" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>
      </nav>
    </Drawer>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-20 bg-white border-b border-line flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_2px_rgb(16_24_40_/_0.04)]">
        <div class="flex items-center gap-3">
          <button
            v-if="isMobile"
            @click="drawerVisible = true"
            class="pi pi-bars text-xl text-ink-secondary hover:text-ink-primary transition-colors"
          />
        </div>

        <button class="flex items-center gap-3" @click="menu.toggle($event)">
          <div class="text-right leading-tight max-w-[45vw] sm:max-w-none">
            <p class="text-sm font-medium text-ink-primary truncate">{{ auth.nombreCompleto }}</p>
            <p class="text-xs text-ink-tertiary truncate">{{ rolLabel }}</p>
          </div>
          <Avatar :label="auth.user?.nombre?.[0] || 'U'" shape="circle" class="!bg-club-green !text-white" />
        </button>
        <Menu ref="menu" :model="userMenuItems" :popup="true" />
      </header>

      <main class="flex-1 overflow-y-auto p-5 sm:p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style>
/* El Drawer de PrimeVue se teletransporta a <body>, fuera del árbol
   del componente: estas reglas deben ser globales (no scoped/:deep). */
.p-drawer {
  background: #0F3D22 !important;
  color: #fff !important;
}
.p-drawer-header {
  border-bottom: 1px solid rgb(255 255 255 / 10%) !important;
}
.p-drawer-close-button {
  color: rgb(255 255 255 / 70%) !important;
}
.p-drawer-close-button:hover {
  background: rgb(255 255 255 / 10%) !important;
  color: #fff !important;
}
</style>
