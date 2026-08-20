<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useAuthStore } from '../../stores/auth.store';
import { patrocinadoresService } from '../../services';

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

onMounted(async () => {
  try {
    patrocinadores.value = await patrocinadoresService.listar();
  } catch {
    patrocinadores.value = [];
  }
});

const usuario = ref('');
const password = ref('');
const error = ref('');
const enviando = ref(false);

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function onSubmit() {
  error.value = '';
  if (!usuario.value || !password.value) {
    error.value = 'Introduce tu usuario y tu contraseña.';
    return;
  }
  enviando.value = true;
  try {
    await auth.login(usuario.value, password.value);
    const redirect = route.query.redirect;
    if (redirect && typeof redirect === 'string') {
      router.replace(redirect);
    } else {
      router.replace({ name: auth.primeraSeccion });
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'No se ha podido iniciar sesión.';
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex flex-col bg-club-cream">
    <div class="flex-1 flex items-center justify-center px-4">
      <div class="w-full max-w-sm">
      <!-- Escudo del club, centrado -->
      <div class="flex flex-col items-center mb-8">
        <img
          src="/escudo.png"
          alt="Escudo Atlético Palma del Río"
          class="w-40 h-auto drop-shadow-2xl object-contain select-none"
          width="160"
          height="180"
        />
        <h1 class="mt-5 font-display text-2xl text-club-green tracking-wide text-center">
          ATLÉTICO PALMA DEL RÍO
        </h1>
        <p class="text-club-green/70 text-sm mt-1">Intranet de gestión del club</p>
      </div>

      <!-- Formulario de acceso -->
      <form @submit.prevent="onSubmit" class="bg-white rounded-xl shadow-2xl p-8 space-y-5 border border-slate-200">
        <div class="flex flex-col gap-2">
          <label for="usuario" class="text-sm font-medium text-slate-700">Usuario</label>
          <InputText id="usuario" v-model="usuario" autocomplete="username" placeholder="tu.usuario" class="w-full" />
        </div>

        <div class="flex flex-col gap-2">
          <label for="password" class="text-sm font-medium text-slate-700">Contraseña</label>
          <Password
            id="password"
            v-model="password"
            autocomplete="current-password"
            placeholder="••••••••"
            :feedback="false"
            toggleMask
            inputClass="w-full"
            class="w-full"
          />
        </div>

        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

        <!-- Botón "Enviar" debajo del formulario -->
        <Button
          type="submit"
          label="Enviar"
          icon="pi pi-sign-in"
          :loading="enviando"
          class="w-full !bg-club-green !border-club-green hover:!bg-club-greenLight"
        />
      </form>

      <p class="text-center text-xs text-club-green/50 mt-6">
        © {{ new Date().getFullYear() }} Atlético Palma del Río
      </p>
      </div>
    </div>

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
<div class="grid grid-cols-5 items-center justify-items-center gap-4 max-w-[520px]">
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
</template>
