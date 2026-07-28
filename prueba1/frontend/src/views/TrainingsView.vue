<script setup>
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useAuthStore } from '../stores/auth.store';
import trainingService from '../services/training.service';

const auth = useAuthStore();
const trainings = ref([]);
const loading = ref(false);
const attendanceDialog = ref(false);
const currentTraining = ref(null);
const attendance = ref([]);

const statusOptions = [
  { label: 'Convocado', value: 'convocado' },
  { label: 'Presente', value: 'presente' },
  { label: 'Ausente', value: 'ausente' },
  { label: 'Justificado', value: 'justificado' },
];

function rangeThisMonth() {
  const d = new Date();
  return {
    from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10),
    to: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

async function loadTrainings() {
  loading.value = true;
  try {
    const { from, to } = rangeThisMonth();
    trainings.value = await trainingService.listByRange(from, to);
  } finally {
    loading.value = false;
  }
}

async function openAttendance(training) {
  currentTraining.value = training;
  attendance.value = await trainingService.getAttendance(training.id);
  attendanceDialog.value = true;
}

async function updateStatus(row) {
  await trainingService.setAttendance(currentTraining.value.id, {
    playerId: row.player_id,
    status: row.status,
    notes: row.notes,
  });
}

onMounted(loadTrainings);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Entrenamientos</h1>
      <Button v-if="auth.canManage" label="Nuevo entrenamiento" icon="pi pi-plus" />
    </div>

    <DataTable :value="trainings" :loading="loading" paginator :rows="10" stripedRows>
      <Column field="event_date" header="Fecha" sortable />
      <Column field="start_time" header="Hora" />
      <Column field="category_name" header="Categoria" />
      <Column field="location" header="Lugar" />
      <Column header="Asistencia">
        <template #body="{ data }">
          <Button label="Ver / confirmar" size="small" @click="openAttendance(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="attendanceDialog" modal header="Control de asistencia" style="width: 40rem">
      <DataTable :value="attendance">
        <Column header="Dorsal" field="dorsal" style="width: 80px" />
        <Column header="Jugador">
          <template #body="{ data }">{{ data.name }} {{ data.surname }}</template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Dropdown
              v-model="data.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              @change="updateStatus(data)"
            />
          </template>
        </Column>
      </DataTable>
    </Dialog>
  </div>
</template>
