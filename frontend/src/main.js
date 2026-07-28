import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura'; // Si usas PrimeVue 3.x, cambia por el theme clasico (ver README)

import App from './App.vue';
import router from './router';
import './assets/main.css';
import 'primeicons/primeicons.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: false },
  },
});

app.mount('#app');
