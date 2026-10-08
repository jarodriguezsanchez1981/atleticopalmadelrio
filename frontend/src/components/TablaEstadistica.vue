<script setup>
import { ref, computed, watch } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';
import Row from 'primevue/row';
import { estiloTabla } from '../utils/estiloTabla';

/** Tabla de la sección Estadísticas con las columnas agrupadas en Total, Local
 * y Visitante (el PALMA en casa / fuera): cada métrica sale en los tres grupos
 * (campo, campo_local, campo_visitante), salvo las de `soloLados`. Con grupos de
 * cabecera PrimeVue no deja reordenar columnas, así que se hace aquí: se
 * arrastra el título de un grupo para mover el grupo, o el de una columna para
 * moverla (en los tres grupos a la vez). */
const props = defineProps({
  filas: { type: Array, default: () => [] },
  // [{ campo, titulo, porcentaje?: true, soloLados?: true }]
  metricas: { type: Array, required: true },
  sortField: { type: String, default: null },
  cargando: { type: Boolean, default: false },
  textoVacio: { type: String, default: '' }
});

const GRUPOS = {
  total: { titulo: 'Total', sufijo: '' },
  local: { titulo: 'Local', sufijo: '_local' },
  visitante: { titulo: 'Visitante', sufijo: '_visitante' }
};

const ordenGrupos = ref(Object.keys(GRUPOS));
const ordenMetricas = ref(props.metricas.map((m) => m.campo));
watch(() => props.metricas, (m) => { ordenMetricas.value = m.map((x) => x.campo); });

const grupos = computed(() => ordenGrupos.value.map((clave) => {
  const columnas = ordenMetricas.value
    .map((campo) => props.metricas.find((m) => m.campo === campo))
    .filter((m) => m && (clave !== 'total' || !m.soloLados))
    .map((m) => ({ ...m, field: `${m.campo}${GRUPOS[clave].sufijo}` }));
  return { clave, titulo: GRUPOS[clave].titulo, columnas };
}));

/** 33.3 -> "33,3 %"; sin datos para calcularlo, "—". */
function formatoPorcentaje(valor) {
  return valor == null ? '—' : `${Number(valor).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}

// Arrastrar y soltar: solo grupo sobre grupo y columna sobre columna.
const arrastrando = ref(null);

function mover(lista, desde, hasta) {
  const copia = [...lista];
  const i = copia.indexOf(desde);
  const j = copia.indexOf(hasta);
  if (i < 0 || j < 0 || i === j) return lista;
  copia.splice(i, 1);
  copia.splice(j, 0, desde);
  return copia;
}

function arrastrable(tipo, clave, extra = {}) {
  return {
    headerCell: {
      ...extra,
      draggable: 'true',
      title: 'Arrastra para mover',
      onDragstart: (e) => {
        arrastrando.value = { tipo, clave };
        e.dataTransfer.effectAllowed = 'move';
      },
      onDragover: (e) => {
        if (arrastrando.value?.tipo === tipo) e.preventDefault();
      },
      onDrop: (e) => {
        e.preventDefault();
        const origen = arrastrando.value;
        arrastrando.value = null;
        if (!origen || origen.tipo !== tipo) return;
        if (tipo === 'grupo') ordenGrupos.value = mover(ordenGrupos.value, origen.clave, clave);
        else ordenMetricas.value = mover(ordenMetricas.value, origen.clave, clave);
      },
      onDragend: () => { arrastrando.value = null; }
    }
  };
}

// Línea que separa cada grupo del anterior.
const SEPARADOR = 'ar-dt-inicio-grupo';
</script>

<template>
  <DataTable v-bind="estiloTabla" class="ar-dt-cabecera-multilinea ar-dt-agrupada" :value="filas" :loading="cargando"
             dataKey="id_jugador" :sortField="sortField" :sortOrder="-1">
    <ColumnGroup type="header">
      <Row>
        <Column header="Jugador" field="jugador" sortable :rowspan="2" />
        <Column v-for="g in grupos" :key="g.clave" :header="g.titulo" :colspan="g.columnas.length"
                :headerClass="`text-center ${SEPARADOR} ar-dt-grupo-${g.clave}`" :pt="arrastrable('grupo', g.clave)" />
      </Row>
      <Row>
        <template v-for="g in grupos" :key="g.clave">
          <Column v-for="(c, i) in g.columnas" :key="c.field" :header="c.titulo" :field="c.field" sortable
                  :headerClass="`text-center ar-dt-grupo-${g.clave}${i === 0 ? ` ${SEPARADOR}` : ''}`"
                  :pt="arrastrable('metrica', c.campo)" />
        </template>
      </Row>
    </ColumnGroup>

    <Column field="jugador" />
    <template v-for="g in grupos" :key="g.clave">
      <Column v-for="(c, i) in g.columnas" :key="c.field" :field="c.field"
              :bodyClass="i === 0 ? `text-center ${SEPARADOR}` : 'text-center'">
        <template v-if="c.porcentaje" #body="{ data }">{{ formatoPorcentaje(data[c.field]) }}</template>
      </Column>
    </template>

    <template #empty>
      <div class="text-center text-ink-tertiary py-4 text-sm">{{ textoVacio }}</div>
    </template>
  </DataTable>
</template>
