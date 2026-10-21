<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { usuariosService, seccionesService, categoriasService } from '../../services';
import Message from 'primevue/message';
import { suscribirseCambio, emitirCambio } from '../../utils/cambioBus';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const toast = useToast();
const confirm = useConfirm();

/** Un administrador resetea el 2FA de un usuario (p. ej. si perdió el móvil):
 * lo deja sin segundo factor y tendrá que configurarlo de nuevo al entrar. */
function resetear2fa(data) {
  confirm.require({
    message: `¿Resetear la verificación en dos pasos de "${data.usuario}"? Tendrá que configurarla de nuevo en su próximo acceso.`,
    header: 'Resetear 2FA',
    icon: 'pi pi-shield',
    acceptLabel: 'Resetear',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await usuariosService.resetear2fa(data.id);
        toast.add({ severity: 'success', summary: '2FA reseteado', detail: 'El usuario lo reconfigurará al iniciar sesión.', life: 4000 });
        emitirCambio();
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo resetear.', life: 4000 });
      }
    }
  });
}

const secciones = ref([]);
const categorias = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  secciones.value = await seccionesService.listar();
  categorias.value = await categoriasService.listar();
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: c.nombre, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesRol = [
  { label: 'Coordinador (ve todas las categorías)', value: 'coordinador' },
  { label: 'Entrenador (solo su categoría)', value: 'entrenador' }
];

const columns = computed(() => [
  { field: 'usuario', header: 'Usuario', type: 'text', required: true },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'rol', header: 'Rol', type: 'select', options: opcionesRol, required: true },
  { field: 'id_categoria', header: 'Categoría', type: 'text', enForm: false,
    format: (v) => categorias.value.find(c => c.id === Number(v))?.nombre || '—' },
  { field: 'permisos_secciones', header: 'Permisos', type: 'text', soloTabla: true },
  { field: 'totp_activado', header: '2FA', type: 'text', soloTabla: true, format: (v) => (v ? 'Sí' : 'No') },
  { field: 'password', header: 'Contraseña', type: 'password', requiredOnCreate: true },
  // Correo del usuario: la dirección se ve en la tabla; la configuración del
  // buzón (servidores, puertos, usuario y contraseña) solo en formulario/detalle.
  { field: 'email', header: 'Email', type: 'text' },
  { field: 'email_imap', header: 'IMAP', type: 'text', enTabla: false },
  { field: 'email_imap_puerto', header: 'Puerto IMAP', type: 'number', enTabla: false },
  { field: 'email_pop3', header: 'POP3', type: 'text', enTabla: false },
  { field: 'email_pop3_puerto', header: 'Puerto POP3', type: 'number', enTabla: false },
  { field: 'email_smtp', header: 'SMTP', type: 'text', enTabla: false },
  { field: 'email_smtp_puerto', header: 'Puerto SMTP (SSL/TLS)', type: 'number', enTabla: false },
  { field: 'email_usuario', header: 'Usuario de correo', type: 'text', enTabla: false },
  { field: 'email_password', header: 'Contraseña de correo', type: 'password', enTabla: false }
]);

const emptyItem = {
  usuario: '',
  nombre: '',
  apellidos: '',
  rol: 'coordinador',
  id_categoria: null,
  permisos: {},
  password: '',
  email: '',
  email_imap: '',
  email_imap_puerto: null,
  email_pop3: '',
  email_pop3_puerto: null,
  email_smtp: '',
  email_smtp_puerto: null,
  email_usuario: '',
  email_password: ''
};

function toggleVer(form, seccionId) {
  if (!form.permisos) form.permisos = {};
  if (!form.permisos[seccionId]) form.permisos[seccionId] = { ver: false, editar: false };
  const actual = form.permisos[seccionId];
  actual.ver = !actual.ver;
  if (!actual.ver) actual.editar = false;
}

function toggleEditar(form, seccionId) {
  if (!form.permisos) form.permisos = {};
  if (!form.permisos[seccionId]) form.permisos[seccionId] = { ver: false, editar: false };
  const actual = form.permisos[seccionId];
  actual.editar = !actual.editar;
  if (actual.editar) actual.ver = true;
}

function tienePermiso(form, seccionId) {
  return !!form.permisos?.[seccionId]?.ver;
}

