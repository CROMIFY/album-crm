import * as z from "zod";

export const expenseSchema = z
  .object({
    name: z.string().min(1, { message: "Introduce un nombre." }),
    category_id: z.string().uuid().optional(),
    vendor: z.string().optional(),
    amount: z
      .string()
      .min(1, { message: "Introduce un importe." })
      .refine((v) => Number(v) > 0, { message: "Introduce un importe mayor que 0." }),
    billing_cycle: z.enum(["unico", "mensual", "anual"]),
    starts_at: z.string().min(1, { message: "Introduce una fecha." }),
    next_billing_date: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.billing_cycle === "unico" || !!data.next_billing_date, {
    message: "Introduce la fecha de la próxima renovación.",
    path: ["next_billing_date"],
  });

export type ExpenseInput = z.infer<typeof expenseSchema>;
