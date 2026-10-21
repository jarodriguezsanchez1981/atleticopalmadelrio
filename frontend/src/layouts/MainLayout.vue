<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import Drawer from 'primevue/drawer';
import { useAuthStore } from '../stores/auth.store';
import { useMediaQuery } from '../composables/useMediaQuery';
import { seccionesService, seguridadService } from '../services';
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
  { clave: 'estadisticas', label: 'Estadísticas Senior A', icon: 'pi pi-chart-bar' },
  { clave: 'estadisticas_cat', label: 'Estadísticas', icon: 'pi pi-chart-line' },
  { clave: 'competicion', label: 'Competición', icon: 'pi pi-trophy' },
  { clave: 'admin', label: 'Panel Administración', icon: 'pi pi-server' }
];

// Entradas fijas de un apartado que no dependen de permisos (las ve todo el
// mundo), detrás de las secciones de la base de datos.
const ITEMS_FIJOS = {
  admin: [{ label: 'Cambiar Contraseña', icon: 'pi pi-key', to: '/cambiar-password' }]
};

// Submenús anidados dentro de un apartado: sus secciones viven en la base de
// datos con ese `grupo` (no es un apartado de primer nivel de GRUPOS_MENU) y se
// dibujan plegables bajo el apartado padre. "Notificaciones" cuelga de "Club".
const SUBGRUPOS = {
  club: [{ clave: 'notificaciones', label: 'Notificaciones', icon: 'pi pi-bell' }]
};

const catalogoSecciones = ref([]);
let unsubCambio = null;

async function cargarSecciones() {
  try {
    catalogoSecciones.value = await seccionesService.listar();
  } catch {
    catalogoSecciones.value = [];
  }
}

// ---- Aviso de seguridad (parches de Docker) para administradores ----
// El cron del EC2 guarda el último informe en la BD; aquí se lee y, si hay algo
// que revisar, se muestra un banner. El administrador puede descartarlo: se
// recuerda el id descartado en sessionStorage para no reaparecer navegando,
// pero sí volverá a salir con un informe nuevo.
const AVISO_OCULTO_KEY = 'apr_aviso_seguridad_oculto';
const informeSeguridad = ref(null);
const detalleSeguridadAbierto = ref(false);
const idInformeOculto = ref(leerAvisoOculto());

