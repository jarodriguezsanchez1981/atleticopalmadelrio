<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { tareasService } from '../../services';
import { estiloTabla } from '../../utils/estiloTabla';
import { formatFecha } from '../../utils/formatFecha';

/** Panel Administración → Tareas automáticas: qué hace solo el servidor
 * (copias de RFAF, Finalizar Acta automático, informes por email y parches),
 * cuándo, cómo terminó la última vez y sus mensajes. Solo lectura. */
const ESTADOS = {
  ok: { label: 'Correcto', severity: 'success' },
  avisos: { label: 'Con avisos', severity: 'warn' },
  sesion: { label: 'Sesión RFAF caducada', severity: 'danger' },
  error: { label: 'Error', severity: 'danger' }
};

const datos = ref(null);
const cargando = ref(false);
const error = ref('');
const filtroTarea = ref(null);
const expandidas = ref({});

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    datos.value = await tareasService.estado();
  } catch (err) {
    error.value = err.response?.data?.message || 'No se pudo cargar el estado de las tareas.';
  } finally {
    cargando.value = false;
  }
}
onMounted(cargar);

const nombreTarea = computed(() => Object.fromEntries((datos.value?.tareas || []).map((t) => [t.clave, t.nombre])));
const opcionesTarea = computed(() => (datos.value?.tareas || [])
  .filter((t) => t.clave !== 'parches')
  .map((t) => ({ label: t.nombre, value: t.clave })));
const ejecuciones = computed(() => (datos.value?.ejecuciones || [])
  .filter((e) => !filtroTarea.value || e.tarea === filtroTarea.value));

/** La sesión de RFAF según las últimas peticiones (el panel no pide nada a rfaf.es). */
const sesion = computed(() => {
  const s = datos.value?.sesion_rfaf;
  if (!s) return null;
  if (s.caducada_desde || s.acta_parada) {
    return { severity: 'danger', texto: `Caducada${s.caducada_desde ? ` desde el ${formatFecha(s.caducada_desde)}` : ''}: hay que poner una JSESSIONID nueva.` };
  }
  if (s.ultima_valida) return { severity: 'success', texto: `Funcionaba en la última petición (${formatFecha(s.ultima_valida)}).` };
  return { severity: 'secondary', texto: 'Sin peticiones desde el último arranque del servidor.' };
});
</script>

<template>
<SectionGuard seccion="tareas">
  <div class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="font-display text-xl text-club-green flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
          Tareas automáticas
        </h1>
        <p class="text-sm text-ink-tertiary">
          Lo que el servidor hace solo: cuándo, la próxima vez y cómo terminó la última. Las horas son españolas.
        </p>
      </div>
      <Button label="Actualizar" icon="pi pi-refresh" text outlined :loading="cargando"
              class="!text-club-green !border-club-green/50" @click="cargar" />
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">{{ error }}</div>
    <div v-if="datos && !datos.activas" class="rounded-xl border border-line bg-club-cream py-3 px-4 text-sm text-ink-secondary">
      En local las tareas no se ejecutan: solo en el servidor de producción.
    </div>

    <template v-if="datos">
      <div class="bg-white rounded-xl border border-line p-4 text-sm flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-medium text-ink-secondary">Sesión de RFAF:</span>
          <Tag v-if="sesion" :severity="sesion.severity" :value="sesion.severity === 'danger' ? 'Caducada' : sesion.severity === 'success' ? 'Válida' : 'Sin datos'" />
          <span class="text-ink-tertiary">{{ sesion?.texto }}</span>
        </div>
        <div class="text-ink-tertiary">
          <span class="font-medium text-ink-secondary">Aviso si la web se cae:</span>
          cada 15 minutos GitHub comprueba desde fuera que la web responde y que el certificado no está a punto de caducar;
          si falla, llega un correo de GitHub.
        </div>
      </div>

      <DataTable v-bind="estiloTabla" :value="datos.tareas" dataKey="clave">
        <Column header="Tarea">
          <template #body="{ data }">
            <div class="font-medium">{{ data.nombre }}</div>
            <div class="text-xs text-ink-tertiary">{{ data.cuando }}</div>
          </template>
        </Column>
        <Column header="Última">
          <template #body="{ data }">
            <div v-if="data.ultima" class="flex flex-col gap-1">
              <span class="inline-flex items-center gap-2">
                <Tag :severity="ESTADOS[data.ultima.estado]?.severity || 'secondary'" :value="ESTADOS[data.ultima.estado]?.label || data.ultima.estado" />
                <span class="text-xs text-ink-tertiary">{{ formatFecha(data.ultima.inicio) }}</span>
              </span>
              <span class="text-xs text-ink-secondary">{{ data.ultima.resumen }}</span>
            </div>
            <span v-else class="text-ink-tertiary">Todavía no se ha ejecutado.</span>
          </template>
        </Column>
        <Column header="Próxima">
          <template #body="{ data }">
            <template v-if="data.proxima">
              <div>{{ formatFecha(data.proxima.fecha) }}</div>
              <div v-if="data.proxima.detalle" class="text-xs text-ink-tertiary">{{ data.proxima.detalle }}</div>
            </template>
            <span v-else class="text-ink-tertiary">Sin partidos pendientes.</span>
          </template>
        </Column>
      </DataTable>

      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <h2 class="font-display text-base text-ink-secondary">Últimas ejecuciones</h2>
          <Select v-model="filtroTarea" :options="opcionesTarea" optionLabel="label" optionValue="value"
                  placeholder="Todas las tareas" showClear class="w-72" />
        </div>
        <DataTable v-bind="estiloTabla" v-model:expandedRows="expandidas" :value="ejecuciones" dataKey="id"
                   class="ar-dt-compacta" paginator :rows="15">
          <template #empty>
            <div class="py-6 text-center text-sm text-ink-tertiary">Todavía no hay ejecuciones guardadas.</div>
          </template>
          <Column expander style="width: 3rem" />
          <Column header="Fecha">
            <template #body="{ data }">{{ formatFecha(data.inicio) }}</template>
          </Column>
          <Column header="Tarea">
            <template #body="{ data }">{{ nombreTarea[data.tarea] || data.tarea }}</template>
          </Column>
          <Column header="Estado">
            <template #body="{ data }">
              <Tag :severity="ESTADOS[data.estado]?.severity || 'secondary'" :value="ESTADOS[data.estado]?.label || data.estado" />
            </template>
          </Column>
          <Column header="Resumen">
            <template #body="{ data }"><span class="text-sm">{{ data.resumen }}</span></template>
          </Column>
          <template #expansion="{ data }">
            <pre class="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-72 whitespace-pre-wrap">{{ data.detalle || data.resumen }}</pre>
          </template>
        </DataTable>
      </div>
    </template>
  </div>
</SectionGuard>
</template>