function tieneEditar(form, seccionId) {
  return !!form.permisos?.[seccionId]?.editar;
}

function todasVer(form) {
  return secciones.value.length > 0 && secciones.value.every((s) => tienePermiso(form, s.clave));
}

function todasEditar(form) {
  return secciones.value.length > 0 && secciones.value.every((s) => tieneEditar(form, s.clave));
}

/** Marca (o desmarca, si ya estaban todas) Ver o Editar en todas las secciones.
 * Mantiene la misma regla que por sección: editar implica ver, y quitar ver quita editar. */
function toggleTodas(form, tipo) {
  if (!form.permisos) form.permisos = {};
  const activar = tipo === 'ver' ? !todasVer(form) : !todasEditar(form);
  secciones.value.forEach((sec) => {
    const actual = form.permisos[sec.clave] || (form.permisos[sec.clave] = { ver: false, editar: false });
    if (tipo === 'ver') {
      actual.ver = activar;
      if (!activar) actual.editar = false;
    } else {
      actual.editar = activar;
      if (activar) actual.ver = true;
    }
  });
}

function nombresSecciones(data) {
  if (!data.permisos) return '—';
  const claves = Object.entries(data.permisos)
    .filter(([, p]) => p.ver)
    .map(([k]) => k);
  if (!claves.length) return '—';
  return claves.map(k => secciones.value.find(s => s.clave === k)?.nombre || k).join(', ');
}

function prepararEdicion(data) {
  const permisos = {};
  (data.secciones || []).forEach(s => {
    permisos[s.clave] = {
      ver: s.usuario_secciones?.puede_ver ?? true,
      editar: s.usuario_secciones?.puede_editar ?? false
    };
  });
  return { permisos };
}
</script>

