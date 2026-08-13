import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import 'primeicons/primeicons.css';
import './assets/main.css';

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.store';
import { localeEs } from './utils/localeEs';

const ClubPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef4f1', 100: '#d3e3dc', 200: '#aecabf',
      300: '#86af9f', 400: '#4f8a72', 500: '#0B3D2E',
      600: '#0a3729', 700: '#083023', 800: '#06281d',
      900: '#031b13', 950: '#020f0a'
    }
  }
});

const app = createApp(App);

app.use(createPinia());
app.use(PrimeVue, {
  theme: { preset: ClubPreset, options: { darkModeSelector: false } },
  locale: localeEs
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);
app.use(router);

// Antes de montar, intenta restaurar la sesión desde el token guardado
const authStore = useAuthStore();
authStore.restoreSession().finally(() => {
  app.mount('#app');
});
