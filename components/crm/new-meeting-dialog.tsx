"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { meetingSchema, type MeetingInput } from "@/lib/validation/meetings";
import { createMeeting } from "@/lib/actions/meetings";
import type { AccountRow, ContactRow, DealRow, ProfileRow } from "@/lib/types";

export function NewMeetingDialog({
  accounts,
  contacts,
  deals,
  profiles,
  defaultAccountId,
  defaultContactId,
  defaultDealId,
}: {
  accounts: AccountRow[];
  contacts: ContactRow[];
  deals: DealRow[];
  profiles: ProfileRow[];
  defaultAccountId?: string;
  defaultContactId?: string;
  defaultDealId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState(defaultAccountId ?? "none");
  const [contactId, setContactId] = useState(defaultContactId ?? "none");
  const [dealId, setDealId] = useState(defaultDealId ?? "none");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeetingInput>({ resolver: zodResolver(meetingSchema) });

  const filteredContacts =
    accountId === "none" ? contacts : contacts.filter((c) => c.account_id === accountId);
  const filteredDeals =
    accountId === "none" ? deals : deals.filter((d) => d.account_id === accountId);

  function toggleAttendee(id: string) {
    setAttendeeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function onSubmit(values: MeetingInput) {
    setLoading(true);
    try {
      await createMeeting({
        title: values.title,
        description: values.description,
        startsAt: new Date(values.starts_at).toISOString(),
        endsAt: new Date(values.ends_at).toISOString(),
        location: values.location,
        linkedAccountId: accountId === "none" ? undefined : accountId,
        linkedContactId: contactId === "none" ? undefined : contactId,
        linkedDealId: dealId === "none" ? undefined : dealId,
        attendeeProfileIds: attendeeIds,
      });
      toast.success("Reunión creada");
      reset();
      setAccountId(defaultAccountId ?? "none");
      setContactId(defaultContactId ?? "none");
      setDealId(defaultDealId ?? "none");
      setAttendeeIds([]);
      setOpen(false);
    } catch (err) {
      toast.error("No se pudo crear la reunión", {
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
          Nueva reunión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva reunión</DialogTitle>
          <DialogDescription>
            Puede ser interna (daily, weekly, seguimiento) o con un club/patrocinador.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2">
            <Label>Título</Label>
            <Input {...register("title")} placeholder="Weekly Cromify" />
            {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Agenda (opcional)</Label>
            <Textarea {...register("description")} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Inicio</Label>
              <Input type="datetime-local" {...register("starts_at")} />
              {errors.starts_at && (
                <p className="text-destructive text-sm">{errors.starts_at.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fin</Label>
              <Input type="datetime-local" {...register("ends_at")} />
              {errors.ends_at && (
                <p className="text-destructive text-sm">{errors.ends_at.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Ubicación / enlace (opcional)</Label>
            <Input {...register("location")} placeholder="Oficina, o virtual" />
          </div>

          <div className="flex flex-col gap-2 border-t pt-3">
            <Label>Cuenta (opcional, dejar en blanco si es interna)</Label>
            <Select
              value={accountId}
              onValueChange={(v) => {
                setAccountId(v);
                setContactId("none");
                setDealId("none");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna (reunión interna)</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {accountId !== "none" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Contacto</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {filteredContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Negocio</Label>
                <Select value={dealId} onValueChange={setDealId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {filteredDeals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        Negocio del {new Date(d.created_at).toLocaleDateString("es-ES")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-3">
            <Label>Asistentes internos</Label>
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => {
                const active = attendeeIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleAttendee(p.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando…" : "Crear reunión"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
