<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { useAuthStore } from '../../stores/auth.store';

// Pasos del acceso: credenciales -> (verificar | configurar) -> [codigos]
const paso = ref('credenciales');

const usuario = ref('');
const password = ref('');
const codigo = ref('');
const nombre = ref('');
const qr = ref('');
const secret = ref('');
const codigosRecuperacion = ref([]);
const error = ref('');
const enviando = ref(false);

const auth = useAuthStore();
const router = useRouter();

function entrar() {
  router.replace({ name: auth.primeraSeccion });
}

async function onSubmit() {
  error.value = '';
  if (!usuario.value || !password.value) {
    error.value = 'Introduce tu usuario y tu contraseña.';
    return;
  }
  enviando.value = true;
  try {
    const resp = await auth.login(usuario.value, password.value);
    nombre.value = resp.nombre || '';
    codigo.value = '';
    if (resp.twofa === 'verificar') {
      paso.value = 'verificar';
    } else if (resp.twofa === 'configurar') {
      const datos = await auth.enrolar2faInicio();
      qr.value = datos.qr;
      secret.value = datos.secret;
      paso.value = 'configurar';
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'No se ha podido iniciar sesión.';
  } finally {
    enviando.value = false;
  }
}

async function onVerificar() {
  error.value = '';
  if (!codigo.value) {
    error.value = 'Escribe el código.';
    return;
  }
  enviando.value = true;
  try {
    await auth.verificar2fa(codigo.value);
    entrar();
  } catch (err) {
    error.value = err.response?.data?.message || 'Código incorrecto.';
  } finally {
    enviando.value = false;
  }
}

async function onConfirmarConfiguracion() {
  error.value = '';
  if (!codigo.value) {
    error.value = 'Escribe el código que muestra tu app.';
    return;
  }
  enviando.value = true;
  try {
    codigosRecuperacion.value = await auth.enrolar2faConfirmar(codigo.value);
    paso.value = 'codigos';
  } catch (err) {
    error.value = err.response?.data?.message || 'No se ha podido activar el 2FA.';
  } finally {
    enviando.value = false;
  }
}

async function copiarCodigos() {
  try {
    await navigator.clipboard.writeText(codigosRecuperacion.value.join('\n'));
  } catch { /* sin portapapeles: el usuario los copia a mano */ }
}
</script>

<template>
  <div class="h-screen w-full grid md:grid-cols-2 overflow-hidden">
    <!-- Panel de marca -->
    <div class="hidden md:flex flex-col p-12 bg-club-green relative overflow-hidden">
      <div class="absolute inset-0 opacity-40 pointer-events-none login-bg"></div>

      <div class="relative flex-1 flex flex-col justify-center">
        <span class="w-10 h-[3px] bg-white/70 rounded-full mb-5"></span>
        <h1 class="font-display text-xl lg:text-2xl xl:text-3xl text-white leading-tight !font-normal whitespace-nowrap">
          Intranet Atlético Palma del Río
        </h1>
      </div>

      <p class="relative text-white/50 text-xs">
        Atlético Palma del Río © {{ new Date().getFullYear() }} Todos los derechos reservados
      </p>
    </div>

    <!-- Formulario -->
    <div class="flex-1 flex items-center justify-center px-4 py-10 overflow-y-auto login-form-panel">
      <div class="w-full max-w-sm">
        <!-- Escudo compacto solo en móvil -->
        <div class="flex md:hidden flex-col items-center mb-8">
          <img
            src="/escudo.png"
            alt="Escudo Atlético Palma del Río"
            class="w-20 h-auto object-contain select-none"
          />
          <h1 class="mt-4 font-display text-lg text-white tracking-wide text-center">
            Atlético Palma del Río
          </h1>
          <p class="text-white/70 text-sm mt-1">Intranet de gestión del club</p>
        </div>

        <div class="-mt-16 mb-6 hidden md:flex justify-center">
          <img src="/escudo.png" alt="Escudo Atlético Palma del Río" class="h-[9.6rem] w-auto object-contain select-none" />
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

        <!-- Paso 1: usuario y contraseña -->
        <form v-if="paso === 'credenciales'" @submit.prevent="onSubmit" class="bg-white rounded-xl shadow-[0_1px_2px_rgb(16_24_40_/_0.04),0_4px_16px_rgb(16_24_40_/_0.06)] border border-line p-8 space-y-5">
          <div class="flex flex-col gap-2">
            <label for="usuario" class="text-sm font-medium text-ink-secondary">Usuario</label>
            <IconField>
              <InputIcon class="pi pi-user" />
              <InputText id="usuario" v-model="usuario" autocomplete="username" placeholder="usuario" class="w-full" />
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

        <!-- Paso 2 (ya tiene 2FA): código del autenticador -->
        <form v-else-if="paso === 'verificar'" @submit.prevent="onVerificar" class="bg-white rounded-xl shadow-[0_1px_2px_rgb(16_24_40_/_0.04),0_4px_16px_rgb(16_24_40_/_0.06)] border border-line p-8 space-y-5">
          <div class="flex items-center gap-2 text-ink-primary">
            <i class="pi pi-shield text-club-green" />
            <h2 class="font-display text-lg">Verificación en dos pasos</h2>
          </div>
          <p class="text-sm text-ink-secondary">
            {{ nombre ? `Hola ${nombre}. ` : '' }}Escribe el código de 6 dígitos de tu app de autenticación.
          </p>
          <div class="flex flex-col gap-2">
            <label for="codigo" class="text-sm font-medium text-ink-secondary">Código</label>
            <InputText id="codigo" v-model="codigo" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" class="w-full tracking-[0.3em] text-center" />
            <small class="text-ink-tertiary">¿Perdiste el acceso? Escribe aquí uno de tus códigos de recuperación.</small>
          </div>

          <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

          <Button type="submit" label="Verificar" icon="pi pi-check" :loading="enviando" class="w-full !bg-club-green !border-club-green hover:!bg-club-greenLight" />
        </form>

        <!-- Paso 2 (sin 2FA): configurar el autenticador -->
        <form v-else-if="paso === 'configurar'" @submit.prevent="onConfirmarConfiguracion" class="bg-white rounded-xl shadow-[0_1px_2px_rgb(16_24_40_/_0.04),0_4px_16px_rgb(16_24_40_/_0.06)] border border-line p-8 space-y-5">
          <div class="flex items-center gap-2 text-ink-primary">
            <i class="pi pi-shield text-club-green" />
            <h2 class="font-display text-lg">Configura la verificación en dos pasos</h2>
          </div>
          <p class="text-sm text-ink-secondary">
            Es obligatoria. Escanea este código con Google Authenticator, Authy o similar y escribe el código que te muestre.
          </p>
          <div class="flex justify-center">
            <img v-if="qr" :src="qr" alt="Código QR para el autenticador" class="w-44 h-44 border border-line rounded-lg" />
          </div>
          <p class="text-xs text-ink-tertiary break-all text-center">
            ¿No puedes escanear? Introduce esta clave a mano:<br />
            <span class="font-mono text-ink-secondary">{{ secret }}</span>
          </p>
          <div class="flex flex-col gap-2">
            <label for="codigoConf" class="text-sm font-medium text-ink-secondary">Código de la app</label>
            <InputText id="codigoConf" v-model="codigo" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" class="w-full tracking-[0.3em] text-center" />
          </div>

          <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

          <Button type="submit" label="Activar y entrar" icon="pi pi-check" :loading="enviando" class="w-full !bg-club-green !border-club-green hover:!bg-club-greenLight" />
        </form>

        <!-- Paso 3: códigos de recuperación (se muestran una sola vez) -->
        <div v-else-if="paso === 'codigos'" class="bg-white rounded-xl shadow-[0_1px_2px_rgb(16_24_40_/_0.04),0_4px_16px_rgb(16_24_40_/_0.06)] border border-line p-8 space-y-5">
          <div class="flex items-center gap-2 text-ink-primary">
            <i class="pi pi-key text-club-green" />
            <h2 class="font-display text-lg">Guarda tus códigos de recuperación</h2>
          </div>
          <Message severity="warn" :closable="false">
            Son tu única forma de entrar si pierdes el móvil. Guárdalos en un lugar seguro: no se volverán a mostrar.
          </Message>
          <ul class="grid grid-cols-2 gap-2 font-mono text-sm text-ink-primary">
            <li v-for="c in codigosRecuperacion" :key="c" class="bg-club-cream rounded px-2 py-1 text-center">{{ c }}</li>
          </ul>
          <div class="flex gap-2">
            <Button label="Copiar" icon="pi pi-copy" severity="secondary" outlined class="flex-1" @click="copiarCodigos" />
            <Button label="Guardados, entrar" icon="pi pi-sign-in" class="flex-1 !bg-club-green !border-club-green hover:!bg-club-greenLight" @click="entrar" />
          </div>
        </div>

        <p class="md:hidden text-center text-xs text-white/60 mt-6">
          Atlético Palma del Río © 2026 Todos los derechos reservados
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-bg {
  background-image: url('/login-bg.png');
  background-size: cover;
  background-position: center;
}
.login-form-panel {
  background-color: #F7F8FA;
}
@media (max-width: 767px) {
  .login-form-panel {
    background-color: #0F3D22;
    background-image: url('/login-bg.png');
    background-size: cover;
    background-position: center;
  }
}
</style>
