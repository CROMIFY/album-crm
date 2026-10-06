# PROGRESO

## 2026-10-06 (tarde) — Tablero: carta a «Por probar», chat apagado actualizado y dos tarjetas nuevas

Escrito directamente en la base en una sola transacción (bloque DO con
guardas y comprobaciones finales, vía `supabase db query --linked`), sin
createTask/updateTask (no se mandó ningún email) y sin tocar
`notification_log` (356 filas, ninguna nueva). Copias en
`Proyectos/backup-tablero-6oct-tarde.json` (antes) y
`backup-tablero-6oct-tarde-despues.json` (después). Verificado contra la copia:
solo cambian las dos tarjetas previstas y aparecen dos nuevas.

- «La carta no va fluida…»: de Esta quincena a **Por probar**, con la nota
  «Arreglada en develop (dd448fb). Cerrar cuando Lander la pruebe en el APK.»
- «Subir y mergear el chat apagado…»: descripción actualizada con la verdad de
  hoy: ramas en GitHub y mergeadas en develop (API PR #11, app PR #14), **API
  sin desplegar** (faltan contar `activo=False` en prod, copia de seguridad y
  OK de Lander), falta probar el APK.
- Nueva, Esta quincena, Lander, vence 2026-10-08: «Probar APK de develop…».
- Nueva, Por pensar, sin fecha ni dueño: foto del jugador retirado pública
  hasta el borrado definitivo y «Borrar todos»/vaciar sin borrar en Cloudinary.
- Tablero: 119 tarjetas. Por pensar 32, Esta quincena 40, En curso 0,
  Bloqueado 3, Por probar 5, Hecho 39.
- Ojo: la fecha «10-08» se ha entendido como 8 de octubre (mes-día).

ESTADO PARA JARVIS: tablero actualizado el 2026-10-06 (tarde), 2 modificadas, 2 creadas, 119 tarjetas

## 2026-10-02 — Auditoría del tablero de tareas (solo lectura)

Revisión del estado del tablero antes de cargar tareas nuevas. Solo lectura: no
se tocó la base de datos, el código ni ninguna tarjeta. El informe con la
clasificación tarjeta a tarjeta se entregó a Lander; no se ha aplicado nada.

- 72 tarjetas: 41 abiertas y 31 en Done. De las 41 abiertas: 14 vigentes, 10
  hechas de facto, 4 duplicadas, 3 obsoletas y 10 dudosas.
- Las 8 tarjetas abiertas con fecha límite están vencidas (de 5 a 24 días) y el
  cron diario les sigue mandando el aviso de «vence hoy».
- 28 de las 41 abiertas no tienen asignado y 33 no tienen fecha.
- Pendiente de Lander: decidir qué cerrar y la estructura de columnas.

ESTADO PARA JARVIS: auditoría del tablero hecha el 2026-10-02, 72 tarjetas revisadas, 17 para cerrar

## 2026-10-05 — Reorganización del tablero y carga de tareas de Cromify

Escrito directamente en la base (sin createTask/updateTask, sin tocar notification_log, sin borrar tarjetas).
Backups en `Proyectos/backup-tablero-5oct.json` (antes) y `backup-tablero-5oct-despues.json` (después).
No hubo transacción única: la API REST no la permite; se aplicó en orden y se verificó al final.

- Columnas nuevas: Por pensar, Esta quincena, En curso, Bloqueado, Por probar, Hecho (is_done_column conservado). Se borraron vacías: Próximo dos semanas, Bloqueado (antigua) y Revisar.
- Etiquetas nuevas: Lanzamiento y Post-lanzamiento.
- 7 tarjetas cerradas con nota «[Cerrada 2-oct]»; 34 existentes actualizadas; 33 creadas.
- Tablero: 105 tarjetas. Por pensar 29, Esta quincena 31, En curso 0, Bloqueado 3, Por probar 4, Hecho 38.
- Ninguna abierta con fecha vencida; 5 con fecha ≤ 6-oct (avisarán mañana).

ESTADO PARA JARVIS: tarjetas de Cromify cargadas el 2026-10-05, 33 creadas, 34 actualizadas, 34 ya existentes (las mismas que se actualizaron), 7 cerradas

## 2026-10-06 — Tablero actualizado con los últimos cambios y tareas de Jaime

Escrito directamente en la base en una sola transacción (bloque DO con guardas y comprobaciones finales, vía `supabase db query --linked`), sin createTask/updateTask, sin tocar notification_log y sin borrar tarjetas. Copia previa en `Proyectos/backup-tablero-6oct.json`. Verificado después contra esa copia: ningún cambio fuera de lo planificado.

- Cerrada: «Decidir el chat: moderar o apagarlo (menores)». Decisión tomada (chat apagado); la ejecución sigue en una tarjeta nueva porque las ramas están sin push ni merge.
- 10 modificadas: 5 con notas del 6-oct (APK nuevo en la checklist, pack de bienvenida, 11 de la semana, Firebase/FCM ya hecho, calendario de la prueba cerrada) y 5 reasignadas a Jaime, con fechas nuevas en las dos primeras (seguridad en producción, probabilidades, Sentry del panel, BBDD, almacenamiento de vídeo).
- 12 creadas: 3 por los últimos cambios (subir y mergear el chat apagado y retirar jugador, reactivar el chat, puntos abiertos de retirar jugador) y 9 para Jaime (Render y variables, formularios de Play, información previa y consentimiento de compra, aceptación de condiciones, compras de menores, copias de seguridad, desistimiento, plantillas privadas, mantenimiento de Dependabot).
- Tablero: 117 tarjetas. Por pensar 31, Esta quincena 40, En curso 0, Bloqueado 3, Por probar 4, Hecho 39. Abiertas: Lander 33, Jaime 25, Pablo 9, 17 sin dueño.
- Ninguna abierta con fecha vencida; 2 vencen hoy (6-oct). Jaime se entera por el recordatorio del cron de mañana, no por el email de asignación: avisarle.
- Aviso de calendario: 14 días de prueba cerrada empezando el 10-oct acaban el 24-oct, no el 19 (anotado en «Despliegue en Apple Store y Google Play»).

ESTADO PARA JARVIS: tablero actualizado el 2026-10-06, 1 cerrada, 10 modificadas, 12 creadas
