# PROGRESO

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
