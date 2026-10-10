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
  // [{ campo, titulo, descripcion?: 'nombre completo (tooltip)', porcentaje?: true, soloLados?: true, subgrupo?: 'Amarillas' }]
  // Las métricas seguidas con el mismo `subgrupo` van bajo un título común
  // dentro de cada grupo (una fila más de cabecera).
  metricas: { type: Array, required: true },
  sortField: { type: String, default: null },
  cargando: { type: Boolean, default: false },
  textoVacio: { type: String, default: '' },
  // Primera columna (fija) y clave de cada fila: el jugador, o p.ej. el equipo.
  columnaNombre: { type: Object, default: () => ({ campo: 'jugador', titulo: 'Jugador' }) },
  dataKey: { type: String, default: 'id_jugador' }
});

const GRUPOS = {
  total: { titulo: 'Total', sufijo: '' },
  local: { titulo: 'Local', sufijo: '_local' },
  visitante: { titulo: 'Visitante', sufijo: '_visitante' }
};

const ordenGrupos = ref(Object.keys(GRUPOS));
const ordenMetricas = ref(props.metricas.map((m) => m.campo));
watch(() => props.metricas, (m) => { ordenMetricas.value = m.map((x) => x.campo); });

const conSubgrupos = computed(() => props.metricas.some((m) => m.subgrupo));
// Filas de cabecera: grupos, (subgrupos y) columnas.
const niveles = computed(() => (conSubgrupos.value ? 3 : 2));

const grupos = computed(() => ordenGrupos.value.map((clave) => {
  const columnas = ordenMetricas.value
    .map((campo) => props.metricas.find((m) => m.campo === campo))
    .filter((m) => m && (clave !== 'total' || !m.soloLados))
    .map((m, i, lista) => ({
      ...m,
      field: `${m.campo}${GRUPOS[clave].sufijo}`,
      inicioGrupo: i === 0,
      // Primera de un subgrupo (no la primera del grupo): lleva una línea más fina.
      inicioSubgrupo: i > 0 && !!m.subgrupo && lista[i - 1].subgrupo !== m.subgrupo
    }));
  // Tramos de la fila intermedia: una columna suelta o un subgrupo de varias.
  const tramos = [];
  for (const c of columnas) {
    const ultimo = tramos[tramos.length - 1];
    if (c.subgrupo && ultimo?.subgrupo === c.subgrupo) ultimo.columnas.push(c);
    else tramos.push(c.subgrupo ? { subgrupo: c.subgrupo, columnas: [c] } : { columna: c });
  }
  return { clave, titulo: GRUPOS[clave].titulo, columnas, tramos };
}));

function claseSeparador(c) {
  if (c.inicioGrupo) return ` ${SEPARADOR}`;
  return c.inicioSubgrupo ? ` ${SEPARADOR_SUBGRUPO}` : '';
}

