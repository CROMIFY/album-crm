"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createColumn } from "@/lib/actions/tasks";

export function NewColumnButton() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setEditing(false);
      return;
    }
    setLoading(true);
    try {
      await createColumn(name);
      setName("");
      setEditing(false);
    } catch (err) {
      toast.error("No se pudo crear la columna", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="flex w-72 shrink-0 flex-col gap-2">
        <Input
          autoFocus
          value={name}
          placeholder="Nombre de la columna"
          onChange={(e) => setName(e.target.value)}
          onBlur={handleCreate}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          disabled={loading}
        />
      </div>
    );
  }

  return (
    <Button variant="ghost" className="w-72 shrink-0 justify-start" onClick={() => setEditing(true)}>
      <Plus />
      Añadir columna
    </Button>
  );
}
