import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/recuperar-password',
    name: 'recuperar-password',
    component: () => import('../views/auth/RecuperarPassword.vue'),
    meta: { public: true }
  },
  {
    path: '/restablecer-password',
    name: 'restablecer-password',
    component: () => import('../views/auth/RestablecerPassword.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: () => {
        const auth = useAuthStore();
        return { name: auth.primeraSeccion || 'calendario' };
      } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/dashboard/Dashboard.vue'),
        meta: { seccion: 'dashboard' }
      },
      {
        path: 'calendario',
        name: 'calendario',
        component: () => import('../views/calendario/Calendario.vue'),
        meta: { seccion: 'calendario' }
      },
      {
        path: 'entrenamientos',
        name: 'entrenamientos',
        component: () => import('../views/entrenamientos/Entrenamientos.vue'),
        meta: { seccion: 'entrenamientos' }
      },
      {
        path: 'partidos',
        name: 'partidos',
        component: () => import('../views/partidos/Partidos.vue'),
        meta: { seccion: 'partidos' }
      },
      {
        path: 'convocatorias',
        name: 'convocatorias',
        component: () => import('../views/convocatorias/Convocatorias.vue'),
        meta: { seccion: 'convocatorias' }
      },
      {
        path: 'temporadas',
        name: 'temporadas',
        component: () => import('../views/temporadas/Temporadas.vue'),
        meta: { seccion: 'temporadas' }
      },
      {
        path: 'titulos',
        name: 'titulos',
        component: () => import('../views/titulos/Titulos.vue'),
        meta: { seccion: 'titulos' }
      },
      {
        path: 'division',
        name: 'division',
        component: () => import('../views/division/Division.vue'),
        meta: { seccion: 'division' }
      },
      {
        path: 'material',
        name: 'material',
        component: () => import('../views/material/Material.vue'),
        meta: { seccion: 'material' }
      },
      {
        path: 'posicion',
        name: 'posicion',
        component: () => import('../views/posicion/Posicion.vue'),
        meta: { seccion: 'posicion' }
      },
      {
        path: 'lugares',
        name: 'lugares',
        component: () => import('../views/lugares/Lugares.vue'),
        meta: { seccion: 'lugares' }
      },
      {
        path: 'delegados',
        name: 'delegados',
        component: () => import('../views/delegados/Delegados.vue'),
        meta: { seccion: 'delegados' }
      },
      {
        path: 'generar-torneo',
        name: 'generar_torneo',
        component: () => import('../views/generarTorneo/GenerarTorneo.vue'),
        meta: { seccion: 'generar_torneo' }
      },
      {
        path: 'personal',
        name: 'personal',
        component: () => import('../views/personal/Personal.vue'),
        meta: { seccion: 'personal' }
      },
      {
        path: 'tipo-personal',
        name: 'tipo_personal',
        component: () => import('../views/tipoPersonal/TipoPersonal.vue'),
        meta: { seccion: 'tipo_personal' }
      },
      {
        path: 'coordinadores',
        name: 'coordinadores',
        component: () => import('../views/coordinadores/Coordinadores.vue'),
        meta: { seccion: 'coordinadores' }
      },
      {
        path: 'categorias',
        name: 'categorias',
        component: () => import('../views/categorias/Categorias.vue'),
        meta: { seccion: 'categorias' }
      },
      {
        path: 'equipos',
        name: 'equipos',
        component: () => import('../views/equipos/Equipos.vue'),
        meta: { seccion: 'equipos' }
      },
      {
        path: 'equipos-jugadores',
        name: 'equipos-jugadores',
        component: () => import('../views/equiposJugadores/EquiposJugadores.vue'),
        meta: { seccion: 'equipos_jugadores' }
      },
      {
        path: 'jugadores',
        name: 'jugadores',
        component: () => import('../views/jugadores/Jugadores.vue'),
        meta: { seccion: 'jugadores' }
      },
      {
        path: 'plantillas',
        name: 'plantillas',
        component: () => import('../views/plantillas/Plantillas.vue'),
        meta: { seccion: 'plantillas' }
      },
      {
        path: 'entrenadores',
        name: 'entrenadores',
        component: () => import('../views/entrenadores/Entrenadores.vue'),
        meta: { seccion: 'entrenadores' }
      },
      {
        path: 'administracion',
        name: 'administracion',
        component: () => import('../views/admin/Usuarios.vue'),
        meta: { seccion: 'administracion' }
      },
      {
        path: 'secciones',
        name: 'secciones',
        component: () => import('../views/secciones/Secciones.vue'),
        meta: { seccion: 'administracion' }
      },
      {
        path: 'correos',
        name: 'correos',
        component: () => import('../views/admin/Correos.vue'),
        // Solo el usuario admin (no va por permisos de sección).
        meta: { soloAdmin: true }
      },
      {
        path: 'categoria-calendario',
        name: 'categoria-calendario',
        component: () => import('../views/categoriaCalendario/CategoriaCalendario.vue'),
        meta: { seccion: 'categoria_calendario' }
      },
      {
        path: 'torneo',
        name: 'torneo',
        component: () => import('../views/torneo/Torneo.vue'),
        meta: { seccion: 'torneo' }
      },
      {
        path: 'sanciones',
        name: 'sanciones',
        component: () => import('../views/sanciones/Sanciones.vue'),
        meta: { seccion: 'sanciones' }
      },
      // Estadísticas: una sección (y una ruta) por tabla.
      { path: 'estadisticas', redirect: '/estadisticas/convocatorias' },
      {
        path: 'estadisticas/convocatorias',
        name: 'estadisticas_convocatorias',
        component: () => import('../views/estadisticas/Estadisticas.vue'),
        props: { tabla: 'convocatorias' },
        meta: { seccion: 'estadisticas_convocatorias' }
      },
      {
        path: 'estadisticas/tiempo',
        name: 'estadisticas_tiempo',
        component: () => import('../views/estadisticas/Estadisticas.vue'),
        props: { tabla: 'tiempo' },
        meta: { seccion: 'estadisticas_tiempo' }
      },
      {
        path: 'estadisticas/goles',
        name: 'estadisticas_goles',
        component: () => import('../views/estadisticas/Estadisticas.vue'),
        props: { tabla: 'goles' },
        meta: { seccion: 'estadisticas_goles' }
      },
      {
        path: 'estadisticas/sanciones',
        name: 'estadisticas_sanciones',
        component: () => import('../views/estadisticas/Estadisticas.vue'),
        props: { tabla: 'sanciones' },
        meta: { seccion: 'estadisticas_sanciones' }
      },
      {
        path: 'estadisticas/clasificacion',
        name: 'estadisticas_clasificacion',
        component: () => import('../views/estadisticas/EstadisticasClasificacion.vue'),
        meta: { seccion: 'estadisticas_clasificacion' }
      },
      {
        path: 'estadisticas/rivales',
        name: 'estadisticas_rivales',
        component: () => import('../views/estadisticas/EstadisticasRivales.vue'),
        meta: { seccion: 'estadisticas_rivales' }
      },
      // Estadísticas por categoría (Convocatorias y Goles de la categoría del
      // usuario), apartado distinto al de Senior A.
      {
        path: 'estadisticas-categoria/convocatorias',
        name: 'estadisticas_cat_convocatorias',
        component: () => import('../views/estadisticas/EstadisticasCategoria.vue'),
        props: { tabla: 'convocatorias', seccion: 'estadisticas_cat_convocatorias' },
        meta: { seccion: 'estadisticas_cat_convocatorias' }
      },
      {
        path: 'estadisticas-categoria/goles',
        name: 'estadisticas_cat_goles',
        component: () => import('../views/estadisticas/EstadisticasCategoria.vue'),
        props: { tabla: 'goles', seccion: 'estadisticas_cat_goles' },
        meta: { seccion: 'estadisticas_cat_goles' }
      },
      {
        path: 'estadisticas-categoria/sanciones',
        name: 'estadisticas_cat_sanciones',
        component: () => import('../views/estadisticas/EstadisticasCategoria.vue'),
        props: { tabla: 'sanciones', seccion: 'estadisticas_cat_sanciones' },
        meta: { seccion: 'estadisticas_cat_sanciones' }
      },
      {
        path: 'estadisticas-categoria/clasificacion',
        name: 'estadisticas_cat_clasificacion',
        component: () => import('../views/estadisticas/EstadisticasClasificacionCategoria.vue'),
        meta: { seccion: 'estadisticas_cat_clasificacion' }
      },
      {
        path: 'informes',
        name: 'informes',
        component: () => import('../views/informes/Informes.vue'),
        meta: { seccion: 'informes' }
      },
      // Notificaciones (submenú dentro de Club): documentos PDF del club.
      {
        path: 'notificaciones/invitacion-torneo',
        name: 'invitacion_torneo',
        component: () => import('../views/notificaciones/InvitacionTorneo.vue'),
        meta: { seccion: 'invitacion_torneo' }
      },
      {
        path: 'notificaciones/nota-prensa',
        name: 'nota_prensa',
        component: () => import('../views/notificaciones/NotaPrensa.vue'),
        meta: { seccion: 'nota_prensa' }
      },
      {
        path: 'notificaciones/nota-informativa',
        name: 'nota_informativa',
        component: () => import('../views/notificaciones/NotaInformativa.vue'),
        meta: { seccion: 'nota_informativa' }
      },
      {
        path: 'cambios',
        name: 'cambios',
        component: () => import('../views/cambios/Cambios.vue'),
        meta: { seccion: 'cambios' }
      },
      {
        path: 'firma-email',
        name: 'firma_email',
        component: () => import('../views/firmaEmail/FirmaEmail.vue'),
        meta: { seccion: 'firma_email' }
      },
      {
        // Sin `seccion`: cualquier usuario puede cambiar su contraseña.
        path: 'cambiar-password',
        name: 'cambiar_password',
        component: () => import('../views/cambiarPassword/CambiarPassword.vue')
      },
      {
        path: 'promociones',
        name: 'promociones',
        component: () => import('../views/promociones/Promociones.vue'),
        meta: { seccion: 'promociones' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) {
      return { name: auth.primeraSeccion };
    }
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login' };
  }

  // Rutas solo para el administrador principal (usuario "admin").
  if (to.meta.soloAdmin && !auth.esAdmin) {
    return { name: auth.primeraSeccion };
  }

  if (to.meta.seccion && !auth.puedeVer(to.meta.seccion)) {
    const destino = auth.primeraSeccion;
    // Si el usuario no tiene ninguna sección permitida, `primeraSeccion` cae en el
    // valor por defecto ('calendario') aunque tampoco tenga permiso para verlo: redirigir
    // ahí formaría un bucle infinito de redirecciones que congela la pestaña. En ese caso
    // se deja pasar la navegación: SectionGuard se encarga de mostrar el aviso de "sin permiso".
    if (destino === to.name) return true;
    return { name: destino };
  }

  return true;
});

export default router;