/** 33.3 -> "33,3 %"; sin datos para calcularlo, "—". */
function formatoPorcentaje(valor) {
  return valor == null ? '—' : `${Number(valor).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}

// Arrastrar y soltar: grupo sobre grupo, subgrupo sobre subgrupo y columna
// sobre columna del mismo subgrupo (o de ninguno).
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

/** Mueve todas las columnas del subgrupo `desde` delante (o detrás) del subgrupo `hasta`. */
function moverSubgrupo(desde, hasta) {
  const subgrupo = (campo) => props.metricas.find((m) => m.campo === campo)?.subgrupo;
  const orden = ordenMetricas.value;
  const iDesde = orden.findIndex((c) => subgrupo(c) === desde);
  const iHasta = orden.findIndex((c) => subgrupo(c) === hasta);
  if (desde === hasta || iDesde < 0 || iHasta < 0) return orden;
  const bloque = orden.filter((c) => subgrupo(c) === desde);
  const resto = orden.filter((c) => subgrupo(c) !== desde);
  let destino = resto.findIndex((c) => subgrupo(c) === hasta);
  if (iDesde < iHasta) destino = resto.findLastIndex((c) => subgrupo(c) === hasta) + 1;
  return [...resto.slice(0, destino), ...bloque, ...resto.slice(destino)];
}

function arrastrable(tipo, clave, descripcion = '') {
  return {
    headerCell: {
      draggable: 'true',
      title: descripcion ? `${descripcion} · Arrastra para mover` : 'Arrastra para mover',
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
        else if (tipo === 'subgrupo') ordenMetricas.value = moverSubgrupo(origen.clave, clave);
        else ordenMetricas.value = mover(ordenMetricas.value, origen.clave, clave);
      },
      onDragend: () => { arrastrando.value = null; }
    }
  };
}

// Línea que separa cada grupo (y, más fina, cada subgrupo) del anterior.
const SEPARADOR = 'ar-dt-inicio-grupo';
const SEPARADOR_SUBGRUPO = 'ar-dt-inicio-subgrupo';
</script>

<template>
  <DataTable v-bind="estiloTabla" class="ar-dt-cabecera-multilinea ar-dt-agrupada" :value="filas" :loading="cargando"
             :dataKey="dataKey" :sortField="sortField" :sortOrder="-1">
    <ColumnGroup type="header">
      <Row>
        <Column :header="columnaNombre.titulo" :field="columnaNombre.campo" sortable :rowspan="niveles" headerClass="whitespace-nowrap" />
        <Column v-for="g in grupos" :key="g.clave" :header="g.titulo" :colspan="g.columnas.length"
                :headerClass="`ar-dt-titulo-grupo ${SEPARADOR} ar-dt-grupo-${g.clave}`" :pt="arrastrable('grupo', g.clave)" />
      </Row>
      <Row>
        <template v-for="g in grupos" :key="g.clave">
          <template v-for="t in g.tramos" :key="t.columna?.field || `${g.clave}-${t.subgrupo}`">
            <Column v-if="t.columna" :header="t.columna.titulo" :field="t.columna.field" sortable :rowspan="niveles - 1"
                    :headerClass="`text-center ar-dt-grupo-${g.clave}${claseSeparador(t.columna)}`"
                    :pt="arrastrable(`metrica-${t.columna.subgrupo || ''}`, t.columna.campo, t.columna.descripcion)" />
            <Column v-else :header="t.subgrupo" :colspan="t.columnas.length"
                    :headerClass="`ar-dt-titulo-grupo ar-dt-grupo-${g.clave}${claseSeparador(t.columnas[0])}`"
                    :pt="arrastrable('subgrupo', t.subgrupo, t.columnas[0].descripcionSubgrupo)" />
          </template>
        </template>
      </Row>
      <Row v-if="conSubgrupos">
        <template v-for="g in grupos" :key="g.clave">
          <template v-for="t in g.tramos.filter((x) => x.subgrupo)" :key="`${g.clave}-${t.subgrupo}`">
            <Column v-for="c in t.columnas" :key="c.field" :header="c.titulo" :field="c.field" sortable
                    :headerClass="`text-center ar-dt-grupo-${g.clave}${claseSeparador(c)}`"
                    :pt="arrastrable(`metrica-${c.subgrupo}`, c.campo, c.descripcion)" />
          </template>
        </template>
      </Row>
    </ColumnGroup>

    <!-- El nombre en una sola línea: la columna no se estrecha al ensanchar la tabla. -->
    <Column :field="columnaNombre.campo" bodyClass="whitespace-nowrap" />
    <template v-for="g in grupos" :key="g.clave">
      <Column v-for="c in g.columnas" :key="c.field" :field="c.field" :bodyClass="`text-center${claseSeparador(c)}`">
        <template v-if="c.porcentaje" #body="{ data }">{{ formatoPorcentaje(data[c.field]) }}</template>
      </Column>
    </template>

    <template #empty>
      <div class="text-center text-ink-tertiary py-4 text-sm">{{ textoVacio }}</div>
    </template>
  </DataTable>
</template>
