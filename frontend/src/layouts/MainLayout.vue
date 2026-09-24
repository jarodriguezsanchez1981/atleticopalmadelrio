<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import Drawer from 'primevue/drawer';
import { useAuthStore } from '../stores/auth.store';
import { useMediaQuery } from '../composables/useMediaQuery';
import { seccionesService } from '../services';
import { RUTA_POR_SECCION } from '../utils/seccionRoutes';
import { suscribirseCambio } from '../utils/cambioBus';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const isMobile = useMediaQuery('(max-width: 767px)');
const drawerVisible = ref(false);

function navegar() {
  drawerVisible.value = false;
}

const ALL_NAV = [
  { label: 'Dashboard', icon: 'pi pi-th-large', to: '/dashboard', seccion: 'dashboard' },
  { label: 'Calendario', icon: 'pi pi-calendar', to: '/calendario', seccion: 'calendario' },
];

// Los apartados del menú (cuáles hay, su título/icono y en qué orden se
// muestran) son fijos; qué secciones cae en cada uno y en qué orden dentro
// del apartado sale de la base de datos (secciones.grupo / .orden), editable
// desde Administración → Secciones.
const GRUPOS_MENU = [
  { clave: 'club', label: 'Club', icon: 'pi pi-building' },
  { clave: 'liga', label: 'Liga', icon: 'pi pi-flag' },
  { clave: 'competicion', label: 'Competición', icon: 'pi pi-trophy' },
  { clave: 'admin', label: 'Panel Administración', icon: 'pi pi-server' }
];

const catalogoSecciones = ref([]);
let unsubCambio = null;

async function cargarSecciones() {
  try {
    catalogoSecciones.value = await seccionesService.listar();
  } catch {
    catalogoSecciones.value = [];
  }
}

onMounted(() => {
  cargarSecciones();
  unsubCambio = suscribirseCambio(cargarSecciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

function itemsDelGrupo(clave) {
  return catalogoSecciones.value
    .filter((s) => s.grupo === clave && RUTA_POR_SECCION[s.clave] && auth.puedeVer(s.clave))
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({ label: s.nombre, icon: s.icono || 'pi pi-minus', to: RUTA_POR_SECCION[s.clave], seccion: s.clave }));
}

const gruposNav = computed(() =>
  GRUPOS_MENU
    .map((g) => ({ ...g, items: itemsDelGrupo(g.clave) }))
    .filter((g) => g.items.length)
);

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
  const allItems = [...navItems.value, ...gruposNav.value.flatMap((g) => g.items)];
  const activo = allItems.find((i) => i.to === route.path);
  return activo?.label || 'Intranet';
});

const gruposAbiertos = ref({});
function toggleGrupo(clave) {
  gruposAbiertos.value = { ...gruposAbiertos.value, [clave]: !gruposAbiertos.value[clave] };
}
function grupoActivo(grupo) {
  return grupo.items.some((i) => route.path === i.to);
}
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

        <div v-for="grupo in gruposNav" :key="grupo.clave" class="mt-4 pt-3 border-t border-white/10">
          <button
            @click="toggleGrupo(grupo.clave)"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            :class="{ '!bg-white/10 !text-white !font-medium': grupoActivo(grupo) }"
          >
            <i :class="grupo.icon" class="text-[0.85rem]" />
            <span class="flex-1 text-left">{{ grupo.label }}</span>
            <i :class="gruposAbiertos[grupo.clave] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[0.7rem]" />
          </button>
          <div v-show="gruposAbiertos[grupo.clave]" class="ml-4 mt-1 space-y-0.5">
            <router-link
              v-for="item in grupo.items"
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

        <div v-for="grupo in gruposNav" :key="grupo.clave" class="mt-4 pt-3 border-t border-white/10">
          <button
            @click="toggleGrupo(grupo.clave)"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            :class="{ '!bg-white/10 !text-white !font-medium': grupoActivo(grupo) }"
          >
            <i :class="grupo.icon" class="text-[0.85rem]" />
            <span class="flex-1 text-left">{{ grupo.label }}</span>
            <i :class="gruposAbiertos[grupo.clave] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[0.7rem]" />
          </button>
          <div v-show="gruposAbiertos[grupo.clave]" class="ml-4 mt-1 space-y-0.5">
            <router-link
              v-for="item in grupo.items"
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
