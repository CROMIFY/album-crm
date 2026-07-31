"use client";

import { useState } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateDealStage,
  updateDealOutcome,
  addCadenceStep,
  toggleCadenceStep,
  deleteCadenceStep,
} from "@/lib/actions/deals";
import { EditAccountDialog } from "@/components/crm/edit-account-dialog";
import { NewMeetingDialog } from "@/components/crm/new-meeting-dialog";
import Link from "next/link";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_DESCRIPTIONS,
  SPONSOR_SCOPE_LABELS,
  SPONSOR_LEVEL_LABELS,
  ACCOUNT_TYPE_LABELS,
  MEETING_STATUS_LABELS,
} from "@/lib/types";
import type {
  AccountType,
  CadenceStepRow,
  DealStageHistoryRow,
  DealWithRelations,
  MeetingListItem,
  ProfileRow,
} from "@/lib/types";

export function DealDetail({
  deal,
  history,
  cadence,
  meetings,
  profiles,
}: {
  deal: DealWithRelations;
  history: DealStageHistoryRow[];
  cadence: CadenceStepRow[];
  meetings: MeetingListItem[];
  profiles: ProfileRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const tipo: AccountType = deal.account.tipo;
  // "aplazado" no cuenta como cerrado: a diferencia de ganado/perdido, está
  // pensado para retomarse más adelante, así que el selector de etapa y el
  // diálogo de cierre deben seguir disponibles.
  const isClosed = deal.stage === "ganado" || deal.stage === "perdido";

  function handleStageChange(stage: string) {
    startTransition(async () => {
      try {
        await updateDealStage(deal.id, tipo, stage as (typeof DEAL_STAGES)[number]);
      } catch (err) {
        toast.error("No se pudo cambiar la etapa", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Button
        variant="ghost"
        size="sm"
        className="-mb-2 self-start"
        onClick={() => router.back()}
      >
        <ArrowLeft />
        Volver
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{deal.account.nombre}</h1>
          <p className="text-muted-foreground text-sm capitalize">{ACCOUNT_TYPE_LABELS[tipo]}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={deal.stage} onValueChange={handleStageChange} disabled={isClosed}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {DEAL_STAGE_LABELS[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isClosed && <OutcomeDialog dealId={deal.id} tipo={tipo} />}
        </div>
      </div>
      <p className="text-muted-foreground -mt-2 text-sm">{DEAL_STAGE_DESCRIPTIONS[deal.stage]}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Cuenta</CardTitle>
            <EditAccountDialog account={deal.account} dealId={deal.id} />
          </CardHeader>
          <CardContent className="text-sm">
            {tipo === "patrocinador" && (deal.account.alcance || deal.account.nivel) && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {deal.account.alcance && (
                  <Badge variant="secondary">{SPONSOR_SCOPE_LABELS[deal.account.alcance]}</Badge>
                )}
                {deal.account.nivel && (
                  <Badge variant="outline">{SPONSOR_LEVEL_LABELS[deal.account.nivel]}</Badge>
                )}
              </div>
            )}
            <dl className="flex flex-col gap-1">
              <Row label="Provincia" value={deal.account.provincia} />
              <Row label="Teléfono" value={deal.account.telefono} />
              <Row label="Email" value={deal.account.email} />
              <Row label="Web" value={deal.account.web} />
              <Row label="Responsable" value={deal.account.owner_name} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {deal.contact ? (
              <dl className="flex flex-col gap-1">
                <Row label="Nombre" value={deal.contact.nombre} />
                <Row label="Teléfono" value={deal.contact.telefono} />
                <Row label="Email" value={deal.contact.email} />
              </dl>
            ) : (
              <p className="text-muted-foreground">Sin contacto</p>
            )}
          </CardContent>
        </Card>
      </div>

      {(deal.stage === "perdido" || deal.stage === "aplazado") && deal.lost_reason && (
        <Card className={deal.stage === "perdido" ? "border-destructive/40" : undefined}>
          <CardHeader>
            <CardTitle
              className={
                deal.stage === "perdido"
                  ? "text-destructive text-sm font-medium"
                  : "text-sm font-medium"
              }
            >
              {deal.stage === "perdido" ? "Motivo de pérdida" : "Nota de aplazamiento"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{deal.lost_reason}</CardContent>
        </Card>
      )}

      <CadenceCard dealId={deal.id} steps={cadence} />

      <MeetingsCard deal={deal} meetings={meetings} profiles={profiles} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historial de etapas</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin cambios registrados.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-36 shrink-0 text-xs tabular-nums">
                    {new Date(h.changed_at).toLocaleString("es-ES")}
                  </span>
                  {h.from_stage && (
                    <>
                      <Badge variant="secondary">{DEAL_STAGE_LABELS[h.from_stage]}</Badge>
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <Badge>{DEAL_STAGE_LABELS[h.to_stage]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function OutcomeDialog({ dealId, tipo }: { dealId: string; tipo: AccountType }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const entidad = ACCOUNT_TYPE_LABELS[tipo];

  async function markWon() {
    setLoading(true);
    try {
      await updateDealOutcome(dealId, tipo, "ganado");
      toast.success(`${entidad[0].toUpperCase()}${entidad.slice(1)} marcado como ganado`);
      setOpen(false);
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  async function markLost() {
    setLoading(true);
    try {
      await updateDealOutcome(dealId, tipo, "perdido", reason);
      toast.success(`${entidad[0].toUpperCase()}${entidad.slice(1)} marcado como perdido`);
      setOpen(false);
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  async function markPostponed() {
    setLoading(true);
    try {
      await updateDealOutcome(dealId, tipo, "aplazado", reason);
      toast.success(`${entidad[0].toUpperCase()}${entidad.slice(1)} marcado como aplazado`);
      setOpen(false);
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Cerrar {entidad}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cerrar {entidad}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button onClick={markWon} disabled={loading} variant="default">
            Marcar como ganado
          </Button>
          <Separator />
          <div className="flex flex-col gap-2">
            <Label>Motivo (si se pierde o se aplaza)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <Button onClick={markPostponed} disabled={loading} variant="secondary">
            Aplazar (otro año)
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={markLost} disabled={loading} variant="destructive">
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CadenceCard({ dealId, steps }: { dealId: string; steps: CadenceStepRow[] }) {
  const [label, setLabel] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!label.trim() || !action.trim()) return;
    setLoading(true);
    try {
      await addCadenceStep(dealId, label, action);
      setLabel("");
      setAction("");
    } catch (err) {
      toast.error("No se pudo añadir el paso", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cadencia de seguimiento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {steps.length === 0 && (
          <p className="text-muted-foreground text-sm">Sin pasos todavía.</p>
        )}
        <ul className="flex flex-col gap-2">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={step.done}
                onCheckedChange={(checked) =>
                  toggleCadenceStep(step.id, dealId, checked === true)
                }
              />
              <span className="font-medium">{step.label}</span>
              <span className="text-muted-foreground">{step.action}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-7 w-7"
                onClick={() => deleteCadenceStep(step.id, dealId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex items-end gap-2 border-t pt-3">
          <div className="flex flex-1 flex-col gap-1">
            <Label className="text-xs">Etiqueta</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Día 3"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label className="text-xs">Acción</Label>
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Llamada"
            />
          </div>
          <Button onClick={handleAdd} disabled={loading} size="sm">
            Añadir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MeetingsCard({
  deal,
  meetings,
  profiles,
}: {
  deal: DealWithRelations;
  meetings: MeetingListItem[];
  profiles: ProfileRow[];
}) {
  const upcoming = meetings.filter((m) => new Date(m.starts_at) >= new Date());
  const past = meetings.filter((m) => new Date(m.starts_at) < new Date());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Reuniones</CardTitle>
        <NewMeetingDialog
          accounts={[deal.account]}
          contacts={deal.contact ? [deal.contact] : []}
          deals={[deal]}
          profiles={profiles}
          defaultAccountId={deal.account.id}
          defaultContactId={deal.contact?.id}
          defaultDealId={deal.id}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {meetings.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin reuniones todavía.</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-muted-foreground text-xs font-medium">Próximas</p>
                {upcoming.map((m) => (
                  <MeetingRow key={m.id} meeting={m} />
                ))}
              </div>
            )}
            {past.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t pt-3">
                <p className="text-muted-foreground text-xs font-medium">Histórico</p>
                {past.map((m) => (
                  <MeetingRow key={m.id} meeting={m} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MeetingRow({ meeting }: { meeting: MeetingListItem }) {
  return (
    <Link
      href={`/crm/reuniones/${meeting.id}`}
      className="hover:bg-muted flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
    >
      <div>
        <p className="font-medium">{meeting.title}</p>
        <p className="text-muted-foreground text-xs">
          {new Date(meeting.starts_at).toLocaleString("es-ES")}
        </p>
      </div>
      <Badge variant="secondary">{MEETING_STATUS_LABELS[meeting.status]}</Badge>
    </Link>
  );
}
