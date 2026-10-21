/**
 * Qué pasa con `done` al soltar una tarea en una columna (undefined = no se toca).
 *
 * Entrar en una columna «de hecho» la completa, salvo que le queden subtareas
 * pendientes (misma regla que el check de la tarjeta). Salir de una columna de
 * hecho a otra que no lo es la reabre: si no, la tarjeta seguiría contando como
 * cerrada (y con fecha de cierre) aunque esté otra vez en el sprint.
 */
export function doneAfterMove({
  fromDoneColumn,
  toDoneColumn,
  hasPendingSubtasks,
}: {
  fromDoneColumn: boolean;
  toDoneColumn: boolean;
  hasPendingSubtasks: boolean;
}): boolean | undefined {
  if (toDoneColumn) return hasPendingSubtasks ? undefined : true;
  if (fromDoneColumn) return false;
  return undefined;
}
