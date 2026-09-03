<script setup>
/**
 * Vista de calendario en lista (para móvil): eventos agrupados por día y tipo.
 * Recibe los mismos eventos que fetchEventos de FullCalendar.
 */
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { useMediaQuery } from '../composables/useMediaQuery';

const props = defineProps({
  eventos: { type: Array, default: () => [] },
  idCategoria: { type: [Number, String], default: null }
});

const emit = defineEmits(['event-click', 'date-click']);

const esMovil = useMediaQuery('(max-width: 639px)');

const fechaRef = ref(new Date());

const GRUPOS = {
  LIGA: { label: 'Liga', color: '#0B3D2E', icon: 'pi pi-star-fill' },
  AMISTOSO: { label: 'Amistoso', color: '#D97706', icon: 'pi pi-handshake' },
  TORNEO: { label: 'Torneo', color: '#6D28D9', icon: 'pi pi-trophy' },
  ENTRENAMIENTO: { label: 'Entrenamiento', color: '#2563EB', icon: 'pi pi-calendar' },
  FESTIVO: { label: 'Festivo', color: '#B45309', icon: 'pi pi-star' }
};

function claveFecha(inicio) {
  const d = new Date(inicio);
  if (Number.isNaN(d.getTime())) return 'sin-fecha';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function grupoDe(e) {
  if (e.tipo === 'partido') return e.jornada ? 'LIGA' : 'AMISTOSO';
  if (e.tipo === 'torneo') return 'TORNEO';
  if (e.tipo === 'festivo') return 'FESTIVO';
  return 'ENTRENAMIENTO';
}

const dias = computed(() => {
  const mapa = new Map();
  const ordenGrupo = { LIGA: 1, AMISTOSO: 2, TORNEO: 3, ENTRENAMIENTO: 4, FESTIVO: 0 };

  const eventosFiltrados = props.eventos.filter((e) => {
    if (e.tipo === 'festivo') return true;
    if (props.idCategoria == null) return true;
    return String(e.categoria?.id ?? e.plantilla?.categoria?.id ?? '') === String(props.idCategoria);
  });

  for (const e of eventosFiltrados) {
    const clave = claveFecha(e.inicio || e.fecha);
    if (!mapa.has(clave)) mapa.set(clave, { clave, items: [] });
    mapa.get(clave).items.push(e);
  }

  return [...mapa.values()]
    .sort((a, b) => a.clave.localeCompare(b.clave))
    .map((g) => {
      const grupos = new Map();
      for (const item of [...g.items].sort((a, b) => new Date(a.inicio || a.fecha) - new Date(b.inicio || b.fecha))) {
        const grp = grupoDe(item);
        if (!grupos.has(grp)) grupos.set(grp, []);
        grupos.get(grp).push(item);
      }
      return {
        ...g,
        fecha: new Date(`${g.clave}T12:00:00`),
        grupos: [...grupos.entries()]
          .sort((a, b) => (ordenGrupo[a[0]] ?? 9) - (ordenGrupo[b[0]] ?? 9))
          .map(([grupo, items]) => ({ grupo, meta: GRUPOS[grupo] || GRUPOS.ENTRENAMIENTO, items }))
      };
    });
});

function formatearDia(fecha) {
  const s = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatearHora(inicio) {
  const d = new Date(inicio);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function nombreEvento(e) {
  if (e.tipo === 'partido') return e.categoria?.alias || e.categoria?.nombre || '—';
  if (e.tipo === 'torneo') return e.categoria?.alias || e.categoria?.nombre || e.nombre || 'Torneo';
  if (e.tipo === 'festivo') return e.titulo || '';
  return e.categoria?.alias || e.categoria?.nombre || '—';
}

function lugarEvento(e) {
  if (e.tipo === 'partido') {
    return e.es_local
      ? (typeof e.lugar === 'string' ? e.lugar : (e.lugar?.nombre || ''))
      : (e.equipoLocal?.localidad || '');
  }
  if (e.tipo === 'torneo') {
    const esLocal = e.equipo?.nombre === 'PALMA DEL RIO ATLETICO C.F.';
    return esLocal ? '' : (e.equipo?.localidad || '');
  }
  if (e.tipo === 'festivo') return '';
  return e.lugar || '';
}
</script>

<template>
  <div class="calendario-lista">
    <div v-for="dia in dias" :key="dia.clave" class="dia">
      <div
        class="dia-cabecera"
        :class="{ festivo: dia.grupos.some(g => g.grupo === 'FESTIVO') }"
        @click="$emit('date-click', dia.clave)"
      >
        {{ formatearDia(dia.fecha) }}
      </div>

      <div v-for="g in dia.grupos" :key="g.grupo" class="grupo">
        <div class="grupo-cabecera" :style="{ background: g.meta.color }">
          <i :class="g.meta.icon"></i> {{ g.meta.label }}
        </div>
        <button
          v-for="(e, i) in g.items"
          :key="`${e.id}-${i}`"
          type="button"
          class="evento"
          @click="$emit('event-click', e)"
        >
          <span class="hora">{{ formatearHora(e.inicio || e.fecha) }}</span>
          <span class="nombre">{{ nombreEvento(e) }}</span>
          <span v-if="lugarEvento(e)" class="lugar">{{ lugarEvento(e) }}</span>
        </button>
      </div>
    </div>
    <p v-if="!dias.length" class="sin-eventos">No hay eventos en este periodo.</p>
  </div>
</template>

<style scoped>
.calendario-lista {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dia-cabecera {
  background: #D97706;
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
  text-transform: capitalize;
}
.dia-cabecera.festivo {
  background: #B45309;
}
.grupo {
  margin-bottom: 6px;
}
.grupo-cabecera {
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  letter-spacing: 0.3px;
  margin-bottom: 3px;
}
.evento {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 3px;
  font-size: 0.8rem;
  cursor: pointer;
}
.evento:active {
  background: #F6F5F1;
}
.hora {
  font-weight: 700;
  color: #0B3D2E;
  min-width: 34px;
}
.nombre {
  font-weight: 600;
  color: #1E293B;
  flex: 1;
}
.lugar {
  color: #64748B;
  font-size: 0.7rem;
}
.sin-eventos {
  text-align: center;
  color: #64748B;
  padding: 24px 0;
  font-size: 0.85rem;
}
</style>
