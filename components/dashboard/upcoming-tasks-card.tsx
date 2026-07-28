"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/types";

const PRIORITY_DOT: Record<TaskPriority, string> = {
  baja: "bg-muted-foreground",
  media: "bg-[var(--chart-2)]",
  alta: "bg-destructive",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = { baja: "Baja", media: "Media", alta: "Alta" };

function formatDueDate(dueDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dueDate === today) return "Hoy";
  if (dueDate === tomorrow) return "Mañana";
  return new Date(dueDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function UpcomingTasksCard({
  tasks,
}: {
  tasks: {
    id: string;
    title: string;
    due_date: string;
    priority: TaskPriority;
    assignees: { nombre: string }[];
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tareas próximas a vencer</CardTitle>
        <CardDescription>Ordenadas por fecha límite del tablero del equipo</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay tareas con fecha límite pendientes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead className="text-right">Fecha límite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const [first, ...rest] = task.assignees;
                const initials = first?.nombre
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      {first ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {first.nombre}
                            {rest.length > 0 && ` +${rest.length}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority])} />
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatDueDate(task.due_date)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
