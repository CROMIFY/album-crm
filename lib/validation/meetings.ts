import * as z from "zod";

export const meetingSchema = z
  .object({
    title: z.string().min(1, { message: "Introduce un título." }),
    description: z.string().optional(),
    starts_at: z.string().min(1, { message: "Introduce la fecha y hora de inicio." }),
    ends_at: z.string().min(1, { message: "Introduce la fecha y hora de fin." }),
    location: z.string().optional(),
    linked_account_id: z.string().uuid().optional(),
    linked_contact_id: z.string().uuid().optional(),
    linked_deal_id: z.string().uuid().optional(),
  })
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: "La fecha de fin debe ser posterior a la de inicio.",
    path: ["ends_at"],
  });

export type MeetingInput = z.infer<typeof meetingSchema>;

export const cancelMeetingSchema = z.object({
  reason: z.string().min(1, { message: "Indica el motivo de la cancelación." }),
});

export type CancelMeetingInput = z.infer<typeof cancelMeetingSchema>;

export const meetingNoteSchema = z.object({
  content: z.string().min(1, { message: "La nota no puede estar vacía." }),
});

export type MeetingNoteInput = z.infer<typeof meetingNoteSchema>;

export const actionItemSchema = z.object({
  title: z.string().min(1, { message: "Introduce un título." }),
  assignee_id: z.string().uuid().optional(),
  due_date: z.string().optional(),
});

export type ActionItemInput = z.infer<typeof actionItemSchema>;
