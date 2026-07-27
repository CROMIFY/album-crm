import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Introduce un email válido." }),
  password: z.string().min(1, { message: "Introduce tu contraseña." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
