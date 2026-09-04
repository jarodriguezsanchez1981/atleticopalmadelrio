<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { useAuthStore } from '../../stores/auth.store';

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
  <div class="h-screen w-full grid md:grid-cols-2 overflow-hidden">
    <!-- Panel de marca -->
    <div class="hidden md:flex flex-col p-12 bg-club-green relative overflow-hidden">
      <div class="absolute inset-0 opacity-[0.06] pointer-events-none login-pattern"></div>

      <img src="/escudo.png" alt="Escudo Atlético Palma del Río" class="relative h-[58px] w-auto object-contain select-none" />

      <div class="relative max-w-sm flex-1 flex flex-col justify-center text-left">
        <h1 class="font-display text-3xl text-white leading-tight">
          Intranet de gestión del club
        </h1>
        <p class="text-white/70 text-sm mt-3 leading-relaxed">
          Calendario, plantillas, jugadores y resultados de todas las categorías, en un solo sitio.
        </p>
      </div>

      <p class="relative text-white/50 text-xs">
        © {{ new Date().getFullYear() }} Atlético Palma del Río
      </p>
    </div>

    <!-- Formulario -->
    <div class="flex-1 flex items-center justify-center px-4 py-10 overflow-y-auto bg-club-cream">
      <div class="w-full max-w-sm">
        <!-- Escudo compacto solo en móvil -->
        <div class="flex md:hidden flex-col items-center mb-8">
          <img
            src="/escudo.png"
            alt="Escudo Atlético Palma del Río"
            class="w-20 h-auto object-contain select-none"
          />
          <h1 class="mt-4 font-display text-lg text-ink-primary tracking-wide text-center">
            Atlético Palma del Río
          </h1>
          <p class="text-ink-tertiary text-sm mt-1">Intranet de gestión del club</p>
        </div>

        <div class="mb-6 hidden md:flex items-center gap-3">
          <svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <polygon points="0 0 24 0 24 24 0 24"></polygon>
              <path d="M12,11 C9.790861,11 8,9.209139 8,7 C8,4.790861 9.790861,3 12,3 C14.209139,3 16,4.790861 16,7 C16,9.209139 14.209139,11 12,11 Z" fill="#afafaf" fill-rule="nonzero" opacity="0.3"></path>
              <path d="M3.00065168,20.1992055 C3.38825852,15.4265159 7.26191235,13 11.9833413,13 C16.7712164,13 20.7048837,15.2931929 20.9979143,20.2 C21.0095879,20.3954741 20.9979143,21 20.2466999,21 C16.541124,21 11.0347247,21 3.72750223,21 C3.47671215,21 2.97953825,20.45918 3.00065168,20.1992055 Z" fill="#afafaf" fill-rule="nonzero"></path>
            </g>
          </svg>
          <h2 class="font-display text-xl text-ink-primary">Datos de Acceso</h2>
        </div>

        <form @submit.prevent="onSubmit" class="bg-white rounded-xl shadow-[0_1px_2px_rgb(16_24_40_/_0.04),0_4px_16px_rgb(16_24_40_/_0.06)] border border-line p-8 space-y-5">
          <div class="flex flex-col gap-2">
            <label for="usuario" class="text-sm font-medium text-ink-secondary">Usuario</label>
            <IconField>
              <InputIcon class="pi pi-user" />
              <InputText id="usuario" v-model="usuario" autocomplete="username" placeholder="tu.usuario" class="w-full" />
            </IconField>
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="text-sm font-medium text-ink-secondary">Contraseña</label>
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

          <Button
            type="submit"
            label="Iniciar sesión"
            icon="pi pi-sign-in"
            :loading="enviando"
            class="w-full !bg-club-green !border-club-green hover:!bg-club-greenLight"
          />
        </form>

        <p class="md:hidden text-center text-xs text-ink-tertiary mt-6">
          Atlético Palma del Río © 2026 Todos los derechos reservados
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-pattern {
  background-image: radial-gradient(circle, #ffffff 1px, transparent 1px);
  background-size: 24px 24px;
}
</style>
