"use client";

import { useState } from "react";
import { LogOut, Pencil, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { signOut } from "@/lib/actions/auth";
import { updateOwnProfileName } from "@/lib/actions/profile";

export function UserMenu({
  nombre,
  email,
  googleCalendarConnected,
}: {
  nombre: string;
  email: string;
  googleCalendarConnected: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const initials = nombre
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials || "?"}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium">{nombre}</span>
            <span className="text-muted-foreground text-xs font-normal">{email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Editar nombre
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/api/auth/google/start">
              <CalendarClock />
              {googleCalendarConnected ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOut}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                <LogOut />
                Cerrar sesión
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditNameDialog open={editOpen} onOpenChange={setEditOpen} currentName={nombre} />
    </>
  );
}

function EditNameDialog({
  open,
  onOpenChange,
  currentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
}) {
  const [nombre, setNombre] = useState(currentName);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      await updateOwnProfileName(nombre);
      toast.success("Nombre actualizado");
      onOpenChange(false);
    } catch (err) {
      toast.error("No se pudo actualizar el nombre", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar nombre</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Nombre</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
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
