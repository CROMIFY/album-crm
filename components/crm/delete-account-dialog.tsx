"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteAccount } from "@/lib/actions/deals";
import type { AccountRow } from "@/lib/types";

export function DeleteAccountDialog({ account }: { account: AccountRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const esPatrocinador = account.tipo === "patrocinador";
  const etiqueta = esPatrocinador ? "patrocinador" : "club";

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteAccount(account.id, account.tipo);
      toast.success(`${esPatrocinador ? "Patrocinador eliminado" : "Club eliminado"}`);
      setOpen(false);
      router.replace(esPatrocinador ? "/crm/patrocinios" : "/crm/clubes");
    } catch (err) {
      toast.error(`No se pudo eliminar el ${etiqueta}`, {
        description: err instanceof Error ? err.message : undefined,
      });
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive h-7 w-7"
        aria-label={`Eliminar ${etiqueta}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar &quot;{account.nombre}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán también sus contactos, su negocio, su historial y su cadencia. Las
              reuniones y tareas enlazadas se conservan, pero sin vínculo. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Eliminando…" : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
