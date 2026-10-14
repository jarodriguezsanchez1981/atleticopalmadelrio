<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { authService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { estadoRequisitos } from '../../utils/requisitosPassword';

/** Cualquier usuario cambia su propia contraseña. Al cambiarla se cierra la
 * sesión y tiene que entrar con la nueva. */
const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const passwordActual = ref('');
const password = ref('');
const confirmacion = ref('');
const error = ref('');
const guardando = ref(false);

const requisitos = computed(() => estadoRequisitos(password.value));
const coinciden = computed(() => !!confirmacion.value && password.value === confirmacion.value);
const igualQueActual = computed(() => !!password.value && password.value === passwordActual.value);
const puedeGuardar = computed(() =>
  !!passwordActual.value && requisitos.value.every((r) => r.ok) && coinciden.value && !igualQueActual.value && !guardando.value);

async function guardar() {
  if (!puedeGuardar.value) return;
  error.value = '';
  guardando.value = true;
  try {
    await authService.cambiarPassword(passwordActual.value, password.value, confirmacion.value);
    toast.add({ severity: 'success', summary: 'Contraseña cambiada', detail: 'Inicia sesión con la nueva contraseña.', life: 5000 });
    await auth.logout();
    router.push({ name: 'login' });
  } catch (err) {
    error.value = err.response?.data?.message || 'No se ha podido cambiar la contraseña.';
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-xl">
    <div>
      <h1 class="font-display text-xl text-club-green">Cambiar Contraseña</h1>
      <p class="text-sm text-ink-tertiary">
        Escribe tu contraseña actual y la nueva dos veces. Al guardarla se cerrará la sesión y tendrás que entrar con la nueva.
      </p>
    </div>

    <form class="rounded-xl border border-line bg-white p-4 flex flex-col gap-4" @submit.prevent="guardar">
      <div class="flex flex-col gap-1">
        <label for="password-actual" class="text-xs font-medium text-ink-secondary">Contraseña actual</label>
        <Password
          id="password-actual"
          v-model="passwordActual"
          autocomplete="current-password"
          :feedback="false"
          toggleMask
          inputClass="w-full"
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="password-nueva" class="text-xs font-medium text-ink-secondary">Nueva contraseña</label>
        <Password
          id="password-nueva"
          v-model="password"
          autocomplete="new-password"
          :feedback="false"
          toggleMask
          inputClass="w-full"
          class="w-full"
        />
        <small v-if="igualQueActual" class="text-red-600">La nueva contraseña debe ser distinta de la actual.</small>
      </div>

      <div class="flex flex-col gap-1">
        <label for="password-confirmacion" class="text-xs font-medium text-ink-secondary">Repite la nueva contraseña</label>
        <Password
          id="password-confirmacion"
          v-model="confirmacion"
          autocomplete="new-password"
          :feedback="false"
          toggleMask
          inputClass="w-full"
          class="w-full"
        />
        <small v-if="confirmacion && !coinciden" class="text-red-600">Las dos contraseñas no coinciden.</small>
        <small v-else-if="coinciden" class="text-green-700">Las dos contraseñas coinciden.</small>
      </div>

      <div class="rounded-lg border border-line bg-club-cream/40 p-3">
        <p class="text-xs font-semibold text-ink-secondary mb-2">La contraseña debe contener:</p>
        <ul class="flex flex-col gap-1 text-sm">
          <li
            v-for="r in requisitos"
            :key="r.clave"
            class="flex items-center gap-2"
            :class="r.ok ? 'text-green-700 underline decoration-2 underline-offset-4' : 'text-ink-tertiary'"
          >
            <i :class="r.ok ? 'pi pi-check-circle' : 'pi pi-circle'" class="text-xs" />
            <span>{{ r.texto }}</span>
          </li>
        </ul>
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <div class="flex justify-end">
        <Button type="submit" label="Cambiar contraseña" icon="pi pi-key" :disabled="!puedeGuardar" :loading="guardando" />
      </div>
    </form>
  </div>
</template>
