import * as z from "zod";
import { GOAL_METRICS } from "@/lib/goals/goals";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Introduce una fecha." });

export const goalSchema = z
  .object({
    title: z.string().trim().min(1, { message: "Introduce un título." }),
    // Vacío = sin dato (no se inventa un valor).
    currentValue: z.number().min(0).nullable(),
    targetValue: z.number().positive({ message: "La meta tiene que ser mayor que 0." }),
    unit: z.string().trim().max(40).nullable(),
    startsOn: day,
    dueDate: day,
    ownerIds: z.array(z.string().uuid()),
    metric: z.enum(GOAL_METRICS).nullable(),
    notes: z.string().trim().nullable(),
  })
  .refine((g) => g.dueDate >= g.startsOn, {
    message: "La fecha límite no puede ser anterior al inicio.",
    path: ["dueDate"],
  });

export type GoalInput = z.infer<typeof goalSchema>;
