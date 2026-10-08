<script setup>
import { ref, reactive, computed, watch } from 'vue';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { DATOS_POR_DEFECTO, generarFirmaHtml } from '../../utils/firmaEmail';

/** Editor de la firma de correo del club (solo coordinadores, ver
 * SECCIONES_SOLO_COORDINADORES en auth.store). Se genera a partir del
 * formulario y el HTML se puede retocar a mano; el borrador se recuerda en
 * este navegador. */
const CLAVE_BORRADOR = 'apr_firma_email';
const toast = useToast();

function leerBorrador() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null');
  } catch {
    return null;
  }
}

const borrador = leerBorrador();
const datos = reactive({ ...DATOS_POR_DEFECTO, ...(borrador?.datos || {}) });
// Sin retoques a mano, se regenera con la plantilla actual (así una mejora de
// la plantilla llega también a quien ya tenía un borrador guardado).
const html = ref(borrador?.editadoAMano && borrador.html ? borrador.html : generarFirmaHtml(datos));
// Si se ha retocado el HTML a mano, el formulario ya no lo sobrescribe
// hasta pulsar "Regenerar desde el formulario".
const editadoAMano = ref(!!borrador?.editadoAMano);

watch(datos, () => {
  if (!editadoAMano.value) html.value = generarFirmaHtml(datos);
}, { deep: true });

watch([datos, html, editadoAMano], () => {
  try {
    localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ datos: { ...datos }, html: html.value, editadoAMano: editadoAMano.value }));
  } catch { /* sin almacenamiento: el editor funciona igual */ }
}, { deep: true });

function onEditarHtml(valor) {
  html.value = valor;
  editadoAMano.value = true;
}

function regenerar() {
  editadoAMano.value = false;
  html.value = generarFirmaHtml(datos);
}

function restablecer() {
  Object.assign(datos, DATOS_POR_DEFECTO);
  regenerar();
}

// La vista previa va en un iframe sin scripts (sandbox): el HTML escrito a
// mano no puede ejecutar nada en la intranet.
const documentoPrevia = computed(() =>
  `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;background:#fff;}</style></head><body>${html.value}</body></html>`
);

async function copiarFirma() {
  try {
    const item = new ClipboardItem({
      'text/html': new Blob([html.value], { type: 'text/html' }),
      'text/plain': new Blob([html.value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()], { type: 'text/plain' })
    });
    await navigator.clipboard.write([item]);
    toast.add({ severity: 'success', summary: 'Firma copiada', detail: 'Pégala en la configuración de firma de tu correo.', life: 4000 });
  } catch {
    toast.add({ severity: 'warn', summary: 'No se pudo copiar', detail: 'Tu navegador no permite copiar con formato: usa "Copiar HTML" o selecciona la vista previa y cópiala.', life: 6000 });
  }
}

async function copiarHtml() {
  try {
    await navigator.clipboard.writeText(html.value);
    toast.add({ severity: 'success', summary: 'HTML copiado', life: 3000 });
  } catch {
    toast.add({ severity: 'warn', summary: 'No se pudo copiar', detail: 'Selecciona el código y cópialo a mano.', life: 5000 });
  }
}

function descargarHtml() {
  const blob = new Blob([documentoPrevia.value], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'firma-email.html';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
<SectionGuard seccion="firma_email">
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="font-display text-xl text-club-green">Firma Email</h1>
      <p class="text-sm text-ink-tertiary">
        Rellena tus datos y copia la firma para pegarla en Gmail, Outlook u otro correo. También puedes retocar el HTML.
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Formulario -->
      <div class="rounded-xl border border-line bg-white p-4 flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-club-green">Datos</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ink-secondary" for="firma-nombre">Nombre y apellidos</label>
            <InputText id="firma-nombre" v-model="datos.nombre" placeholder="Nombre Apellidos" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ink-secondary" for="firma-cargo">Cargo</label>
            <InputText id="firma-cargo" v-model="datos.cargo" placeholder="Coordinador de fútbol base" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ink-secondary" for="firma-telefono">Teléfono</label>
            <InputText id="firma-telefono" v-model="datos.telefono" placeholder="600 000 000" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ink-secondary" for="firma-email">Email</label>
            <InputText id="firma-email" v-model="datos.email" placeholder="nombre@atleticopalmadelrio.com" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ink-secondary" for="firma-web">Web</label>
            <InputText id="firma-web" v-model="datos.web" placeholder="www.atleticopalmadelrio.com" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ink-secondary" for="firma-direccion">Dirección</label>
            <InputText id="firma-direccion" v-model="datos.direccion" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ink-secondary" for="firma-color1">Color principal</label>
            <div class="flex items-center gap-2">
              <input id="firma-color1" v-model="datos.colorPrincipal" type="color" class="h-9 w-12 rounded border border-line" />
              <InputText v-model="datos.colorPrincipal" class="flex-1" />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ink-secondary" for="firma-color2">Color del cargo</label>
            <div class="flex items-center gap-2">
              <input id="firma-color2" v-model="datos.colorSecundario" type="color" class="h-9 w-12 rounded border border-line" />
              <InputText v-model="datos.colorSecundario" class="flex-1" />
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-sm text-ink-secondary">
            <Checkbox v-model="datos.mostrarEscudo" :binary="true" /> Mostrar escudo
          </label>
          <label class="flex items-center gap-2 text-sm text-ink-secondary">
            <Checkbox v-model="datos.mostrarAviso" :binary="true" /> Aviso legal
          </label>
        </div>
        <div v-if="datos.mostrarAviso" class="flex flex-col gap-1">
          <label class="text-xs font-medium text-ink-secondary" for="firma-aviso">Texto del aviso legal</label>
          <Textarea id="firma-aviso" v-model="datos.aviso" rows="4" autoResize />
        </div>
        <div class="flex justify-end">
          <Button label="Restablecer" icon="pi pi-refresh" text severity="secondary" @click="restablecer" />
        </div>
      </div>

      <!-- Vista previa y HTML -->
      <div class="flex flex-col gap-4">
        <div class="rounded-xl border border-line bg-white p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h2 class="text-sm font-semibold text-club-green">Vista previa</h2>
            <div class="flex gap-2 flex-wrap">
              <Button label="Copiar firma" icon="pi pi-copy" size="small"
                      class="!bg-club-green !border-club-green hover:!bg-club-greenLight" @click="copiarFirma" />
              <Button label="Copiar HTML" icon="pi pi-code" size="small" outlined
                      class="!text-club-green !border-club-green/50" @click="copiarHtml" />
              <Button label="Descargar" icon="pi pi-download" size="small" text @click="descargarHtml" />
            </div>
          </div>
          <iframe :srcdoc="documentoPrevia" sandbox="" title="Vista previa de la firma"
                  class="w-full h-64 rounded-lg border border-line bg-white"></iframe>
        </div>

        <div class="rounded-xl border border-line bg-white p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-club-green">HTML</h2>
            <Button v-if="editadoAMano" label="Regenerar desde el formulario" icon="pi pi-replay" size="small" text @click="regenerar" />
          </div>
          <p v-if="editadoAMano" class="text-xs text-amber-700">
            Has editado el HTML a mano: los cambios del formulario no se aplican hasta que lo regeneres.
          </p>
          <textarea :value="html" spellcheck="false" rows="12"
                    class="w-full rounded-lg border border-line p-2 font-mono text-xs leading-relaxed text-ink-primary"
                    @input="onEditarHtml($event.target.value)"></textarea>
        </div>
      </div>
    </div>
  </div>
</SectionGuard>
</template>
