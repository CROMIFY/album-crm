"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createDeal } from "@/lib/actions/deals";
import type { AccountType } from "@/lib/types";

const schema = z.object({
  accountName: z.string().min(1, "Obligatorio"),
  accountPhone: z.string().optional(),
  accountEmail: z.string().email("Email no válido").optional().or(z.literal("")),
  accountWeb: z.string().optional(),
  contactName: z.string().min(1, "Obligatorio"),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Email no válido").optional().or(z.literal("")),
  amount: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function NewDealDialog({ tipo }: { tipo: AccountType }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const entidad = tipo === "club" ? "club" : "patrocinador";

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await createDeal({
        tipo,
        accountName: values.accountName,
        accountPhone: values.accountPhone,
        accountEmail: values.accountEmail,
        accountWeb: values.accountWeb,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail,
        amount: values.amount ? Number(values.amount) : undefined,
      });
      toast.success("Negocio creado");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error("No se pudo crear el negocio", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Nuevo {entidad}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo {entidad}</DialogTitle>
          <DialogDescription>
            Se crea la cuenta, el contacto y el negocio en la etapa &quot;Búsqueda&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre del {entidad}</Label>
            <Input {...register("accountName")} />
            {errors.accountName && (
              <p className="text-destructive text-sm">{errors.accountName.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Teléfono</Label>
              <Input {...register("accountPhone")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Email</Label>
              <Input {...register("accountEmail")} />
              {errors.accountEmail && (
                <p className="text-destructive text-sm">{errors.accountEmail.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Web</Label>
            <Input {...register("accountWeb")} />
          </div>

          <div className="flex flex-col gap-2 border-t pt-3">
            <Label>Nombre del contacto</Label>
            <Input {...register("contactName")} />
            {errors.contactName && (
              <p className="text-destructive text-sm">{errors.contactName.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Teléfono contacto</Label>
              <Input {...register("contactPhone")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Email contacto</Label>
              <Input {...register("contactEmail")} />
              {errors.contactEmail && (
                <p className="text-destructive text-sm">{errors.contactEmail.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-3">
            <Label>Importe estimado (€, opcional)</Label>
            <Input type="number" step="0.01" {...register("amount")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando…" : "Crear negocio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