<template>
<SectionGuard seccion="administracion">
  <div>
    <div class="flex items-start justify-between gap-3 flex-wrap mb-1">
      <h1 class="font-display text-xl text-club-green flex items-center gap-2">
        <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
        Administración
      </h1>
      <router-link to="/secciones">
        <Button label="Ordenar secciones del menú" icon="pi pi-sort-alt" text
                class="!text-club-green !border-club-green/50" outlined />
      </router-link>
    </div>
    <p class="text-sm text-ink-tertiary mb-4">
      Gestión de usuarios de la intranet. Al crear o editar, indica las secciones que podrá ver y editar.
    </p>

    <Message severity="info" :closable="false" class="mb-4">
      La contraseña debe tener mínimo 8 caracteres y combinar mayúsculas, minúsculas, números y símbolos.
      Al editar un usuario, deja el campo contraseña vacío si no quieres cambiarla (lo mismo para la contraseña de correo).
      <strong>Rol</strong>: Coordinador = ve todas las categorías, Entrenador = ve solo su categoría.
    </Message>

    <CrudDataTable
      title="Usuarios"
      seccion="administracion"
      :columns="columns"
      :service="usuariosService"
      :emptyItem="emptyItem"
      :prepareEdit="prepararEdicion"
      formMaxWidth="max-w-2xl"
    >
      <template #cell-rol="{ data }">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
          :class="data.rol === 'entrenador' ? 'bg-club-garnet/10 text-club-garnet' : 'bg-club-green/10 text-club-green'"
        >
          {{ data.rol === 'entrenador' ? 'Entrenador' : 'Coordinador' }}
        </span>
      </template>
      <template #cell-permisos_secciones="{ data }">
        <span class="text-sm">{{ nombresSecciones(data) }}</span>
      </template>
      <template #cell-totp_activado="{ data }">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
          :class="data.totp_activado ? 'bg-club-green/10 text-club-green' : 'bg-club-garnet/10 text-club-garnet'"
        >
          <i :class="data.totp_activado ? 'pi pi-shield' : 'pi pi-exclamation-triangle'" class="text-[0.7rem]" />
          {{ data.totp_activado ? 'Activado' : 'Sin configurar' }}
        </span>
      </template>
      <template #cell-password>
        <span class="text-ink-tertiary">••••••••</span>
      </template>
      <template #detail-rol="{ data }">
        {{ data.rol === 'entrenador' ? 'Entrenador (solo su categoría)' : 'Coordinador (ve todas las categorías)' }}
      </template>
      <template #detail-permisos_secciones="{ data }">
        <div class="space-y-1">
          <div v-for="sec in secciones" :key="sec.id" class="flex items-center gap-2 text-sm">
            <i v-if="data.permisos?.[sec.clave]?.editar" class="pi pi-pencil text-club-green text-xs"></i>
            <i v-else-if="data.permisos?.[sec.clave]?.ver" class="pi pi-eye text-blue-600 text-xs"></i>
            <i v-else class="pi pi-minus text-gray-300 text-xs"></i>
            <span :class="data.permisos?.[sec.clave]?.ver ? 'text-ink-primary' : 'text-ink-tertiary'">
              {{ sec.nombre }}
            </span>
          </div>
        </div>
      </template>

      <template #detail-extra="{ data }">
        <div class="flex items-center justify-between gap-3 border-t border-line pt-3 mt-1">
          <div class="text-sm">
            <span class="font-medium text-ink-secondary">Verificación en dos pasos: </span>
            <span :class="data.totp_activado ? 'text-club-green' : 'text-club-garnet'">
              {{ data.totp_activado ? 'activada' : 'sin configurar' }}
            </span>
          </div>
          <Button
            v-if="data.totp_activado"
            label="Resetear 2FA"
            icon="pi pi-shield"
            severity="secondary"
            outlined
            size="small"
            @click="resetear2fa(data)"
          />
        </div>
      </template>

      <template #form-extra="{ form }">
        <div v-if="form.rol === 'entrenador'" class="flex flex-col gap-1.5 mb-4">
          <label for="id_categoria" class="text-sm font-medium text-ink-secondary">
            Categoría <span class="text-club-garnet">*</span>
          </label>
          <Select
            id="id_categoria"
            v-model="form.id_categoria"
            :options="opcionesCategoria"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            placeholder="Selecciona una categoría"
            showClear
          />
        </div>

        <div>
          <label class="text-sm font-medium text-ink-secondary block mb-2">Permisos por sección</label>
          <div class="border border-line rounded-lg overflow-hidden">
            <div class="bg-club-green/5 px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-ink-tertiary">
              <span class="w-24">Sección</span>
              <span class="w-16 text-center">Ver</span>
              <span class="w-16 text-center">Editar</span>
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 border-t border-line bg-club-green/[0.03]">
              <span class="w-24 text-sm font-semibold text-club-green truncate">Todas</span>
              <button type="button" class="w-16 flex justify-center" title="Marcar o desmarcar Ver en todas las secciones"
                      @click="toggleTodas(form, 'ver')">
                <i class="pi transition-colors"
                   :class="todasVer(form) ? 'pi-eye text-blue-600' : 'pi-eye-slash text-gray-300'"></i>
              </button>
              <button type="button" class="w-16 flex justify-center" title="Marcar o desmarcar Editar en todas las secciones"
                      @click="toggleTodas(form, 'editar')">
                <i class="pi pi-pencil transition-colors"
                   :class="todasEditar(form) ? 'text-club-green' : 'text-gray-300'"></i>
              </button>
            </div>
            <div v-for="sec in secciones" :key="sec.id"
                 class="flex items-center gap-2 px-3 py-1.5 border-t border-line hover:bg-gray-50">
              <span class="w-24 text-sm text-ink-primary truncate">{{ sec.nombre }}</span>
              <button type="button" class="w-16 flex justify-center"
                      @click="toggleVer(form, sec.clave)">
                <i class="pi transition-colors"
                   :class="tienePermiso(form, sec.clave) ? 'pi-eye text-blue-600' : 'pi-eye-slash text-gray-300'"></i>
              </button>
              <button type="button" class="w-16 flex justify-center"
                      :disabled="!tienePermiso(form, sec.clave)"
                      @click="toggleEditar(form, sec.clave)">
                <i class="pi transition-colors"
                   :class="[
                     tieneEditar(form, sec.clave) ? 'pi-pencil text-club-green' : 'pi-pencil text-gray-300',
                     !tienePermiso(form, sec.clave) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                   ]"></i>
              </button>
            </div>
          </div>
        </div>
      </template>
    </CrudDataTable>
  </div>
</SectionGuard>
</template>
