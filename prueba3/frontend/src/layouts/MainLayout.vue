<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import { useAuthStore } from '../stores/auth.store';
import { patrocinadoresService } from '../services';
import { suscribirseCambio } from '../utils/cambioBus';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const patrocinadores = ref([]);

const principal = computed(() =>
  patrocinadores.value.find((p) => p.tipo === 'principal') ||
  patrocinadores.value.find((p) => Number(p.orden) === 1) || null
);
const oficiales = computed(() =>
  patrocinadores.value
    .filter((p) => p.tipo === 'oficial')
    .sort((a, b) => Number(a.orden) - Number(b.orden))
);
const colaboradores = computed(() =>
  patrocinadores.value
    .filter((p) => p.tipo === 'colaborador')
    .sort((a, b) => Number(a.orden) - Number(b.orden))
);

async function cargarPatrocinadores() {
  try {
    patrocinadores.value = await patrocinadoresService.listar();
  } catch {
    patrocinadores.value = [];
  }
}

onMounted(() => {
  cargarPatrocinadores();
  const desuscribir = suscribirseCambio(cargarPatrocinadores);
  onUnmounted(desuscribir);
});

const ALL_NAV = [
  { label: 'Calendario', icon: 'pi pi-calendar', to: '/calendario', seccion: 'calendario' },
  { label: 'Entrenamientos', icon: 'pi pi-stopwatch', to: '/entrenamientos', seccion: 'entrenamientos' },
  { label: 'Entrenamientos Jugadores', icon: 'pi pi-check-square', to: '/entrenamientos-jugadores', seccion: 'entrenamientos_jugadores' },
  { label: 'Partidos', icon: 'pi pi-flag', to: '/partidos', seccion: 'partidos' },
  { label: 'Convocatorias', icon: 'pi pi-list-check', to: '/partidos-jugadores', seccion: 'partidos_jugadores' },
  { label: 'Resultados', icon: 'pi pi-chart-bar', to: '/resultados', seccion: 'resultados' },
  { label: 'Temporadas', icon: 'pi pi-clock', to: '/temporadas', seccion: 'temporadas' },
  { label: 'Títulos', icon: 'pi pi-graduation-cap', to: '/titulos', seccion: 'titulos' },
  { label: 'División', icon: 'pi pi-tags', to: '/division', seccion: 'division' },
  { label: 'Lugares', icon: 'pi pi-map-marker', to: '/lugares', seccion: 'lugares' },
  { label: 'Delegados', icon: 'pi pi-user-plus', to: '/delegados', seccion: 'delegados' },
  { label: 'Categorías', icon: 'pi pi-sitemap', to: '/categorias', seccion: 'categorias' },
  { label: 'Equipos', icon: 'pi pi-trophy', to: '/equipos', seccion: 'equipos' },
  { label: 'Incidencias', icon: 'pi pi-exclamation-triangle', to: '/incidencias', seccion: 'incidencias' },
  { label: 'Jugadores', icon: 'pi pi-users', to: '/jugadores', seccion: 'jugadores' },
  { label: 'Entrenadores', icon: 'pi pi-id-card', to: '/entrenadores', seccion: 'entrenadores' },
  { label: 'Roles', icon: 'pi pi-shield', to: '/roles', seccion: 'roles' },
  { label: 'Patrocinadores', icon: 'pi pi-briefcase', to: '/patrocinadores', seccion: 'patrocinadores' },
  { label: 'Jornadas', icon: 'pi pi-calendar-plus', to: '/categoria-calendario', seccion: 'categoria_calendario' },
  { label: 'Sanciones', icon: 'pi pi-ban', to: '/sanciones', seccion: 'sanciones' },
  { label: 'Administración', icon: 'pi pi-cog', to: '/administracion', seccion: 'administracion' }
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
</script>

<template>
  <div class="min-h-screen flex bg-club-cream">
    <aside class="w-64 bg-club-cream text-club-green flex flex-col shrink-0 border-r border-slate-200">
      <div class="flex items-center gap-3 px-5 py-5 border-b border-slate-200">
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

      <nav class="flex-1 py-4 space-y-0.5 overflow-y-auto px-3">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg text-club-green/70 hover:bg-club-green hover:text-club-cream transition-colors"
          active-class="!bg-club-green !text-club-cream border-l-2 border-club-gold"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
        <h2 class="font-display text-club-green text-lg">{{ tituloPagina }}</h2>

        <button class="flex items-center gap-3" @click="menu.toggle($event)">
          <div class="text-right leading-tight hidden sm:block">
            <p class="text-sm font-medium text-slate-700">{{ auth.nombreCompleto }}</p>
          </div>
          <Avatar :label="auth.user?.nombre?.[0] || 'U'" shape="circle" class="!bg-club-green !text-club-cream" />
        </button>
        <Menu ref="menu" :model="userMenuItems" :popup="true" />
      </header>

      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>

      <footer v-if="patrocinadores.length" class="bg-club-cream px-6 py-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div v-if="principal" class="flex flex-col items-center gap-3">
            <span class="text-[10px] font-semibold text-club-green uppercase tracking-wider text-center">Patrocinador Principal</span>
            <img
              :src="principal.imagen"
              :alt="principal.nombre"
              class="h-[140px] w-auto object-contain max-w-[140px] drop-shadow"
            />
          </div>
          <div v-if="oficiales.length" class="flex flex-col items-center gap-3">
            <span class="text-[10px] font-semibold text-club-green uppercase tracking-wider text-center">Patrocinadores Oficiales</span>
            <div class="flex flex-wrap items-center justify-center gap-6 max-w-[320px]">
              <img
                v-for="(p, i) in oficiales"
                :key="p.id || i"
                :src="p.imagen"
                :alt="p.nombre"
                class="h-[90px] w-auto object-contain max-w-[90px]"
              />
            </div>
          </div>
          <div v-if="colaboradores.length" class="flex flex-col items-center gap-3">
            <span class="text-[10px] font-semibold text-club-green uppercase tracking-wider text-center">Colaboradores</span>
            <div class="grid grid-cols-5 items-center justify-items-center gap-1 max-w-[520px]">
              <img
                v-for="(p, i) in colaboradores"
                :key="p.id || i"
                :src="p.imagen"
                :alt="p.nombre"
                class="h-[80px] w-auto object-contain max-w-[80px]"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
