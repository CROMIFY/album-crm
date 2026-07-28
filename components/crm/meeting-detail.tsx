"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingNotesPanel } from "@/components/crm/meeting-notes-panel";
import { MeetingActionItems } from "@/components/crm/meeting-action-items";
import { markMeetingCompleted, markMeetingNoShow, cancelMeeting } from "@/lib/actions/meetings";
import { MEETING_STATUS_LABELS } from "@/lib/types";
import type { MeetingWithRelations, ProfileRow } from "@/lib/types";

const STATUS_VARIANT: Record<MeetingWithRelations["status"], "default" | "secondary" | "destructive" | "outline"> = {
  programada: "default",
  completada: "secondary",
  cancelada: "destructive",
  no_show: "outline",
};

export function MeetingDetail({
  meeting,
  profiles,
}: {
  meeting: MeetingWithRelations;
  profiles: ProfileRow[];
}) {
  const router = useRouter();
  const isOpenStatus = meeting.status === "programada";

  async function handleComplete() {
    try {
      await markMeetingCompleted(meeting.id);
    } catch (err) {
      toast.error("No se pudo marcar como completada", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleNoShow() {
    try {
      await markMeetingNoShow(meeting.id);
    } catch (err) {
      toast.error("No se pudo marcar como no-show", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Button variant="ghost" size="sm" className="-mb-2 self-start" onClick={() => router.back()}>
        <ArrowLeft />
        Volver
      </Button>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{meeting.title}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(meeting.starts_at).toLocaleString("es-ES")} –{" "}
            {new Date(meeting.ends_at).toLocaleTimeString("es-ES")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[meeting.status]}>{MEETING_STATUS_LABELS[meeting.status]}</Badge>
          {isOpenStatus && (
            <>
              <Button variant="outline" size="sm" onClick={handleComplete}>
                Completada
              </Button>
              <Button variant="outline" size="sm" onClick={handleNoShow}>
                No-show
              </Button>
              <CancelMeetingDialog meetingId={meeting.id} />
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="notas">Notas</TabsTrigger>
          <TabsTrigger value="acciones">Acciones</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="flex flex-col gap-4 pt-3">
          {meeting.meet_link && (
            <a
              href={meeting.meet_link}
              target="_blank"
              rel="noreferrer"
              className="text-primary flex w-fit items-center gap-2 text-sm font-medium hover:underline"
            >
              <Video className="h-4 w-4" />
              Unirse con Google Meet
            </a>
          )}
          {meeting.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Agenda</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{meeting.description}</CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cuenta / negocio</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {meeting.account ? (
                  <dl className="flex flex-col gap-1">
                    <Row label="Cuenta" value={meeting.account.nombre} />
                    <Row label="Contacto" value={meeting.contact?.nombre ?? null} />
                  </dl>
                ) : (
                  <p className="text-muted-foreground">Reunión interna</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Asistentes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {meeting.attendees.length === 0 ? (
                  <p className="text-muted-foreground">Sin asistentes registrados.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {meeting.attendees.map((a) => (
                      <li key={a.id}>
                        <Badge variant="secondary">{a.profile?.nombre ?? a.contact?.nombre}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
          {meeting.location && <Row label="Ubicación" value={meeting.location} />}
          {meeting.status === "cancelada" && meeting.cancel_reason && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive text-sm font-medium">
                  Motivo de cancelación
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{meeting.cancel_reason}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notas" className="pt-3">
          <MeetingNotesPanel meetingId={meeting.id} notes={meeting.notes} profiles={profiles} />
        </TabsContent>

        <TabsContent value="acciones" className="pt-3">
          <MeetingActionItems
            meetingId={meeting.id}
            items={meeting.actionItems}
            profiles={profiles}
          />
        </TabsContent>

        <TabsContent value="historial" className="pt-3">
          <ul className="flex flex-col gap-2 text-sm">
            <li className="text-muted-foreground">
              Creada el {new Date(meeting.created_at).toLocaleString("es-ES")}
            </li>
            {meeting.updated_at !== meeting.created_at && (
              <li className="text-muted-foreground">
                Última actualización: {new Date(meeting.updated_at).toLocaleString("es-ES")}
              </li>
            )}
            <li>
              Estado actual: <Badge variant={STATUS_VARIANT[meeting.status]}>{MEETING_STATUS_LABELS[meeting.status]}</Badge>
            </li>
            {meeting.google_calendar_event_id && (
              <li className="text-muted-foreground">Sincronizada con Google Calendar.</li>
            )}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function CancelMeetingDialog({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      await cancelMeeting(meetingId, reason);
      toast.success("Reunión cancelada");
      setOpen(false);
    } catch (err) {
      toast.error("No se pudo cancelar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Cancelar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar reunión</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Motivo</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button onClick={handleCancel} disabled={loading || !reason.trim()} variant="destructive">
            Confirmar cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
