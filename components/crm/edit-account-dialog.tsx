"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { updateAccount } from "@/lib/actions/deals";
import {
  PROVINCIAS_ESPANA,
  SPONSOR_LEVELS,
  SPONSOR_LEVEL_LABELS,
  SPONSOR_SCOPE_LABELS,
  type AccountRow,
  type SponsorLevel,
  type SponsorScope,
} from "@/lib/types";

export function EditAccountDialog({ account, dealId }: { account: AccountRow; dealId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState(account.nombre);
  const [telefono, setTelefono] = useState(account.telefono ?? "");
  const [email, setEmail] = useState(account.email ?? "");
  const [web, setWeb] = useState(account.web ?? "");
  const [provincia, setProvincia] = useState(account.provincia ?? "");
  const [alcance, setAlcance] = useState<SponsorScope>(account.alcance ?? "local");
  const [nivel, setNivel] = useState<SponsorLevel>(account.nivel ?? "nivel_1");
  const esPatrocinador = account.tipo === "patrocinador";

  async function handleSave() {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      await updateAccount(account.id, dealId, account.tipo, {
        nombre,
        telefono,
        email,
        web,
        provincia,
        alcance: esPatrocinador ? alcance : undefined,
        nivel: esPatrocinador ? nivel : undefined,
      });
      toast.success("Cuenta actualizada");
      setOpen(false);
    } catch (err) {
      toast.error("No se pudo actualizar la cuenta", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {esPatrocinador ? "patrocinador" : "club"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Web</Label>
            <Input value={web} onChange={(e) => setWeb(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Provincia</Label>
            <Select value={provincia || undefined} onValueChange={setProvincia}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCIAS_ESPANA.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {esPatrocinador && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Alcance</Label>
                <Select value={alcance} onValueChange={(v) => setAlcance(v as SponsorScope)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SPONSOR_SCOPE_LABELS) as SponsorScope[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SPONSOR_SCOPE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Nivel</Label>
                <Select value={nivel} onValueChange={(v) => setNivel(v as SponsorLevel)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPONSOR_LEVELS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {SPONSOR_LEVEL_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
