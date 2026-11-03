// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import PrimeVue from 'primevue/config';
import PestanasLado from '../components/PestanasLado.vue';

// TabList de PrimeVue lo usa; jsdom no lo trae.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

describe('PestanasLado', () => {
  it('pestañas Total, Local y Visitante; solo pinta el lado elegido', async () => {
    const w = mount(PestanasLado, {
      slots: { default: `<template #default="{ lado }"><p class="contenido">{{ lado.clave }}{{ lado.sufijo }}</p></template>` },
      global: { plugins: [PrimeVue] }
    });
    await nextTick();
    const pestanas = w.findAll('[role="tab"]');
    expect(pestanas.map((t) => t.text())).toEqual(['Total', 'Local', 'Visitante']);
    expect(w.findAll('.contenido').map((p) => p.text())).toEqual(['total']);
    await pestanas[2].trigger('click');
    await nextTick();
    expect(w.findAll('.contenido').map((p) => p.text())).toEqual(['visitante_visitante']);
  });
});
