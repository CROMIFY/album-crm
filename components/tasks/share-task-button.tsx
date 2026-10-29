"use client";

import { useSyncExternalStore } from "react";
import { Link2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { taskShareText, taskUrl, whatsappUrl } from "@/lib/share/links";

const noSubscribe = () => () => {};

/** Compartir una tarea por enlace: menú del sistema (móvil), copiar o WhatsApp. */
export function ShareTaskButton({ taskId, title }: { taskId: string; title: string }) {
  // El menú de compartir del sistema solo existe en algunos navegadores (sobre todo móviles).
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );

  const url = () => taskUrl(window.location.origin, taskId);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar", { description: url() });
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text: title, url: url() });
    } catch (err) {
      // Cancelar el menú del sistema no es un error.
      if (err instanceof Error && err.name === "AbortError") return;
      await copy();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Compartir tarea">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto whitespace-nowrap">
        {canShare && (
          <DropdownMenuItem onSelect={share}>
            <Share2 />
            Compartir…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={copy}>
          <Link2 />
          Copiar enlace
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={whatsappUrl(taskShareText(title, url()))} target="_blank" rel="noopener noreferrer">
            <MessageCircle />
            Enviar por WhatsApp
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
