<script setup>
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import { useAuthStore } from '../stores/auth.store';
import matchService from '../services/match.service';

const auth = useAuthStore();
const matches = ref([]);
const loading = ref(false);
const squadDialog = ref(false);
const currentMatch = ref(null);
const squad = ref([]);

function rangeThisMonth() {
  const d = new Date();
  return {
    from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10),
    to: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

async function loadMatches() {
  loading.value = true;
  try {
    const { from, to } = rangeThisMonth();
    matches.value = await matchService.listByRange(from, to);
  } finally {
    loading.value = false;
  }
}

async function openSquad(match) {
  currentMatch.value = match;
  squad.value = await matchService.getSquad(match.id);
  squadDialog.value = true;
}

async function saveEntry(row) {
  await matchService.updatePlayerEntry(currentMatch.value.id, row.player_id, {
    convocado: row.convocado,
    status: row.status,
    titular: row.titular,
    minutesPlayed: row.minutes_played,
    goals: row.goals,
    yellowCards: row.yellow_cards,
    redCard: row.red_card,
    notes: row.notes,
  });
}

onMounted(loadMatches);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Convocatorias de Partidos</h1>
      <Button v-if="auth.canManage" label="Nuevo partido" icon="pi pi-plus" />
    </div>

    <DataTable :value="matches" :loading="loading" paginator :rows="10" stripedRows>
      <Column field="event_date" header="Fecha" sortable />
      <Column field="start_time" header="Hora" />
      <Column field="category_name" header="Categoria" />
      <Column header="Rival">
        <template #body="{ data }">
          {{ data.home_away === 'local' ? 'vs' : '@' }} {{ data.rival }}
        </template>
      </Column>
      <Column field="location" header="Lugar" />
      <Column header="Resultado">
        <template #body="{ data }">
          <span v-if="data.result_own !== null">{{ data.result_own }} - {{ data.result_rival }}</span>
          <span v-else class="text-gray-400">Pendiente</span>
        </template>
      </Column>
      <Column header="Convocatoria">
        <template #body="{ data }">
          <Button label="Ver / editar" size="small" @click="openSquad(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="squadDialog" modal header="Convocatoria y estadisticas" style="width: 55rem">
      <DataTable :value="squad" scrollable scrollHeight="400px">
        <Column header="Dorsal" field="dorsal" style="width: 70px" />
        <Column header="Jugador">
          <template #body="{ data }">{{ data.name }} {{ data.surname }}</template>
        </Column>
        <Column header="Convocado" style="width: 90px">
          <template #body="{ data }">
            <Checkbox v-model="data.convocado" binary @change="saveEntry(data)" />
          </template>
        </Column>
        <Column header="Titular" style="width: 80px">
          <template #body="{ data }">
            <Checkbox v-model="data.titular" binary @change="saveEntry(data)" />
          </template>
        </Column>
        <Column header="Minutos" style="width: 100px">
          <template #body="{ data }">
            <InputNumber v-model="data.minutes_played" :min="0" :max="120" @update:modelValue="saveEntry(data)" />
          </template>
        </Column>
        <Column header="Goles" style="width: 90px">
          <template #body="{ data }">
            <InputNumber v-model="data.goals" :min="0" @update:modelValue="saveEntry(data)" />
          </template>
        </Column>
        <Column header="Amarillas" style="width: 100px">
          <template #body="{ data }">
            <InputNumber v-model="data.yellow_cards" :min="0" :max="2" @update:modelValue="saveEntry(data)" />
          </template>
        </Column>
        <Column header="Roja" style="width: 80px">
          <template #body="{ data }">
            <Checkbox v-model="data.red_card" binary @change="saveEntry(data)" />
          </template>
        </Column>
      </DataTable>
    </Dialog>
  </div>
</template>