function leerAvisoOculto() {
  try {
    const v = sessionStorage.getItem(AVISO_OCULTO_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

async function cargarEstadoSeguridad() {
  if (!auth.puedeVer('administracion')) return;
  try {
    const { informe } = await seguridadService.estado();
    informeSeguridad.value = informe || null;
  } catch {
    informeSeguridad.value = null;
  }
}

const hayAvisoSeguridad = computed(() => {
  const inf = informeSeguridad.value;
  if (!inf || !auth.puedeVer('administracion')) return false;
  if (!inf.hay_actualizaciones && !inf.hay_vulnerabilidades) return false;
  return inf.id !== idInformeOculto.value;
});

const textoAvisoSeguridad = computed(() => {
  const inf = informeSeguridad.value;
  if (!inf) return '';
  const partes = [];
  if (inf.hay_actualizaciones) partes.push('hay imágenes de Docker con una versión parcheada disponible');
  const vulns = (inf.total_critical || 0) + (inf.total_high || 0);
  if (inf.hay_vulnerabilidades && vulns > 0) {
    partes.push(`${vulns} vulnerabilidad(es) (CRITICAL: ${inf.total_critical || 0}, HIGH: ${inf.total_high || 0})`);
  }
  return partes.join(' y ') + '.';
});

const fechaAvisoSeguridad = computed(() => {
  const inf = informeSeguridad.value;
  if (!inf?.fecha) return '';
  try {
    return new Date(inf.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(inf.fecha);
  }
});

function descartarAvisoSeguridad() {
  const inf = informeSeguridad.value;
  if (!inf) return;
  idInformeOculto.value = inf.id;
  try {
    sessionStorage.setItem(AVISO_OCULTO_KEY, String(inf.id));
  } catch { /* sin almacenamiento: se oculta solo durante esta carga */ }
}

onMounted(() => {
  cargarSecciones();
  cargarEstadoSeguridad();
  unsubCambio = suscribirseCambio(cargarSecciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

function itemsDelGrupo(clave) {
  return catalogoSecciones.value
    .filter((s) => s.grupo === clave && RUTA_POR_SECCION[s.clave] && auth.puedeVer(s.clave))
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({ label: etiquetaEnGrupo(s.nombre, clave), icon: s.icono || 'pi pi-minus', to: RUTA_POR_SECCION[s.clave], seccion: s.clave }))
    .concat(ITEMS_FIJOS[clave] || []);
}

/** En los apartados de Estadísticas sobra repetir "Estadísticas": "Estadísticas
 * Senior A Equipo" -> "Equipo", "Estadísticas Convocatorias" -> "Convocatorias"
 * (en Administración y demás sigue el nombre completo). */
function etiquetaEnGrupo(nombre, grupo) {
  if (grupo !== 'estadisticas' && grupo !== 'estadisticas_cat') return nombre;
  return String(nombre || '').replace(/^Estad[íi]sticas(\s+Senior\s+A)?\s+/i, '') || nombre;
}

function subgruposDelGrupo(clave) {
  return (SUBGRUPOS[clave] || [])
    .map((sg) => ({ ...sg, items: itemsDelGrupo(sg.clave) }))
    .filter((sg) => sg.items.length);
}

const gruposNav = computed(() =>
  GRUPOS_MENU
    .map((g) => ({ ...g, items: itemsDelGrupo(g.clave), subgrupos: subgruposDelGrupo(g.clave) }))
    .filter((g) => g.items.length || g.subgrupos.length)
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
  const itemsSubgrupos = gruposNav.value.flatMap((g) => g.subgrupos.flatMap((sg) => sg.items));
  const allItems = [...navItems.value, ...gruposNav.value.flatMap((g) => g.items), ...itemsSubgrupos];
  const activo = allItems.find((i) => i.to === route.path);
  return activo?.label || 'Intranet';
});

const gruposAbiertos = ref({});
function toggleGrupo(clave) {
  gruposAbiertos.value = { ...gruposAbiertos.value, [clave]: !gruposAbiertos.value[clave] };
}
function grupoActivo(grupo) {
  return grupo.items.some((i) => route.path === i.to)
    || (grupo.subgrupos || []).some((sg) => sg.items.some((i) => route.path === i.to));
}
function subgrupoActivo(subgrupo) {
  return subgrupo.items.some((i) => route.path === i.to);
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

            <!-- Submenús anidados (p. ej. Notificaciones dentro de Club) -->
            <div v-for="sub in grupo.subgrupos" :key="sub.clave">
              <button
                @click="toggleGrupo(sub.clave)"
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
                :class="{ '!bg-white/10 !text-white !font-medium': subgrupoActivo(sub) }"
              >
                <i :class="sub.icon" class="text-[0.85rem]" />
                <span class="flex-1 text-left">{{ sub.label }}</span>
                <i :class="gruposAbiertos[sub.clave] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[0.7rem]" />
              </button>
              <div v-show="gruposAbiertos[sub.clave]" class="ml-4 mt-1 space-y-0.5">
                <router-link
                  v-for="item in sub.items"
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

            <!-- Submenús anidados (p. ej. Notificaciones dentro de Club) -->
            <div v-for="sub in grupo.subgrupos" :key="sub.clave">
              <button
                @click="toggleGrupo(sub.clave)"
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
                :class="{ '!bg-white/10 !text-white !font-medium': subgrupoActivo(sub) }"
              >
                <i :class="sub.icon" class="text-[0.85rem]" />
                <span class="flex-1 text-left">{{ sub.label }}</span>
                <i :class="gruposAbiertos[sub.clave] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[0.7rem]" />
              </button>
              <div v-show="gruposAbiertos[sub.clave]" class="ml-4 mt-1 space-y-0.5">
                <router-link
                  v-for="item in sub.items"
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
        <!-- Aviso de seguridad (solo administradores): parches de Docker pendientes -->
        <div
          v-if="hayAvisoSeguridad"
          class="mb-5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 shadow-sm"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-shield text-lg mt-0.5 shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">
                Seguridad: {{ textoAvisoSeguridad }}
              </p>
              <p class="text-xs text-amber-800/80 mt-0.5">
                Última comprobación: {{ fechaAvisoSeguridad }}.
                <button
                  type="button"
                  class="underline hover:no-underline"
                  @click="detalleSeguridadAbierto = !detalleSeguridadAbierto"
                >
                  {{ detalleSeguridadAbierto ? 'Ocultar detalle' : 'Ver detalle' }}
                </button>
              </p>
              <ul
                v-if="detalleSeguridadAbierto && informeSeguridad?.resumen"
                class="mt-2 text-xs text-amber-900/90 space-y-0.5"
              >
                <li
                  v-for="(linea, i) in informeSeguridad.resumen.split('|')"
                  :key="i"
                  class="break-words"
                >
                  {{ linea.trim() }}
                </li>
              </ul>
            </div>
            <button
              type="button"
              class="pi pi-times text-amber-700 hover:text-amber-900 transition-colors shrink-0"
              title="Descartar aviso"
              @click="descartarAvisoSeguridad"
            />
          </div>
        </div>
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
