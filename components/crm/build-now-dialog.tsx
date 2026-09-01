"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { triggerDeploy } from "@/lib/actions/deploys";
import type { JobKey } from "@/lib/deploys/types";

export function BuildNowDialog({ jobKey, jobLabel }: { jobKey: JobKey; jobLabel: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const { deployId } = await triggerDeploy(jobKey);
        toast.success(`Despliegue de ${jobLabel} lanzado`);
        setOpen(false);
        router.push(`/crm/deploys/${jobKey}/${deployId}`);
      } catch (err) {
        toast.error("No se pudo lanzar el despliegue", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm">
          <Rocket className="h-4 w-4" />
          Build Now
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desplegar {jobLabel} a producción?</AlertDialogTitle>
          <AlertDialogDescription>
            Se va a lanzar un despliegue real de {jobLabel}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Desplegando…" : "Desplegar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
