---
name: corregir-datos
description: Corregir datos directamente en la base de datos de producción del EC2 (mover jugadores de plantilla, borrar promociones, arreglar dorsales…) con copia previa de las filas afectadas.
---

# Corregir datos en producción

Acceso al EC2: memoria `reference_ec2_acceso`. La BD está en el contenedor `apr_mysql`; usar las credenciales del `.env.development` del EC2 sin mostrarlas (`set -a; . ./.env.development; set +a` dentro del comando SSH).

1. **Consultar primero** (solo SELECT) y enseñar al usuario lo que hay y lo que se va a cambiar. Si hay ambigüedad (qué plantilla, qué jugador), preguntar.
2. **Copia** de las filas que se van a tocar, antes de cambiar nada:
   `umask 077; mkdir -p ~/borrados; docker exec apr_mysql mysqldump … --no-create-info --where="id IN (…)" <bd> <tabla> > ~/borrados/<descripcion>_$(date +%Y%m%d_%H%M%S).sql`
3. Ejecutar el UPDATE/DELETE/INSERT con `WHERE` por id, nunca masivo sin confirmación.
4. Volver a consultar para verificar el resultado.
5. Informar: qué se cambió, ruta de la copia, y si el problema puede repetirse por el código (proponer el arreglo).

Son cambios de datos: no hay commit ni redespliegue. Reglas de dominio (plantillas, orden de categorías, promociones): ver `CLAUDE.md`.
